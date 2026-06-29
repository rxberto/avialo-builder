import pg from "pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config/env.js";

const { Pool } = pg;

// Inicialización del pool de conexiones PostgreSQL
const pool = new Pool({
  connectionString: config.database.url,
});

// DDL del esquema del cliente (User/Appointment/BusinessConfig/Invoice...) generado desde el
// schema de Prisma del boilerplate. Se carga una vez al arrancar.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let TENANT_DDL = "";
try {
  TENANT_DDL = readFileSync(path.join(__dirname, "../../prisma/tenant-template.sql"), "utf-8");
} catch (err) {
  console.error("⚠️ No se pudo cargar prisma/tenant-template.sql; la migración de tenants fallará.", err);
}

/** Sanitiza el clientId para usarlo como identificador de esquema (anti SQL-injection). */
function tenantSchema(clientId: string): string {
  return `tenant_${clientId.toLowerCase().replace(/[^a-z0-9_-]/g, "")}`;
}

/**
 * Crea dinámicamente un esquema PostgreSQL para aislar los datos del nuevo cliente.
 * Formato del esquema: tenant_{clientId}
 * 
 * @param clientId ID del cliente sanitizado
 */
export async function createTenantSchema(clientId: string): Promise<{ success: boolean; schemaName: string; error?: string }> {
  // Sanitización estricta del clientId para evitar inyección SQL en identificadores de esquema
  const sanitizedId = clientId
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");

  const schemaName = `tenant_${sanitizedId}`;
  const client = await pool.connect();

  try {
    console.log(`🗄️  Creando esquema multi-tenant para cliente: ${schemaName}`);
    
    // Las consultas de nombres de esquemas dinámicos no aceptan variables parametrizadas de $1 en pg,
    // por lo que la sanitización previa estricta mediante regex es obligatoria.
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    
    console.log(`✅ Esquema "${schemaName}" creado o ya existente`);
    return { success: true, schemaName };
  } catch (error: any) {
    console.error(`❌ Error al crear el esquema "${schemaName}":`, error);
    return { success: false, schemaName, error: error.message || "Error al crear el esquema SQL." };
  } finally {
    client.release();
  }
}

/**
 * Elimina por completo el esquema de un tenant (RGPD: borrado de datos).
 * Usa la misma sanitización estricta que la creación.
 *
 * @param clientId ID del cliente
 */
export async function dropTenantSchema(clientId: string): Promise<{ success: boolean; schemaName: string; error?: string }> {
  const sanitizedId = clientId
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");

  const schemaName = `tenant_${sanitizedId}`;
  const client = await pool.connect();

  try {
    console.log(`🗑️  Eliminando esquema multi-tenant: ${schemaName}`);
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    return { success: true, schemaName };
  } catch (error: any) {
    console.error(`❌ Error al eliminar el esquema "${schemaName}":`, error);
    return { success: false, schemaName, error: error.message || "Error al eliminar el esquema SQL." };
  } finally {
    client.release();
  }
}

/**
 * Crea las TABLAS del cliente (User, Appointment, etc.) dentro de su esquema. Sin esto el
 * esquema queda vacío y la web generada falla al guardar reservas/usuarios.
 *
 * Importante (pgbouncer): combinamos `SET search_path` + DDL en UNA sola query (protocolo
 * simple) para que el search_path aplique a todo el lote en la misma conexión.
 * Idempotente: si la tabla User ya existe, no hace nada.
 */
export async function migrateTenantSchema(clientId: string): Promise<{ success: boolean; schemaName: string; error?: string }> {
  const schemaName = tenantSchema(clientId);
  const client = await pool.connect();
  try {
    if (!TENANT_DDL.trim()) {
      throw new Error("Plantilla DDL del tenant no disponible (prisma/tenant-template.sql).");
    }
    const check = await client.query(`SELECT to_regclass('"${schemaName}"."User"') AS t`);
    if (check.rows[0]?.t) {
      console.log(`✅ Tablas del tenant "${schemaName}" ya existen — se omite la migración.`);
      return { success: true, schemaName };
    }
    console.log(`🛠️  Migrando tablas en el esquema "${schemaName}"...`);
    // Transacción explícita: con pgbouncer (transaction pooling) garantiza que el SET y todo
    // el DDL se ejecutan en la MISMA conexión de servidor, y aporta atomicidad (todo o nada).
    await client.query(`BEGIN;\nSET search_path TO "${schemaName}";\n${TENANT_DDL}\nCOMMIT;`);
    console.log(`✅ Tablas creadas en "${schemaName}".`);
    return { success: true, schemaName };
  } catch (error: any) {
    console.error(`❌ Error migrando tablas en "${schemaName}":`, error);
    return { success: false, schemaName, error: error.message || "Error al migrar las tablas del tenant." };
  } finally {
    client.release();
  }
}

/**
 * Siembra el usuario administrador del negocio en su esquema, para que el dueño pueda entrar
 * al panel /admin de su web. Devuelve las credenciales (la contraseña en claro SOLO aquí, para
 * mostrársela una vez al cliente). Idempotente por email.
 */
