import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCategory, updateCategory, deleteCategory } from "@/lib/tenantApi";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const category = await getCategory(params.id);
    return NextResponse.json({ category });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      name?: string;
      handle?: string;
      description?: string | null;
      isActive?: boolean;
      parentId?: string | null;
    };
    const category = await updateCategory(params.id, body);
    return NextResponse.json({ category });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    await deleteCategory(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
