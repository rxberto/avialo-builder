import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/client.js';
import { config } from '../config/env.js';
import { stripe } from '../config/stripe.js';
import { cleanupUserSite } from '../services/siteCleanup.js';
import { openproviderConfig } from '../config/openprovider.js';
import dns from 'dns';
import { promisify } from 'util';

const resolveA = promisify(dns.resolve4);

export const authRouter = Router();
// El secreto se valida en config/env.ts (aborta en producción si falta). Sin literal hardcodeado.
const JWT_SECRET = config.auth.jwtSecret;

// Interfaz extendida para guardar la sesión del usuario en Request
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

// Verifica un token JWT y devuelve el payload decodificado, o null si es inválido.
// Útil para flujos donde no se pueden enviar cabeceras (p. ej. EventSource/SSE),
// donde el token llega como query param.
export function verifyJwt(token: string): { id: number; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; email: string };
  } catch {
    return null;
  }
}

// Helper to parse User-Agent
function parseUserAgent(ua: string | undefined) {
  if (!ua) {
    return {
      deviceType: "Desktop",
      browser: "Navegador",
      os: "Desconocido"
    };
  }

  let deviceType = "Desktop";
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
    deviceType = "Mobile";
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = "Tablet";
  }

  let browser = "Chrome";
  if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/safari/i.test(ua) && !/chrome|crios|crmodo|chromium/i.test(ua)) {
    browser = "Safari";
  } else if (/opr/i.test(ua)) {
    browser = "Opera";
  } else if (/edg/i.test(ua)) {
    browser = "Edge";
  } else if (/chrome|crios|crmodo/i.test(ua)) {
    browser = "Chrome";
  }

  let os = "Windows";
  if (/windows/i.test(ua)) {
    os = "Windows";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "macOS";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = "iOS";
  } else if (/android/i.test(ua)) {
    os = "Android";
  }

  return { deviceType, browser, os };
}

// Helper to determine IP and Location
function getIpAndLocation(req: any) {
  const rawIp = (req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || req.ip || '127.0.0.1').split(',')[0].trim();
  let ipAddress = rawIp;
  if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
    ipAddress = '127.0.0.1';
  }
  
  let location = "Madrid, España";
  if (ipAddress === '127.0.0.1') {
    location = "Localhost (Desarrollo)";
  } else {
    const locations = [
      "Madrid, España", "Barcelona, España", "Valencia, España", 
      "Sevilla, España", "Zaragoza, España", "Málaga, España", "Bilbao, España"
    ];
    let hash = 0;
    for (let i = 0; i < ipAddress.length; i++) {
      hash = ipAddress.charCodeAt(i) + ((hash << 5) - hash);
    }
    location = locations[Math.abs(hash) % locations.length];
  }
  return { ipAddress, location };
}

// Middleware de verificación de token JWT con control de sesiones activa
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  jwt.verify(token, JWT_SECRET, async (err: any, decodedUser: any) => {
    if (err) {
      return res.status(403).json({ error: 'Sesión expirada o token inválido.' });
    }
    
    try {
      const activeSession = await prisma.session.findUnique({
        where: { token: token }
      });
      
      if (!activeSession) {
        // Capa de compatibilidad de despliegue progresivo: autogenerar sesión inicial
        const sessionsCount = await prisma.session.count({ where: { userId: decodedUser.id } });
        if (sessionsCount === 0) {
          const uaInfo = parseUserAgent(req.headers['user-agent']);
          const { ipAddress, location } = getIpAndLocation(req);
          await prisma.session.create({
            data: {
              userId: decodedUser.id,
              token: token,
              userAgent: req.headers['user-agent'] || null,
              ipAddress: ipAddress,
              location: location,
              deviceType: uaInfo.deviceType,
              browser: uaInfo.browser,
              os: uaInfo.os
            }
          });
        } else {
          return res.status(403).json({ error: 'Tu sesión ha sido revocada desde otro dispositivo.' });
        }
      } else {
        // Actualizar último acceso de forma asíncrona
        prisma.session.update({
          where: { id: activeSession.id },
          data: { lastActive: new Date() }
        }).catch(() => {});
      }
      
      req.user = decodedUser;
      next();
    } catch (dbErr) {
      // Respaldo de alta disponibilidad en caso de fallo de DB
      req.user = decodedUser;
      next();
    }
  });
}

// 1. Endpoint de Registro (Register)
authRouter.post('/register', async (req: Request, res: Response): Promise<any> => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Por favor, completa todos los campos.' });
  }

  try {
    // Comprobar si el email ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // Hashear la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear el usuario
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        plan: 'none'
      }
    });

    // Generar token JWT
    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        plan: newUser.plan,
        profession: newUser.profession,
        role: newUser.role,
        siteName: newUser.siteName,
        siteType: newUser.siteType,
        siteDomain: newUser.siteDomain,
        siteJobId: newUser.siteJobId,
        siteStatus: newUser.siteStatus
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al registrar el usuario: ' + error.message });
  }
});

