import Link from "next/link";
import { AlertCircle, ShoppingCart } from "lucide-react";
import { listOrders, storeConfigured, OrderSummary } from "@/lib/tenantApi";
import { formatPrice } from "@/lib/format";
import { paymentBadge, fulfillmentBadge, formatOrderDate } from "@/lib/orderLabels";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  if (!storeConfigured()) {
    return (
      <div className="max-w-lg rounded-xl border border-ui-border-base bg-ui-bg-base p-6 text-sm text-ui-fg-subtle">
        La gestión de la tienda aún no está disponible para este sitio.
      </div>
    );
  }

  let orders: OrderSummary[] = [];
  let count = 0;
  let loadError: string | null = null;
  try {
    const page = await listOrders({ limit: 50 });
    orders = page.orders;
    count = page.count;
  } catch (err) {
    loadError = err instanceof Error ? err.message : "No se pudieron cargar los pedidos.";
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight">Pedidos</h1>
        <p className="text-sm text-ui-fg-subtle mt-1">
          {count > 0
            ? `${count} pedido${count === 1 ? "" : "s"} en tu tienda.`
            : "Los pedidos de tu tienda aparecerán aquí."}
        </p>
      </div>

      {loadError && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          <AlertCircle className="h-4 w-4 shrink-0" /> {loadError}
        </div>
      )}

      <Card className="overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="mx-auto h-8 w-8 text-ui-fg-muted" />
            <p className="mt-3 text-sm text-ui-fg-subtle">Aún no tienes pedidos.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Pedido</TableHead>
                <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Pago</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const pay = paymentBadge(o.paymentStatus);
                const ful = fulfillmentBadge(o.fulfillmentStatus);
                return (
                  <TableRow key={o.id} className="group">
                    <TableCell>
                      <Link
                        href={`/admin/pedidos/${o.id}`}
                        className="font-semibold text-ui-fg-base group-hover:underline"
                      >
                        #{o.displayId ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-ui-fg-subtle whitespace-nowrap">
                      {formatOrderDate(o.createdAt)}
                    </TableCell>
                    <TableCell className="min-w-0">
                      <Link href={`/admin/pedidos/${o.id}`} className="block">
                        <span className="block font-medium text-ui-fg-base truncate">
                          {o.customerName || "Cliente"}
                        </span>
                        <span className="block text-xs text-ui-fg-subtle truncate">{o.email}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={pay.variant}>{pay.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={ful.variant}>{ful.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-ui-fg-base whitespace-nowrap">
                      {formatPrice(o.total, o.currencyCode)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
