import "server-only";
import { Pool } from "pg";

// Acceso a la BD del tenant con `pg` (JS puro, sin engine nativo → no necesita OpenSSL del
// sistema, a diferencia de Prisma, que falla en node:20-bookworm-slim). Solo lo usa el login
// del panel del dueño para verificar credenciales contra la tabla User del esquema del tenant.

const CONNECTION_STRING = process.env.DATABASE_URL || "";

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: CONNECTION_STRING, max: 3 });
  }
  return pool;
}

// El esquema del tenant viaja en la URL (?schema=tenant_<clientId>). Lo extraemos y validamos
// (solo [A-Za-z0-9_]) porque va como identificador en la consulta (no se puede parametrizar).
function tenantSchema(): string {
  try {
    const schema = new URL(CONNECTION_STRING).searchParams.get("schema") || "public";
    return /^[A-Za-z0-9_]+$/.test(schema) ? schema : "public";
  } catch {
    return "public";
  }
}

export interface TenantUser {
  id: string;
  name: string | null;
  email: string;
  passwordHash: string;
  role: "admin" | "client";
}

export async function findUserByEmail(email: string): Promise<TenantUser | null> {
  if (!CONNECTION_STRING) return null;
  const schema = tenantSchema();
  const result = await getPool().query<TenantUser>(
    `SELECT id, name, email, "passwordHash", role
       FROM "${schema}"."User"
      WHERE email = $1
      LIMIT 1`,
    [email]
  );
  return result.rows[0] ?? null;
}