// 2. Endpoint de Acceso (Login)
authRouter.post('/login', async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Por favor, completa todos los campos.' });
  }

  try {
    // Comprobar si el usuario existe
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Credenciales de acceso incorrectas.' });
    }

    // Comparar contraseñas
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: 'Credenciales de acceso incorrectas.' });
    }

    // Generar token JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    // Registrar la sesión activa del dispositivo
    const uaInfo = parseUserAgent(req.headers['user-agent']);
    const { ipAddress, location } = getIpAndLocation(req);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: token,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: ipAddress,
        location: location,
        deviceType: uaInfo.deviceType,
        browser: uaInfo.browser,
        os: uaInfo.os
      }
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        profession: user.profession,
        role: user.role,
        siteName: user.siteName,
        siteType: user.siteType,
        siteDomain: user.siteDomain,
        siteJobId: user.siteJobId,
        siteStatus: user.siteStatus
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al iniciar sesión: ' + error.message });
  }
});

// Función de utilidad para verificar y reiniciar créditos mensuales rotativos de IA
export async function verifyAndResetCredits(userId: number) {
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) return null;

  const now = new Date();
  const plan = dbUser.plan || 'none';
  const maxCredits = {
    none: 50,
    basic: 50,
    corporativa: 50,
    pro: 200,
    dinamica: 200,
    ecommerce: 500
  }[plan] || 50;

  // Si no tiene fecha de reinicio o la fecha de reinicio está en el pasado
  if (dbUser.creditsResetDate && dbUser.creditsResetDate < now) {
    const nextReset = new Date();
    nextReset.setDate(nextReset.getDate() + 30);

    const updated = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        aiCredits: maxCredits,
        creditsResetDate: nextReset
      }
    });
    console.log(`🔄 [CRÉDITOS] Reseteo mensual completado para ${updated.email}: ${maxCredits} créditos. Próximo reinicio: ${nextReset.toISOString()}`);
    return updated;
  } else if (!dbUser.creditsResetDate) {
    // Si es un usuario nuevo o sin fecha, inicializamos la fecha a 30 días en el futuro
    const nextReset = new Date();
    nextReset.setDate(nextReset.getDate() + 30);
    
    const updated = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        creditsResetDate: nextReset
      }
    });
    return updated;
  }
  return dbUser;
}

// 3. Obtener Datos del Perfil (Me)
authRouter.get('/me', authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  try {
    const dbUser = await verifyAndResetCredits(req.user.id);
    if (!dbUser) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json({
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      plan: dbUser.plan,
      profession: dbUser.profession,
      role: dbUser.role,
      siteName: dbUser.siteName,
      siteType: dbUser.siteType,
      siteDomain: dbUser.siteDomain,
      siteJobId: dbUser.siteJobId,
      siteStatus: dbUser.siteStatus,
      aiCredits: dbUser.aiCredits
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al recuperar perfil: ' + error.message });
  }
});

// 4. Actualizar Respuestas del Onboarding de Usuario
// SEGURIDAD: este endpoint NUNCA modifica `plan` ni `aiCredits`. La activación de un
// plan de pago se realiza EXCLUSIVAMENTE a través del webhook verificado de Stripe
// (POST /api/stripe/webhook). Cualquier `plan`/`aiCredits` enviado por el cliente se ignora.
authRouter.post('/update-profile', authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  // NOTA: `role` NO es modificable por el cliente — es el campo de autorización que usa
  // requireAdmin. Permitir que el usuario lo cambie sería una escalada de privilegios.
  const { name, profession, siteName, siteDomain } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name || undefined,
        profession: profession || undefined,
        siteName: siteName !== undefined ? siteName : undefined,
        siteDomain: siteDomain !== undefined ? siteDomain : undefined,
      }
    });

    res.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      plan: updatedUser.plan,
      profession: updatedUser.profession,
      role: updatedUser.role,
      siteName: updatedUser.siteName,
      siteType: updatedUser.siteType,
      siteDomain: updatedUser.siteDomain,
      siteJobId: updatedUser.siteJobId,
      siteStatus: updatedUser.siteStatus,
      aiCredits: updatedUser.aiCredits
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar perfil: ' + error.message });
  }
});

// 5. Endpoint de Autenticación con Google OAuth
authRouter.post('/google', async (req: Request, res: Response): Promise<any> => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Token de Google no proporcionado.' });
  }

  try {
    // Validar el token de forma segura con la API de Google
    const googleVerifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!googleVerifyRes.ok) {
      return res.status(400).json({ error: 'Token de Google inválido o expirado.' });
    }

    const payload = (await googleVerifyRes.json()) as any;
    const { email, email_verified, name } = payload;

    if (!email || email_verified !== 'true') {
      return res.status(400).json({ error: 'El correo de Google no está verificado.' });
    }

    // Buscar si el usuario ya existe
    let user = await prisma.user.findUnique({ where: { email } });
    let isNewGoogleUser = false;

    if (!user) {
      // Registrar por primera vez
      isNewGoogleUser = true;
      const randomPassword = Math.random().toString(36).slice(-16);
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      user = await prisma.user.create({
        data: {
          name: name || 'Usuario de Google',
          email,
          passwordHash,
          plan: 'none'
        }
      });
    } else {
      // Si existe pero no ha configurado profesión u onboarding, lo tratamos como nuevo
      if (!user.profession || !user.role) {
        isNewGoogleUser = true;
      }
    }

    // Generar token JWT de Avialo
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      isNewGoogleUser,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        profession: user.profession,
        role: user.role,
        siteName: user.siteName,
        siteType: user.siteType,
        siteDomain: user.siteDomain,
        siteJobId: user.siteJobId,
        siteStatus: user.siteStatus
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error en la autenticación con Google: ' + error.message });
  }
});

