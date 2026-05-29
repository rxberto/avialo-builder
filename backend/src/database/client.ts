import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

// Crear pool de conexiones a la base de datos Postgres del orquestador
const pool = new pg.Pool({ connectionString: config.database.url });

// Adaptador Prisma 7 para PostgreSQL
const adapter = new PrismaPg(pool);

// Instancia de cliente Prisma global
export const prisma = new PrismaClient({ adapter });

// Verificar conexión a la base de datos al arrancar
export async function connectPrisma() {
  try {
    await prisma.$connect();
    console.log('🔌 Conectado a PostgreSQL a través de Prisma ORM de forma exitosa');
  } catch (error) {
    console.error('❌ Error al conectar a PostgreSQL con Prisma:', error);
  }
}
