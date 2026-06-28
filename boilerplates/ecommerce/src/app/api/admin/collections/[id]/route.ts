import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCollection, updateCollection, deleteCollection } from "@/lib/tenantApi";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const collection = await getCollection(params.id);
    return NextResponse.json({ collection });
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
    const body = (await req.json()) as { title?: string; handle?: string };
    const collection = await updateCollection(params.id, {
      title: body.title,
      handle: body.handle,
    });
    return NextResponse.json({ collection });
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
    await deleteCollection(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
