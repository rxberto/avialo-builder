import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStoreSettings, updateStoreSettings, StoreSettingsInput } from "@/lib/tenantApi";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const settings = await getStoreSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const input: StoreSettingsInput = {};
    if (typeof body.storeName === "string") input.storeName = body.storeName;
    if (typeof body.storeDescription === "string") input.storeDescription = body.storeDescription;
    if (typeof body.contactEmail === "string") input.contactEmail = body.contactEmail;
    if (typeof body.contactPhone === "string") input.contactPhone = body.contactPhone;
    const settings = await updateStoreSettings(input);
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
