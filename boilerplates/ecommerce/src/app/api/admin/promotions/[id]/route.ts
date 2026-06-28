import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPromotion, updatePromotion, deletePromotion, PromotionStatus } from "@/lib/tenantApi";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

const STATUSES: PromotionStatus[] = ["active", "draft", "inactive"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const promotion = await getPromotion(params.id);
    return NextResponse.json({ promotion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await req.json()) as { code?: string; value?: number; status?: string };
    const patch: { code?: string; value?: number; status?: PromotionStatus } = {};
    if (typeof body.code === "string") patch.code = body.code;
    if (typeof body.value === "number" && Number.isFinite(body.value)) patch.value = body.value;
    if (STATUSES.includes(body.status as PromotionStatus)) {
      patch.status = body.status as PromotionStatus;
    }
    const promotion = await updatePromotion(params.id, patch);
    return NextResponse.json({ promotion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    await deletePromotion(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
