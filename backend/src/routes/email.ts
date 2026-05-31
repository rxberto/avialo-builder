import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { authenticateToken, AuthRequest } from "./auth.js";
import { prisma } from "../database/client.js";

export const emailRouter = Router();

// Límite de buzones por cuenta (configurable).
const MAX_MAILBOXES = parseInt(process.env.MAX_MAILBOXES_PER_USER || "10", 10);

// Valida la parte local de una dirección de correo (antes de la @).
function isValidLocalPart(local: string): boolean {
  return /^[a-z0-9]([a-z0-9._-]{0,62}[a-z0-9])?$/.test(local);
}

/**
 * NOTA: el aprovisionamiento real del buzón en un servidor de correo (Mailcow/Migadu/etc.)
 * se integraría aquí mediante un hook configurable. Por ahora estos endpoints gestionan los
 * registros de cuentas (alta/baja/credenciales) de forma persistente.
 */

// GET /api/email/accounts — lista las cuentas del usuario
emailRouter.get("/accounts", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) return res.status(401).json({ error: "No autorizado." });
  try {
    const accounts = await prisma.emailAccount.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, address: true, localPart: true, domain: true, createdAt: true },
    });
    return res.json({ accounts });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/email/accounts — crea una cuenta { localPart, password }
emailRouter.post("/accounts", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) return res.status(401).json({ error: "No autorizado." });

  const localPart = String(req.body?.localPart || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!isValidLocalPart(localPart)) {
    return res.status(400).json({ error: "Nombre de buzón inválido (usa letras, números, '.', '-' o '_')." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "La contraseña del buzón debe tener al menos 8 caracteres." });
  }

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!dbUser) return res.status(404).json({ error: "Usuario no encontrado." });

    if (!dbUser.plan || dbUser.plan === "none") {
      return res.status(402).json({ error: "Necesitas un plan activo para crear correos corporativos.", code: "SUBSCRIPTION_REQUIRED" });
    }

    const domain = (dbUser.siteDomain || "").trim().toLowerCase().replace(/^https?:\/\//, "");
    if (!domain) {
      return res.status(400).json({ error: "Primero debes configurar un dominio para tu sitio." });
    }

    const count = await prisma.emailAccount.count({ where: { userId: req.user.id } });
    if (count >= MAX_MAILBOXES) {
      return res.status(409).json({ error: `Has alcanzado el máximo de ${MAX_MAILBOXES} buzones para tu cuenta.` });
    }

    const address = `${localPart}@${domain}`;
    const existing = await prisma.emailAccount.findUnique({ where: { address } });
    if (existing) {
      return res.status(409).json({ error: `La dirección ${address} ya existe.` });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const account = await prisma.emailAccount.create({
      data: { userId: req.user.id, address, localPart, domain, passwordHash },
      select: { id: true, address: true, localPart: true, domain: true, createdAt: true },
    });

    return res.status(201).json({ success: true, account });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// DELETE /api/email/accounts/:id — elimina una cuenta del usuario
emailRouter.delete("/accounts/:id", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) return res.status(401).json({ error: "No autorizado." });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });

  try {
    // Borrado con guarda de propiedad (solo elimina si pertenece al usuario).
    const result = await prisma.emailAccount.deleteMany({ where: { id, userId: req.user.id } });
    if (result.count === 0) {
      return res.status(404).json({ error: "Cuenta de correo no encontrada." });
    }
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/email/accounts/:id/reset-password — cambia la contraseña del buzón
emailRouter.post("/accounts/:id/reset-password", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) return res.status(401).json({ error: "No autorizado." });
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });

  const password = String(req.body?.password || "");
  if (password.length < 8) {
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres." });
  }

  try {
    const account = await prisma.emailAccount.findFirst({ where: { id, userId: req.user.id } });
    if (!account) return res.status(404).json({ error: "Cuenta de correo no encontrada." });

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.emailAccount.update({ where: { id }, data: { passwordHash } });

    return res.json({ success: true, message: "Contraseña del buzón actualizada." });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});
