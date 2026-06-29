import { Router, Response } from "express";
import { randomBytes } from "crypto";
import { authenticateToken, AuthRequest } from "./auth.js";
import { prisma } from "../database/client.js";
import { generationQueue } from "../queue/queue.js";
import {
  listTenantUsers,
  countTenantAdmins,
  getTenantUserById,
  createTenantUser,
  updateTenantUser,
  deleteTenantUser,
  TenantUserError,
  type TenantRole,
} from "../database/tenant.js";

// Gestión de los usuarios admin de la TIENDA del cliente desde el IDE de Avialo. El cliente,
// ya autenticado en Avialo, administra la tabla "User" de SU esquema tenant sin necesitar la
// contraseña del panel /admin de su web (rompe el círculo de "necesito la clave que no tengo").
export const storeUsersRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRole(v: unknown): v is TenantRole {
  return v === "admin" || v === "client";
}

// Contraseña temporal legible (sin caracteres ambiguos) + sufijo que cumple políticas comunes.
function tempPassword(): string {
  return randomBytes(6).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) + "9!";
}

// Resuelve el tenant (clientId) del usuario autenticado a partir de su web generada. Verifica
// además la propiedad del job (anti-IDOR): el job debe pertenecer a este usuario.
async function resolveClientId(userId: number): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { siteJobId: true },
  });
  if (!user?.siteJobId) return null;
  const job = await generationQueue.getJob(user.siteJobId);
  if (!job || Number(job.data.userId) !== Number(userId)) return null;
  return job.data.clientId || null;
}

// Resuelve y valida el tenant; responde el error apropiado y devuelve null si no procede.
async function withTenant(req: AuthRequest, res: Response): Promise<string | null> {
  if (!req.user) {
    res.status(401).json({ error: "No autenticado." });
    return null;
  }
  const clientId = await resolveClientId(req.user.id);
  if (!clientId) {
    res.status(409).json({
      error: "Tu web todavía no está lista. Genera tu sitio antes de gestionar administradores.",
    });
    return null;
  }
  return clientId;
}

function handleError(res: Response, err: unknown): Response {
  if (err instanceof TenantUserError) {
    return res.status(err.status).json({ error: err.message });
  }
  const message = err instanceof Error ? err.message : "Error inesperado.";
  return res.status(500).json({ error: message });
}

// GET /api/store-users — lista de usuarios del panel + nº de admins.
storeUsersRouter.get(
  "/",
  authenticateToken as any,
  async (req: AuthRequest, res: Response): Promise<any> => {
    const clientId = await withTenant(req, res);
    if (!clientId) return;
    try {
      const [users, adminCount] = await Promise.all([
        listTenantUsers(clientId),
        countTenantAdmins(clientId),
      ]);
      res.json({ users, adminCount });
    } catch (err) {
      handleError(res, err);
    }
  }
);

// POST /api/store-users — crea un usuario. Si no se envía contraseña, se genera una y se
// devuelve UNA sola vez (caso típico: el cliente no sabe la clave y quiere una nueva cuenta).
storeUsersRouter.post(
  "/",
  authenticateToken as any,
  async (req: AuthRequest, res: Response): Promise<any> => {
    const clientId = await withTenant(req, res);
    if (!clientId) return;
    try {
      const body = req.body || {};
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const name = typeof body.name === "string" ? body.name : null;
      const role = body.role === undefined ? "admin" : body.role;
      let password = typeof body.password === "string" ? body.password : "";
      let generated = false;

      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: "Introduce un correo válido." });
      }
      if (!isRole(role)) {
        return res.status(400).json({ error: "Rol no válido." });
      }
      if (!password) {
        password = tempPassword();
        generated = true;
      } else if (password.length < 8) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres." });
      }

      const user = await createTenantUser(clientId, { name, email, password, role });
      res.status(201).json({ user, password, generated });
    } catch (err) {
      handleError(res, err);
    }
  }
);

// POST /api/store-users/:id/reset-password — fija (o genera) una nueva contraseña y la
// devuelve UNA sola vez. Es la vía de recuperación cuando el cliente perdió la clave.
storeUsersRouter.post(
  "/:id/reset-password",
  authenticateToken as any,
  async (req: AuthRequest, res: Response): Promise<any> => {
    const clientId = await withTenant(req, res);
    if (!clientId) return;
    try {
      const target = await getTenantUserById(clientId, req.params.id);
      if (!target) return res.status(404).json({ error: "Usuario no encontrado." });

      let password = typeof req.body?.password === "string" ? req.body.password : "";
      let generated = false;
      if (!password) {
        password = tempPassword();
        generated = true;
      } else if (password.length < 8) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres." });
      }

      await updateTenantUser(clientId, req.params.id, { password });
      res.json({ password, generated, email: target.email });
    } catch (err) {
      handleError(res, err);
    }
  }
);

// PATCH /api/store-users/:id — cambia nombre o rol. No permite degradar al último admin.
storeUsersRouter.patch(
  "/:id",
  authenticateToken as any,
  async (req: AuthRequest, res: Response): Promise<any> => {
    const clientId = await withTenant(req, res);
    if (!clientId) return;
    try {
      const target = await getTenantUserById(clientId, req.params.id);
      if (!target) return res.status(404).json({ error: "Usuario no encontrado." });

      const body = req.body || {};
      const input: { name?: string | null; role?: TenantRole } = {};

      if (body.name !== undefined) {
        input.name = typeof body.name === "string" ? body.name : null;
      }
      if (body.role !== undefined) {
        if (!isRole(body.role)) return res.status(400).json({ error: "Rol no válido." });
        if (target.role === "admin" && body.role !== "admin") {
          const admins = await countTenantAdmins(clientId);
          if (admins <= 1) {
            return res
              .status(409)
              .json({ error: "No puedes quitar el rol de administrador al único admin que queda." });
          }
        }
        input.role = body.role;
      }

      const user = await updateTenantUser(clientId, req.params.id, input);
      res.json({ user });
    } catch (err) {
      handleError(res, err);
    }
  }
);

// DELETE /api/store-users/:id — elimina un usuario. No permite eliminar al último admin.
storeUsersRouter.delete(
  "/:id",
  authenticateToken as any,
  async (req: AuthRequest, res: Response): Promise<any> => {
    const clientId = await withTenant(req, res);
    if (!clientId) return;
    try {
      const target = await getTenantUserById(clientId, req.params.id);
      if (!target) return res.status(404).json({ error: "Usuario no encontrado." });

      if (target.role === "admin") {
        const admins = await countTenantAdmins(clientId);
        if (admins <= 1) {
          return res
            .status(409)
            .json({ error: "No puedes eliminar al único administrador de la tienda." });
        }
      }

      await deleteTenantUser(clientId, req.params.id);
      res.json({ ok: true });
    } catch (err) {
      handleError(res, err);
    }
  }
);
