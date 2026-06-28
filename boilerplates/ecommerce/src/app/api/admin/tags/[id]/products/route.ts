import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateTagProducts } from "@/lib/tenantApi";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await req.json()) as { add?: string[]; remove?: string[] };
    const add = Array.isArray(body.add) ? body.add.filter((x) => typeof x === "string") : [];
    const remove = Array.isArray(body.remove) ? body.remove.filter((x) => typeof x === "string") : [];
    if (add.length === 0 && remove.length === 0) {
      return NextResponse.json({ error: "Indica productos a añadir o quitar." }, { status: 400 });
    }
    const tag = await updateTagProducts(params.id, { add, remove });
    return NextResponse.json({ tag });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
