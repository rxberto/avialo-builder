import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Mail, Phone, ShoppingCart } from "lucide-react";
import { getCustomer, CustomerDetail } from "@/lib/tenantApi";
import { formatPrice } from "@/lib/format";
import { paymentBadge, fulfillmentBadge, formatOrderDate } from "@/lib/orderLabels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function initials(name: string | null, email: string | null): string {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default async function ClienteDetallePage({ params }: { params: { id: string } }) {
  let customer: CustomerDetail;
  try {
    customer = await getCustomer(decodeURIComponent(params.id));
  } catch {
    notFound();
  }

  const addr = customer.defaultAddress;

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-ui-fg-subtle hover:text-ui-fg-base mb-5"
      >
        <ArrowLeft size={15} /> Clientes
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ui-bg-component text-base font-semibold text-ui-fg-subtle">
          {initials(customer.name, customer.email)}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight truncate">
            {customer.name || "Cliente"}
          </h1>
          <p className="text-sm text-ui-fg-subtle truncate">{customer.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pedidos del cliente */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-ui-border-base">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart size={16} className="text-ui-fg-subtle" /> Pedidos
                <Badge variant="neutral">{customer.orderCount}</Badge>
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Pedido</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Pago</TableHead>
                  <TableHead className="hidden md:table-cell">Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.map((o) => {
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
          </Card>
        </div>

        {/* Resumen + contacto + dirección */}
        <div className="space-y-5">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ui-fg-subtle">Pedidos</span>
                <span className="text-sm font-semibold text-ui-fg-base">{customer.orderCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ui-fg-subtle">Total gastado</span>
                <span className="text-sm font-semibold text-ui-fg-base">
                  {formatPrice(customer.totalSpent, customer.currencyCode)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ui-fg-subtle">Primera compra</span>
                <span className="text-sm text-ui-fg-base">{formatOrderDate(customer.firstOrderAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-ui-fg-subtle break-all">
                <Mail size={15} className="shrink-0" /> {customer.email || "—"}
              </p>
              {customer.phone && (
                <p className="flex items-center gap-2 text-sm text-ui-fg-subtle">
                  <Phone size={15} className="shrink-0" /> {customer.phone}
                </p>
              )}
            </CardContent>
          </Card>

          {addr && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin size={16} className="text-ui-fg-subtle" /> Dirección
                </CardTitle>
              </CardHeader>
              <CardContent>
                <address className="not-italic text-sm text-ui-fg-subtle space-y-0.5">
                  {addr.name && <p className="text-ui-fg-base font-medium">{addr.name}</p>}
                  {addr.line1 && <p>{addr.line1}</p>}
                  {addr.line2 && <p>{addr.line2}</p>}
                  <p>{[addr.postalCode, addr.city].filter(Boolean).join(" ")}</p>
                  {addr.province && <p>{addr.province}</p>}
                  {addr.countryCode && <p className="uppercase">{addr.countryCode}</p>}
                </address>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
