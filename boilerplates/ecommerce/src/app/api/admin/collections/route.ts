import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listCollections, createCollection } from "@/lib/tenantApi";

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
    const page = await listCollections({
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
    const body = (await req.json()) as { title?: string; handle?: string };
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 });
    }
    const collection = await createCollection({ title: body.title, handle: body.handle });
    return NextResponse.json({ collection }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
