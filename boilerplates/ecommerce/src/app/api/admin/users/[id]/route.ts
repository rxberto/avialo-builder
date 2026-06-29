import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantUserById,
  updateTenantUser,
  deleteTenantUser,
  countTenantAdmins,
  TenantUserError,
  type TenantRole,
  type UpdateTenantUserInput,
} from "@/lib/tenantDb";

export const dynamic = "force-dynamic";

function isRole(value: unknown): value is TenantRole {
  return value === "admin" || value === "client";
}

// PATCH: edita nombre, rol o contraseña. Impide degradar al último admin (la tienda se
// quedaría sin nadie que pueda entrar al panel).
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const target = await getTenantUserById(params.id);
    if (!target) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const input: UpdateTenantUserInput = {};

    if (body.name !== undefined) {
      input.name = typeof body.name === "string" ? body.name : null;
    }

    if (body.password !== undefined) {
      const password = typeof body.password === "string" ? body.password : "";
      if (password.length < 8) {
        return NextResponse.json(
          { error: "La contraseña debe tener al menos 8 caracteres." },
          { status: 400 }
        );
      }
      input.password = password;
    }

    if (body.role !== undefined) {
      if (!isRole(body.role)) {
        return NextResponse.json({ error: "Rol no válido." }, { status: 400 });
      }
      // No puedes cambiar tu propio rol: evita que te quites el acceso al panel sin querer.
      if (params.id === session.user.id && body.role !== target.role) {
        return NextResponse.json(
          { error: "No puedes cambiar tu propio rol." },
          { status: 409 }
        );
      }
      // Degradar al último admin dejaría la tienda sin acceso al panel.
      if (target.role === "admin" && body.role !== "admin") {
        const admins = await countTenantAdmins();
        if (admins <= 1) {
          return NextResponse.json(
            { error: "No puedes quitar el rol de administrador al único admin que queda." },
            { status: 409 }
          );
        }
      }
      input.role = body.role;
    }

    const user = await updateTenantUser(params.id, input);
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof TenantUserError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// DELETE: elimina un usuario. No puedes eliminarte a ti mismo ni al último admin.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta." },
        { status: 409 }
      );
    }

    const target = await getTenantUserById(params.id);
    if (!target) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    if (target.role === "admin") {
      const admins = await countTenantAdmins();
      if (admins <= 1) {
        return NextResponse.json(
          { error: "No puedes eliminar al único administrador de la tienda." },
          { status: 409 }
        );
      }
    }

    await deleteTenantUser(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TenantUserError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
