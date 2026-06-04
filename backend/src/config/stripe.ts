import Stripe from "stripe";

// Instancia única de Stripe, compartida por la API y el panel admin.
// Es null si no hay clave configurada (los call sites deben contemplarlo).
// SEGURIDAD: la clave llega SOLO por entorno (nunca hardcodeada). Se recomienda usar una
// clave RESTRINGIDA (rk_...) con permisos mínimos en vez de la secreta (sk_...).
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// No fijamos apiVersion: dejamos la que pinea el SDK instalado (stripe v22). Así evitamos
// desalineaciones de tipos y usamos la versión estable que acompaña al SDK.
export const stripe =
  stripeSecretKey && stripeSecretKey !== "sk_test_..."
    ? new Stripe(stripeSecretKey)
    : null;

// ============================================
// MAPA PLAN ⇄ PRICE ID (fuente única)
// ============================================
// Los Price IDs se crean en Stripe con `npm run stripe:setup` y se inyectan por entorno.
// Mantener planes facturables alineados con PLAN_CATALOG (config/plans.ts).

/** Planes facturables y su variable de entorno con el Price ID recurrente. */
const PLAN_PRICE_ENV: Record<string, string> = {
  corporativa: "STRIPE_PRICE_CORPORATIVA",
  dinamica: "STRIPE_PRICE_DINAMICA",
  ecommerce: "STRIPE_PRICE_ECOMMERCE",
};

/** Lookup keys usados por el script de setup para crear/recuperar precios idempotentemente. */
export const PLAN_LOOKUP_KEYS: Record<string, string> = {
  corporativa: "avialo_corporativa",
  dinamica: "avialo_dinamica",
  ecommerce: "avialo_ecommerce",
};

/** Importe mensual en céntimos (EUR) por plan — fuente para crear los precios y para display. */
export const PLAN_MONTHLY_AMOUNT: Record<string, number> = {
  corporativa: 2900,
  dinamica: 5900,
  ecommerce: 11900,
};

/** Nombre comercial del producto por plan. */
export const PLAN_PRODUCT_NAME: Record<string, string> = {
  corporativa: "Plan SaaS Avialo Basic",
  dinamica: "Plan SaaS Avialo Pro",
  ecommerce: "Plan SaaS Avialo Ecommerce",
};

/** Devuelve el Price ID configurado por entorno para un plan, o undefined si falta. */
export function priceIdForPlan(plan?: string | null): string | undefined {
  if (!plan) return undefined;
  const envKey = PLAN_PRICE_ENV[plan];
  if (!envKey) return undefined;
  const value = process.env[envKey];
  return value && value.startsWith("price_") ? value : undefined;
}

/** Mapa inverso: dado un Price ID (el que llega en los eventos de Stripe) devuelve el plan. */
export function planFromPriceId(priceId?: string | null): string | null {
  if (!priceId) return null;
  for (const plan of Object.keys(PLAN_PRICE_ENV)) {
    if (priceIdForPlan(plan) === priceId) return plan;
  }
  return null;
}

/** True si todos los Price IDs de planes facturables están configurados. */
export function allPricesConfigured(): boolean {
  return Object.keys(PLAN_PRICE_ENV).every((plan) => !!priceIdForPlan(plan));
}

// ============================================
// IVA / IMPUESTOS
// ============================================
// Los precios de Avialo son IVA INCLUIDO: el importe que ve el cliente (29/59/119€) es el
// TOTAL y el 21% de IVA va dentro (tax_behavior "inclusive"). Cuando STRIPE_AUTOMATIC_TAX=true,
// Stripe Tax calcula y desglosa ese IVA en las facturas (base imponible + 21%), que es lo que
// exige una factura real española.
//
// REQUISITOS para activarlo (en el Dashboard de Stripe, una sola vez):
//   1) Activar Stripe Tax y registrar la obligación fiscal de España.
//   2) Que los Price tengan tax_behavior "inclusive" (los crea así `npm run stripe:setup`).
//   3) Se recoge la dirección del cliente en el Checkout (necesaria para calcular el IVA).
// Por defecto DESACTIVADO: así, si Stripe Tax aún no está configurado, el cobro no se rompe
// (se cobra el importe íntegro como hasta ahora) y se activa con la variable cuando todo esté listo.
export const STRIPE_AUTOMATIC_TAX = process.env.STRIPE_AUTOMATIC_TAX === "true";
