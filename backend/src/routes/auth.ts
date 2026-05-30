import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/client.js';
import dns from 'dns';
import { promisify } from 'util';

const resolveA = promisify(dns.resolve4);

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'avialo-super-secret-key-32-chars';

// Interfaz extendida para guardar la sesión del usuario en Request
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

// Middleware de verificación de token JWT
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decodedUser: any) => {
    if (err) {
      return res.status(403).json({ error: 'Sesión expirada o token inválido.' });
    }
    req.user = decodedUser;
    next();
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
authRouter.post('/update-profile', authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const { name, profession, role, plan, siteName, siteDomain } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    let extraData: any = {};
    if (plan !== undefined && plan !== existingUser.plan) {
      const PLAN_CREDITS: Record<string, number> = {
        none: 50,
        basic: 50,
        corporativa: 50,
        pro: 200,
        dinamica: 200,
        ecommerce: 500,
      };
      extraData.aiCredits = PLAN_CREDITS[plan] ?? 50;
      const nextReset = new Date();
      nextReset.setDate(nextReset.getDate() + 30);
      extraData.creditsResetDate = nextReset;
      console.log(`💳 [PLAN ADQUIRIDO] Usuario ${existingUser.email} actualiza plan de "${existingUser.plan}" a "${plan}". Asignados ${extraData.aiCredits} créditos y reset date al ${nextReset.toISOString()}`);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name || undefined,
        profession: profession || undefined,
        role: role || undefined,
        plan: plan || undefined,
        siteName: siteName !== undefined ? siteName : undefined,
        siteDomain: siteDomain !== undefined ? siteDomain : undefined,
        ...extraData
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
    const addresses = await resolveA(domain);
    const pointsToAvialo = addresses.includes('159.69.110.22');
    res.json({
      ips: addresses,
      pointsToAvialo,
      message: pointsToAvialo 
        ? '¡Configuración DNS correcta! El dominio está apuntando a Avialo.' 
        : `El dominio apunta a ${addresses.join(', ')} en lugar de la IP de Avialo 159.69.110.22.`
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


