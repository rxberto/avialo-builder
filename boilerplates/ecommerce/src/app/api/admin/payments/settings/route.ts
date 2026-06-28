import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPaymentSettings } from "@/lib/tenantApi";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const settings = await getPaymentSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
