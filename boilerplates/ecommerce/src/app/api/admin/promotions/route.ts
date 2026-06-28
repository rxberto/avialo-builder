import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listPromotions, createPromotion, PromotionType, PromotionStatus } from "@/lib/tenantApi";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

const TYPES: PromotionType[] = ["percentage", "fixed"];
const STATUSES: PromotionStatus[] = ["active", "draft", "inactive"];

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "", 10);
  const offset = parseInt(searchParams.get("offset") ?? "", 10);
  try {
    const page = await listPromotions({
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
    const body = (await req.json()) as {
      code?: string;
      valueType?: string;
      value?: number;
      status?: string;
    };
    if (!body.code?.trim()) {
      return NextResponse.json({ error: "El código no puede estar vacío." }, { status: 400 });
    }
    if (!TYPES.includes(body.valueType as PromotionType)) {
      return NextResponse.json({ error: "Tipo de descuento no válido." }, { status: 400 });
    }
    if (typeof body.value !== "number" || !Number.isFinite(body.value)) {
      return NextResponse.json({ error: "Indica el valor del descuento." }, { status: 400 });
    }
    const status = STATUSES.includes(body.status as PromotionStatus)
      ? (body.status as PromotionStatus)
      : undefined;
    const promotion = await createPromotion({
      code: body.code,
      valueType: body.valueType as PromotionType,
      value: body.value,
      status,
    });
    return NextResponse.json({ promotion }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
