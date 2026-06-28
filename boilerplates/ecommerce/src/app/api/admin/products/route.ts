import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createProduct, listProducts, ProductRichInput } from "@/lib/tenantApi";

// Verifica que quien llama es el dueño (sesión admin del tenant).
async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const products = await listProducts();
    return NextResponse.json({ products });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as ProductRichInput | null;
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 });
  }
  try {
    // El orquestador valida y acota al Sales Channel del tenant; aquí solo reenviamos.
    const product = await createProduct(body);
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
