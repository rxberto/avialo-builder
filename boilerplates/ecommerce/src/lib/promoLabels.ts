// Etiquetas y formato de los descuentos (es-ES), compartidos por la lista y el detalle.
import { formatPrice } from "@/lib/format";
import type { PromotionSummary } from "@/lib/tenantApi";

export type BadgeVariant = "green" | "amber" | "blue" | "red" | "neutral";

export const PROMO_STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  active: { label: "Activo", variant: "green" },
  draft: { label: "Borrador", variant: "amber" },
  inactive: { label: "Inactivo", variant: "neutral" },
};

export function promoStatusMeta(status: string): { label: string; variant: BadgeVariant } {
  return PROMO_STATUS_META[status] ?? { label: status, variant: "neutral" };
}

export function promoTypeLabel(valueType: PromotionSummary["valueType"]): string {
  return valueType === "percentage" ? "Porcentaje" : "Importe fijo";
}

export function promotionValueLabel(p: Pick<PromotionSummary, "valueType" | "value" | "currencyCode">): string {
  if (p.valueType === "percentage") return `${p.value} %`;
  return formatPrice(p.value, p.currencyCode || "eur");
}
