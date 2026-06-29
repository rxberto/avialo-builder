import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listTenantUsers,
  createTenantUser,
  TenantUserError,
  type TenantRole,
} from "@/lib/tenantDb";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRole(value: unknown): value is TenantRole {
  return value === "admin" || value === "client";
}

// GET: lista de usuarios del panel + id del usuario actual (para que la UI no permita
// que alguien se borre a sí mismo).
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const users = await listTenantUsers();
    return NextResponse.json({ users, currentUserId: session.user.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// POST: crea un nuevo usuario del panel.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name : null;
    const role = body.role;

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Introduce un correo válido." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }
    if (!isRole(role)) {
      return NextResponse.json({ error: "Rol no válido." }, { status: 400 });
    }

    const user = await createTenantUser({ name, email, password, role });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof TenantUserError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
