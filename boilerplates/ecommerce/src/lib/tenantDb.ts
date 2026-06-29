import "server-only";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

// Acceso a la BD del tenant con `pg` (JS puro, sin engine nativo → no necesita OpenSSL del
// sistema, a diferencia de Prisma, que falla en node:20-bookworm-slim). Lo usan el login del
// panel del dueño y la gestión de usuarios admin contra la tabla User del esquema del tenant.

const CONNECTION_STRING = process.env.DATABASE_URL || "";

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: CONNECTION_STRING, max: 3 });
  }
  return pool;
}

// El esquema del tenant viaja en la URL (?schema=tenant_<clientId>). Lo extraemos y validamos
// porque va como identificador en la consulta (no se puede parametrizar).
function tenantSchema(): string {
  try {
    const schema = new URL(CONNECTION_STRING).searchParams.get("schema") || "public";
    // El esquema del tenant es `tenant_<clientId>` y el clientId lleva guion+timestamp
    // (p.ej. `tenant_mitienda-1782698173501`), así que el guion DEBE permitirse. Sigue siendo
    // seguro como identificador entre comillas (solo [A-Za-z0-9_-], sin inyección posible).
    return /^[A-Za-z0-9_-]+$/.test(schema) ? schema : "public";
  } catch {
    return "public";
  }
}

export type TenantRole = "admin" | "client";

export interface TenantUser {
  id: string;
  name: string | null;
  email: string;
  passwordHash: string;
  role: TenantRole;
}

// Vista segura del usuario para el panel: nunca expone el hash de la contraseña.
export interface TenantUserSummary {
  id: string;
  name: string | null;
  email: string;
  role: TenantRole;
  createdAt: string;
}

// Error de dominio con código HTTP para que las rutas devuelvan el estado correcto.
export class TenantUserError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "TenantUserError";
    this.status = status;
  }
}

const USER_FIELDS = `id, name, email, role, "createdAt"`;

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  );
}

export async function findUserByEmail(email: string): Promise<TenantUser | null> {
  if (!CONNECTION_STRING) return null;
  const schema = tenantSchema();
  const result = await getPool().query<TenantUser>(
    `SELECT id, name, email, "passwordHash", role
       FROM "${schema}"."User"
      WHERE email = $1
      LIMIT 1`,
    [email.toLowerCase()]
  );
  return result.rows[0] ?? null;
}

// Lista de usuarios del panel, admins primero y luego por antigüedad.
export async function listTenantUsers(): Promise<TenantUserSummary[]> {
  if (!CONNECTION_STRING) return [];
  const schema = tenantSchema();
  const result = await getPool().query<TenantUserSummary>(
    `SELECT ${USER_FIELDS}
       FROM "${schema}"."User"
      ORDER BY (role = 'admin') DESC, "createdAt" ASC`
  );
  return result.rows;
}

export async function getTenantUserById(id: string): Promise<TenantUserSummary | null> {
  if (!CONNECTION_STRING) return null;
  const schema = tenantSchema();
  const result = await getPool().query<TenantUserSummary>(
    `SELECT ${USER_FIELDS} FROM "${schema}"."User" WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

// Nº de admins (para impedir quedarse sin ningún administrador del panel).
export async function countTenantAdmins(): Promise<number> {
  if (!CONNECTION_STRING) return 0;
  const schema = tenantSchema();
  const result = await getPool().query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM "${schema}"."User" WHERE role = 'admin'`
  );
  return Number(result.rows[0]?.count ?? 0);
}

export interface CreateTenantUserInput {
  name?: string | null;
  email: string;
  password: string;
  role: TenantRole;
}

export async function createTenantUser(
  input: CreateTenantUserInput
): Promise<TenantUserSummary> {
  const schema = tenantSchema();
  const hash = await bcrypt.hash(input.password, 10);
  try {
    const result = await getPool().query<TenantUserSummary>(
      `INSERT INTO "${schema}"."User" ("id","name","email","passwordHash","role","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
       RETURNING ${USER_FIELDS}`,
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

// Actualiza solo los campos presentes. Devuelve null si el usuario no existe.
export async function updateTenantUser(
  id: string,
  input: UpdateTenantUserInput
): Promise<TenantUserSummary | null> {
  const schema = tenantSchema();
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

  if (sets.length === 0) return getTenantUserById(id);

  sets.push(`"updatedAt" = NOW()`);
  values.push(id);

  const result = await getPool().query<TenantUserSummary>(
    `UPDATE "${schema}"."User" SET ${sets.join(", ")} WHERE id = $${i} RETURNING ${USER_FIELDS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteTenantUser(id: string): Promise<boolean> {
  const schema = tenantSchema();
  const result = await getPool().query(
    `DELETE FROM "${schema}"."User" WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