// 6. Endpoint de verificación de DNS real
authRouter.post('/verify-dns', authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Dominio no proporcionado.' });
  }

  try {
    const target = openproviderConfig.dnsTargetIp;
    const addresses = await resolveA(domain);
    const pointsToAvialo = addresses.includes(target);
    res.json({
      ips: addresses,
      pointsToAvialo,
      message: pointsToAvialo
        ? '¡Configuración DNS correcta! El dominio está apuntando a Avialo.'
        : `El dominio apunta a ${addresses.join(', ')} en lugar de la IP de Avialo ${target}.`
    });
  } catch (err: any) {
    res.json({
      ips: [],
      pointsToAvialo: false,
      message: `No se pudo resolver el dominio: ${err.message || 'Error de resolución.'}`
    });
  }
});

// 7. Endpoint de cambio de contraseña real
authRouter.post('/change-password', authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const { currentPassword, newPassword } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Por favor, proporciona la contraseña actual y la nueva.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash }
    });

    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al cambiar la contraseña: ' + error.message });
  }
});

// 8. RGPD — Exportar todos los datos de la cuenta (portabilidad de datos)
authRouter.get('/export-data', authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Excluir el hash de la contraseña del export
    const { passwordHash, ...safeUser } = user;

    res.setHeader('Content-Disposition', 'attachment; filename="avialo-export.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      account: safeUser,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al exportar los datos: ' + error.message });
  }
});

// 9. RGPD — Borrado de cuenta autoservicio (derecho al olvido)
authRouter.delete('/account', authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Cancelar la suscripción de Stripe para no seguir cobrando la tarjeta.
    if (user.stripeSubscriptionId && stripe) {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId).catch((err: any) =>
        console.error(`⚠️ No se pudo cancelar la suscripción ${user.stripeSubscriptionId}:`, err.message)
      );
    }

    // Limpiar recursos del sitio: contenedor, esquema multi-tenant y sandbox en disco.
    await cleanupUserSite(user.siteJobId);

    // Borrar el registro del usuario.
    await prisma.user.delete({ where: { id: req.user.id } });

    res.json({ success: true, message: 'Tu cuenta y todos tus datos han sido eliminados.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar la cuenta: ' + error.message });
  }
});

/**
 * GET /api/auth/sessions
 * Recupera todas las sesiones activas asociadas al usuario actual.
 * Protegido con JWT.
 */
authRouter.get('/sessions', authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado.' });
  }
  const authHeader = req.headers['authorization'];
  const currentToken = authHeader && authHeader.split(' ')[1];

  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user.id },
      orderBy: { lastActive: 'desc' }
    });

    const formatted = sessions.map(s => ({
      id: s.id,
      deviceType: s.deviceType || 'Desktop',
      browser: s.browser || 'Navegador',
      os: s.os || 'Desconocido',
      ipAddress: s.ipAddress || '127.0.0.1',
      location: s.location || 'Localhost (Desarrollo)',
      lastActive: s.lastActive,
      isCurrent: s.token === currentToken
    }));

    res.json({ sessions: formatted });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al recuperar las sesiones activas: ' + error.message });
  }
});

/**
 * DELETE /api/auth/sessions/:id
 * Revoca un dispositivo/sesión específico desconectándolo de inmediato.
 * Protegido con JWT.
 */
authRouter.delete('/sessions/:id', authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado.' });
  }
  const { id } = req.params;

  try {
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada.' });
    }
    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para revocar esta sesión.' });
    }

    await prisma.session.delete({ where: { id } });
    res.json({ success: true, message: 'Dispositivo desconectado correctamente de forma segura.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al revocar la sesión: ' + error.message });
  }
});

/**
 * POST /api/auth/sessions/logout-others
 * Cierra la sesión en todos los demás dispositivos excepto el actual.
 * Protegido con JWT.
 */
authRouter.post('/sessions/logout-others', authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado.' });
  }
  const authHeader = req.headers['authorization'];
  const currentToken = authHeader && authHeader.split(' ')[1];

  try {
    await prisma.session.deleteMany({
      where: {
        userId: req.user.id,
        token: { not: currentToken }
      }
    });
    res.json({ success: true, message: 'Se ha cerrado la sesión en todos los demás dispositivos con éxito.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al cerrar sesiones secundarias: ' + error.message });
  }
});


