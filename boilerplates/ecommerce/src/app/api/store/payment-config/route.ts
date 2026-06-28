import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/tenantApi";

// Config de pago para el checkout de la storefront. Resuelve EN SERVIDOR (token del tenant)
// si la tienda puede cobrar y a qué cuenta conectada enrutar. La comisión de la plataforma
// (en puntos básicos) la fija el entorno del orquestador, no el cliente. Nada de esto es
// secreto: el id de cuenta (acct_...) no permite operar sin la relación de plataforma.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getStoreSettings();
    const feeBps = parseInt(process.env.AVIALO_PLATFORM_FEE_BPS || "0", 10);
    const provider = s.paymentProvider || "none";
    // Listo para cobrar según el proveedor ACTIVO: Stripe exige cuenta conectada lista;
    // Redsys, que esté activo (solo se activa si está configurado).
    const stripeReady = s.paymentsEnabled === true && !!s.stripeAccountId;
    const paymentsEnabled =
      provider === "stripe" ? stripeReady : provider === "redsys" ? true : false;
    return NextResponse.json({
      provider,
      paymentsEnabled,
      connectedAccount: s.stripeAccountId || null,
      feeBps: Number.isFinite(feeBps) && feeBps > 0 ? feeBps : 0,
    });
  } catch {
    // Ante cualquier fallo, NO habilitamos pagos (defensivo: nunca cobrar a destino desconocido).
    return NextResponse.json({ provider: "none", paymentsEnabled: false, connectedAccount: null, feeBps: 0 });
  }
}
