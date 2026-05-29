import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/client.js';

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

// 3. Obtener Datos del Perfil (Me)
authRouter.get('/me', authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
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
      siteStatus: dbUser.siteStatus
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al recuperar perfil: ' + error.message });
  }
});

// 4. Actualizar Respuestas del Onboarding de Usuario
authRouter.post('/update-profile', authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const { profession, role, plan } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        profession: profession || undefined,
        role: role || undefined,
        plan: plan || undefined
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
      siteStatus: updatedUser.siteStatus
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar perfil: ' + error.message });
  }
});
