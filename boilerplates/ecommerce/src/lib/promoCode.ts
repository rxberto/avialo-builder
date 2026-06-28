// Reconstruye el código de descuento REAL en Medusa a partir del código visible
// que escribe el cliente. En el backend compartido los códigos se prefijan con el
// slug del tenant (ver `services/medusa.ts`); la storefront recibe ese prefijo en
// `NEXT_PUBLIC_TENANT_PROMO_PREFIX` (inyectado en build). La normalización del
// código debe COINCIDIR con `sanitizePromoCode` del backend (mayúsculas + [A-Z0-9-]).

const PROMO_PREFIX = process.env.NEXT_PUBLIC_TENANT_PROMO_PREFIX || "";

export function sanitizeVisibleCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Código real en Medusa = `<prefijo><CÓDIGO_VISIBLE_NORMALIZADO>`. */
export function toRealPromoCode(visible: string): string {
  return PROMO_PREFIX + sanitizeVisibleCode(visible);
}

/** Quita el prefijo del tenant para mostrar el código tal y como lo escribió el cliente. */
export function toVisiblePromoCode(realCode: string): string {
  if (PROMO_PREFIX && realCode.toLowerCase().startsWith(PROMO_PREFIX.toLowerCase())) {
    return realCode.slice(PROMO_PREFIX.length);
  }
  return realCode;
}
