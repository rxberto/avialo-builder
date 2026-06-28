import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { shipFulfillment } from "@/lib/tenantApi";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; fid: string } }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const order = await shipFulfillment(params.id, params.fid);
    return NextResponse.json({ order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
