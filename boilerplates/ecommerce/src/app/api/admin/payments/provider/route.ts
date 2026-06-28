import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { setActiveProvider, PaymentProvider } from "@/lib/tenantApi";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const provider = body.provider as PaymentProvider;
    if (provider !== "none" && provider !== "stripe" && provider !== "redsys") {
      return NextResponse.json({ error: "Pasarela no válida." }, { status: 400 });
    }
    const settings = await setActiveProvider(provider);
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