export async function seedTenantAdmin(
  clientId: string,
  admin: { name?: string; email: string; password: string }
): Promise<{ success: boolean; email: string; error?: string }> {
  const schemaName = tenantSchema(clientId);
  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash(admin.password, 10);
    // INSERT cualificado con el esquema (evita depender de search_path con pgbouncer).
    await client.query(
      `INSERT INTO "${schemaName}"."User" ("id","name","email","passwordHash","role","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,'admin',NOW(),NOW())
       ON CONFLICT ("email") DO NOTHING`,
      [randomUUID(), admin.name || "Administrador", admin.email.toLowerCase(), hash]
    );
    console.log(`✅ Admin del negocio sembrado en "${schemaName}" (${admin.email}).`);
    return { success: true, email: admin.email };
  } catch (error: any) {
    console.error(`❌ Error sembrando admin en "${schemaName}":`, error);
    return { success: false, email: admin.email, error: error.message };
  } finally {
    client.release();
  }
}

// ============================================================================
// GESTIÓN DE USUARIOS DEL PANEL DE LA TIENDA (desde el IDE de Avialo)
// El cliente, ya autenticado en Avialo, gestiona los usuarios admin de SU tienda
// (la tabla "User" de su esquema tenant) SIN necesitar la contraseña del panel.
// Rompe el círculo "para entrar al panel necesito la contraseña que no tengo".
// ============================================================================

export type TenantRole = "admin" | "client";

export interface TenantUserSummary {
  id: string;
  name: string | null;
  email: string;
  role: TenantRole;
  createdAt: string;
}

// Error de dominio con código HTTP para que la ruta devuelva el estado correcto.
export class TenantUserError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "TenantUserError";
    this.status = status;
  }
}

const TENANT_USER_FIELDS = `id, name, email, role, "createdAt"`;

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  );
}

/** Lista los usuarios del panel de un tenant (admins primero, luego por antigüedad). */
export async function listTenantUsers(clientId: string): Promise<TenantUserSummary[]> {
  const schema = tenantSchema(clientId);
  const result = await pool.query<TenantUserSummary>(
    `SELECT ${TENANT_USER_FIELDS}
       FROM "${schema}"."User"
      ORDER BY (role = 'admin') DESC, "createdAt" ASC`
  );
  return result.rows;
}

/** Nº de admins del tenant (para no quedarse sin acceso al panel). */
export async function countTenantAdmins(clientId: string): Promise<number> {
  const schema = tenantSchema(clientId);
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM "${schema}"."User" WHERE role = 'admin'`
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function getTenantUserById(
  clientId: string,
  id: string
): Promise<TenantUserSummary | null> {
  const schema = tenantSchema(clientId);
  const result = await pool.query<TenantUserSummary>(
    `SELECT ${TENANT_USER_FIELDS} FROM "${schema}"."User" WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export interface CreateTenantUserInput {
  name?: string | null;
  email: string;
  password: string;
  role: TenantRole;
}

export async function createTenantUser(
  clientId: string,
  input: CreateTenantUserInput
): Promise<TenantUserSummary> {
  const schema = tenantSchema(clientId);
  const hash = await bcrypt.hash(input.password, 10);
  try {
    const result = await pool.query<TenantUserSummary>(
      `INSERT INTO "${schema}"."User" ("id","name","email","passwordHash","role","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
       RETURNING ${TENANT_USER_FIELDS}`,
      [randomUUID(), input.name?.trim() || null, input.email.toLowerCase(), hash, input.role]
    );
    return result.rows[0];
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new TenantUserError("Ya existe un usuario con ese correo.", 409);
    }
    throw err;
  }
}

export interface UpdateTenantUserInput {
  name?: string | null;
  role?: TenantRole;
  password?: string;
}

export async function updateTenantUser(
  clientId: string,
  id: string,
  input: UpdateTenantUserInput
): Promise<TenantUserSummary | null> {
  const schema = tenantSchema(clientId);
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) {
    sets.push(`"name" = $${i++}`);
    values.push(input.name?.trim() || null);
  }
  if (input.role !== undefined) {
    sets.push(`"role" = $${i++}`);
    values.push(input.role);
  }
  if (input.password !== undefined) {
    sets.push(`"passwordHash" = $${i++}`);
    values.push(await bcrypt.hash(input.password, 10));
  }

  if (sets.length === 0) return getTenantUserById(clientId, id);

  sets.push(`"updatedAt" = NOW()`);
  values.push(id);

  const result = await pool.query<TenantUserSummary>(
    `UPDATE "${schema}"."User" SET ${sets.join(", ")} WHERE id = $${i} RETURNING ${TENANT_USER_FIELDS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteTenantUser(clientId: string, id: string): Promise<boolean> {
  const schema = tenantSchema(clientId);
  const result = await pool.query(`DELETE FROM "${schema}"."User" WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

// Exportar el pool por si se requiere realizar consultas globales
export { pool };
