import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { startPaymentOnboarding } from "@/lib/tenantApi";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    // Las URLs de retorno apuntan SIEMPRE a este mismo dominio (la tienda del tenant),
    // derivadas del origin de la petición (no se confía en valores del cliente).
    const origin = req.nextUrl.origin;
    const returnUrl = `${origin}/admin/ajustes?stripe=return`;
    const refreshUrl = `${origin}/admin/ajustes?stripe=refresh`;
    const result = await startPaymentOnboarding(returnUrl, refreshUrl);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
