import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveRedsysConfig } from "@/lib/tenantApi";

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
    const merchantCode = typeof body.merchantCode === "string" ? body.merchantCode : "";
    const terminal = typeof body.terminal === "string" ? body.terminal : "001";
    const environment = body.environment === "live" ? "live" : "test";
    const secretKey = typeof body.secretKey === "string" ? body.secretKey : "";
    if (!merchantCode || !secretKey) {
      return NextResponse.json({ error: "Faltan datos de Redsys." }, { status: 400 });
    }
    const settings = await saveRedsysConfig({ merchantCode, terminal, environment, secretKey });
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
