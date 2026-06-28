import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listTags, createTag } from "@/lib/tenantApi";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "", 10);
  const offset = parseInt(searchParams.get("offset") ?? "", 10);
  try {
    const page = await listTags({
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    return NextResponse.json(page);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await req.json()) as { label?: string };
    if (!body.label?.trim()) {
      return NextResponse.json({ error: "La etiqueta no puede estar vacía." }, { status: 400 });
    }
    const tag = await createTag({ label: body.label });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
