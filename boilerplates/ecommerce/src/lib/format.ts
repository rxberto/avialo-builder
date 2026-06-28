import type { HttpTypes } from "@medusajs/types";

// Formatea un importe a moneda local (España → es-ES). En Medusa v2 los importes ya vienen
// en la unidad principal de la divisa (p. ej. 24.99 EUR), no en céntimos.
export function formatPrice(amount: number, currencyCode: string): string {
  if (!currencyCode) return String(amount);
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(amount);
}

export interface VariantPrice {
  calculatedAmount: number;
  originalAmount: number;
  currencyCode: string;
  calculated: string;
  original: string;
  isSale: boolean;
}

// Extrae el precio calculado de una variante (requiere fields=*variants.calculated_price).
export function getVariantPrice(
  variant: HttpTypes.StoreProductVariant | undefined | null
): VariantPrice | null {
  const cp = variant?.calculated_price;
  if (!cp || cp.calculated_amount == null) return null;

  const calculatedAmount = cp.calculated_amount;
  const originalAmount = cp.original_amount ?? calculatedAmount;
  const currencyCode = cp.currency_code ?? "eur";

  return {
    calculatedAmount,
    originalAmount,
    currencyCode,
    calculated: formatPrice(calculatedAmount, currencyCode),
    original: formatPrice(originalAmount, currencyCode),
    isSale: originalAmount > calculatedAmount,
  };
}

// Precio de la variante más barata de un producto (para tarjetas del catálogo).
export function getCheapestPrice(
  product: HttpTypes.StoreProduct
): VariantPrice | null {
  const variants = product.variants ?? [];
  const priced = variants
    .filter((v) => v.calculated_price?.calculated_amount != null)
    .sort(
      (a, b) =>
        (a.calculated_price!.calculated_amount ?? 0) -
        (b.calculated_price!.calculated_amount ?? 0)
    );
  return getVariantPrice(priced[0]);
}
