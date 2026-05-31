import { Router, Response } from "express";
import dns from "dns";
import { promisify } from "util";
import { authenticateToken, AuthRequest } from "./auth.js";
import { prisma } from "../database/client.js";
import { openproviderConfig, isOpenproviderConfigured } from "../config/openprovider.js";
import { checkAvailability, provisionDomain } from "../services/openprovider.js";

const resolve4 = promisify(dns.resolve4);

export const domainsRouter = Router();

// Normaliza un nombre base a slug DNS válido.
function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

// Middleware: requiere Openprovider configurado.
function requireOpenprovider(_req: AuthRequest, res: Response, next: any) {
  if (!isOpenproviderConfigured()) {
    return res.status(503).json({ error: "El registro de dominios no está disponible en este momento." });
  }
  next();
}

/**
 * POST /api/domains/check
 * Comprueba disponibilidad de {base}.es (primario) y {base}.com (fallback).
 */
domainsRouter.post("/check", authenticateToken as any, requireOpenprovider, async (req: AuthRequest, res: Response): Promise<any> => {
  const base = toSlug(req.body?.baseName || "");
  if (!base) return res.status(400).json({ error: "Nombre base de dominio inválido." });

  try {
    const candidates = [`${base}.es`, `${base}.com`];
    const results = await checkAvailability(candidates);
    // Recomendar .es si está libre; si no, .com.
    const esFree = results.find((r) => r.domain === `${base}.es`)?.available;
    const recommended = esFree ? `${base}.es` : (results.find((r) => r.domain === `${base}.com`)?.available ? `${base}.com` : null);
    return res.json({ results, recommended });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || "Error al comprobar disponibilidad." });
  }
});

/**
 * POST /api/domains/purchase
 * Registra el dominio (.es primario, .com fallback), crea la zona DNS apuntando al
 * droplet y lo asocia a la cuenta del usuario. Requiere plan activo.
 */
domainsRouter.post("/purchase", authenticateToken as any, requireOpenprovider, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) return res.status(401).json({ error: "No autorizado." });

  const base = toSlug(req.body?.baseName || "");
  if (!base) return res.status(400).json({ error: "Nombre base de dominio inválido." });

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!dbUser) return res.status(404).json({ error: "Usuario no encontrado." });

    // Gating: registrar un dominio es una acción de pago — requiere plan activo.
    if (!dbUser.plan || dbUser.plan === "none") {
      return res.status(402).json({ error: "Necesitas un plan activo para registrar un dominio.", code: "SUBSCRIPTION_REQUIRED" });
    }

    // Elegir extensión: .es si libre, si no .com.
    const availability = await checkAvailability([`${base}.es`, `${base}.com`]);
    const esFree = availability.find((r) => r.domain === `${base}.es`)?.available;
    const comFree = availability.find((r) => r.domain === `${base}.com`)?.available;
    const chosen = esFree ? `${base}.es` : (comFree ? `${base}.com` : null);

    if (!chosen) {
      return res.status(409).json({ error: `Ni ${base}.es ni ${base}.com están disponibles. Prueba otro nombre.` });
    }

    const provisioned = await provisionDomain(chosen);

    // Asociar el dominio a la cuenta del usuario.
    await prisma.user.update({
      where: { id: req.user.id },
      data: { siteDomain: chosen },
    });

    return res.json({
      success: true,
      domain: chosen,
      openproviderId: provisioned.id,
      dnsTarget: openproviderConfig.dnsTargetIp,
      message: `Dominio ${chosen} registrado. La propagación DNS puede tardar unos minutos.`,
    });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || "Error al registrar el dominio." });
  }
});

/**
 * GET /api/domains/propagation?domain=miempresa.es
 * Comprueba si el dominio ya resuelve a la IP del droplet (polling de propagación).
 */
domainsRouter.get("/propagation", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const domain = (req.query.domain as string || "").trim().toLowerCase();
  if (!domain) return res.status(400).json({ error: "Falta el parámetro 'domain'." });

  const target = openproviderConfig.dnsTargetIp;
  try {
    const addresses = await resolve4(domain);
    const propagated = addresses.includes(target);
    return res.json({
      domain,
      propagated,
      addresses,
      target,
      message: propagated
        ? "¡El dominio ya apunta al servidor de Avialo!"
        : `Aún propagando. Actualmente resuelve a: ${addresses.join(", ") || "—"}`,
    });
  } catch (err: any) {
    // NXDOMAIN / sin registros todavía
    return res.json({
      domain,
      propagated: false,
      addresses: [],
      target,
      message: "El dominio todavía no resuelve. La propagación DNS puede tardar hasta 24-48h.",
    });
  }
});
