import { Router, Request, Response } from 'express';
import { prisma } from '../database/client.js';
import { authenticateToken, AuthRequest } from './auth.js';
import { stripe } from '../config/stripe.js';
import { cleanupUserSite } from '../services/siteCleanup.js';

export const adminRouter = Router();

// Middleware: solo usuarios con role='admin' en la BD
async function requireAdmin(req: AuthRequest, res: Response, next: any) {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: (req.user as any).id } });
    if (!dbUser || dbUser.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }
    next();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

// GET /api/admin/usage — resumen de coste/tokens de IA (global y por usuario)
adminRouter.get('/usage', authenticateToken, requireAdmin, async (_req: Request, res: Response): Promise<any> => {
  try {
    const totals = await prisma.jobUsage.aggregate({
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      _count: true,
    });
    const byUser = await prisma.jobUsage.groupBy({
      by: ['userId'],
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      orderBy: { _sum: { costUsd: 'desc' } },
      take: 50,
    });
    res.json({ totals, byUser });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/users — lista todos los usuarios
adminRouter.get('/users', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        aiCredits: true,
        profession: true,
        role: true,
        siteStatus: true,
        siteName: true,
        siteDomain: true,
        siteJobId: true,
        createdAt: true,
      },
    });
    res.json({ users });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin/users/:id — elimina usuario completo
adminRouter.delete('/users/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<any> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    // Cancelar la suscripción de Stripe antes de borrar la cuenta (no seguir cobrando la tarjeta).
    const user = await prisma.user.findUnique({ where: { id } });
    if (user?.stripeSubscriptionId && stripe) {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId).catch((err: any) =>
        console.error(`⚠️ No se pudo cancelar la suscripción Stripe ${user.stripeSubscriptionId}:`, err.message)
      );
    }

    // Limpiar recursos del sitio (contenedor, esquema multi-tenant, sandbox).
    await cleanupUserSite(user?.siteJobId);

    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: `Usuario ${id} eliminado.` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin/users/:id/site — borra la web del usuario (resetea campos site*)
adminRouter.delete('/users/:id/site', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<any> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    // Resolver el siteJobId antes de limpiar los campos, para poder limpiar recursos.
    const existing = await prisma.user.findUnique({ where: { id } });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        siteName: null,
        siteType: null,
        siteDomain: null,
        siteJobId: null,
        siteStatus: 'none',
      },
    });

    // Limpiar recursos reales (contenedor avialo-preview-<clientId>, esquema y sandbox).
    await cleanupUserSite(existing?.siteJobId);

    res.json({ success: true, message: `Web del usuario ${id} eliminada.`, user: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/admin/users/:id/credits — actualiza créditos (añadir o quitar)
adminRouter.patch('/users/:id/credits', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<any> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const { credits } = req.body;
  if (typeof credits !== 'number') return res.status(400).json({ error: 'El campo credits debe ser un número' });
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const diff = credits - user.aiCredits;
    if (diff === 0) {
      return res.json({ success: true, message: `Los créditos ya son ${credits}.`, user });
    }

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { aiCredits: credits },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: id,
          amount: diff,
          reason: "Admin Adjustment",
          metadata: JSON.stringify({ adminId: (req as any).user?.id, previousCredits: user.aiCredits, newCredits: credits })
        }
      })
    ]);

    res.json({ success: true, message: `Créditos actualizados a ${credits}.`, user: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/users — crear un nuevo usuario desde el panel admin
adminRouter.post('/users', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<any> => {
  const { name, email, password, plan, aiCredits, profession } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email y password son obligatorios' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Ya existe un usuario con ese email' });

    const bcryptLib = await import('bcryptjs');
    const passwordHash = await bcryptLib.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        plan: plan || 'none',
        aiCredits: typeof aiCredits === 'number' ? aiCredits : 50,
        profession: profession || '',
        role: 'user',
        siteName: null,
        siteType: null,
        siteDomain: null,
        siteJobId: null,
        siteStatus: 'none',
      },
    });

    res.status(201).json({ success: true, message: `Usuario ${email} creado.`, user: newUser });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
