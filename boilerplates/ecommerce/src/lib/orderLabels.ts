// Etiquetas y variantes de color de los estados de pedido (es-ES), compartidos por
// la lista y el detalle. La variante mapea a <Badge variant=...> de shadcn/ui.

export type BadgeVariant = "green" | "amber" | "blue" | "red" | "neutral";

interface Badge {
  label: string;
  variant: BadgeVariant;
}

export function paymentBadge(status: string | null): Badge {
  const map: Record<string, Badge> = {
    captured: { label: "Pagado", variant: "green" },
    authorized: { label: "Autorizado", variant: "blue" },
    partially_captured: { label: "Pago parcial", variant: "amber" },
    awaiting: { label: "Pendiente", variant: "amber" },
    not_paid: { label: "Sin pagar", variant: "red" },
    canceled: { label: "Cancelado", variant: "red" },
    refunded: { label: "Reembolsado", variant: "neutral" },
    partially_refunded: { label: "Reemb. parcial", variant: "amber" },
    requires_action: { label: "Requiere acción", variant: "amber" },
  };
  return map[status ?? ""] ?? { label: status ?? "—", variant: "neutral" };
}

export function fulfillmentBadge(status: string | null): Badge {
  const map: Record<string, Badge> = {
    not_fulfilled: { label: "Sin preparar", variant: "red" },
    partially_fulfilled: { label: "Preparación parcial", variant: "amber" },
    fulfilled: { label: "Preparado", variant: "green" },
    partially_shipped: { label: "Envío parcial", variant: "amber" },
    shipped: { label: "Enviado", variant: "green" },
    partially_delivered: { label: "Entrega parcial", variant: "amber" },
    delivered: { label: "Entregado", variant: "green" },
    canceled: { label: "Cancelado", variant: "red" },
  };
  return map[status ?? ""] ?? { label: status ?? "—", variant: "neutral" };
}

export function orderStatusBadge(status: string): Badge {
  const map: Record<string, Badge> = {
    pending: { label: "Pendiente", variant: "blue" },
    completed: { label: "Completado", variant: "green" },
    archived: { label: "Archivado", variant: "neutral" },
    canceled: { label: "Cancelado", variant: "red" },
    requires_action: { label: "Requiere acción", variant: "amber" },
    draft: { label: "Borrador", variant: "neutral" },
  };
  return map[status] ?? { label: status, variant: "neutral" };
}

export function formatOrderDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
