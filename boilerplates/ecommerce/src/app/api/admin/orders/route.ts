import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listOrders } from "@/lib/tenantApi";

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
    const page = await listOrders({
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    return NextResponse.json(page);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
