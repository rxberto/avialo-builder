import Medusa from "@medusajs/js-sdk";

// URL del backend Medusa COMPARTIDO y clave publicable del tenant. Ambas son NEXT_PUBLIC_*
// porque el SDK también corre en el navegador (carrito, checkout). El pipeline las inyecta
// en build-time; sin clave el backend rechaza las llamadas de Store API.
export const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

export const MEDUSA_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

// Identificador del proveedor de pago en Medusa v2. Por defecto el provider PROPIO de
// Stripe Connect (`pp_stripe-connect_stripe`), que enruta el cobro a la cuenta del tenant.
// Configurable por entorno por si el backend usa otro id.
export const STRIPE_PROVIDER_ID =
  process.env.NEXT_PUBLIC_STRIPE_PROVIDER_ID || "pp_stripe-connect_stripe";

// Provider de Redsys (TPV español) en Medusa.
export const REDSYS_PROVIDER_ID =
  process.env.NEXT_PUBLIC_REDSYS_PROVIDER_ID || "pp_redsys_redsys";

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: MEDUSA_PUBLISHABLE_KEY,
});
