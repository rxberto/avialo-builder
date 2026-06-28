"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  User,
  ImageOff,
  Loader2,
  CreditCard,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import type { OrderDetail } from "@/lib/tenantApi";
import { formatPrice } from "@/lib/format";
import {
  paymentBadge,
  fulfillmentBadge,
  orderStatusBadge,
  formatOrderDate,
} from "@/lib/orderLabels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ActionKey = "capture" | "fulfill" | "cancel" | string; // ship usa `ship:<id>`

interface TimelineEvent {
  at: string;
  label: string;
  icon: "created" | "paid" | "packed" | "shipped" | "delivered" | "canceled";
}

export function OrderDetailView({ order: initial }: { order: OrderDetail }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail>(initial);
  const [busy, setBusy] = useState<ActionKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canceled = !!order.canceledAt;
  const pay = paymentBadge(order.paymentStatus);
  const ful = fulfillmentBadge(order.fulfillmentStatus);
  const st = orderStatusBadge(order.status);

  // Ejecuta una acción del pedido contra el handler Next y refresca el detalle.
  async function runAction(key: ActionKey, path: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = (await res.json()) as { order?: OrderDetail; error?: string };
      if (!res.ok || !data.order) {
        throw new Error(data.error || "No se pudo completar la acción.");
      }
      setOrder(data.order);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/pedidos"
        className="inline-flex items-center gap-1.5 text-sm text-ui-fg-subtle hover:text-ui-fg-base mb-5"
      >
        <ArrowLeft size={15} /> Pedidos
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight">
            Pedido #{order.displayId ?? "—"}
          </h1>
          <p className="text-sm text-ui-fg-subtle mt-1">{formatOrderDate(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={st.variant}>{st.label}</Badge>
          <Badge variant={pay.variant}>{pay.label}</Badge>
          <Badge variant={ful.variant}>{ful.label}</Badge>
          <Button asChild variant="outline" size="sm">
            <a href={`/factura/${order.id}`} target="_blank" rel="noopener noreferrer">
              <FileText size={15} className="mr-1.5" /> Factura
            </a>
          </Button>
          {!canceled && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() =>
                    runAction(
                      "cancel",
                      `/api/admin/orders/${order.id}/cancel`,
                      "¿Cancelar este pedido? Esta acción no se puede deshacer."
                    )
                  }
                >
                  <Ban size={15} className="mr-2" /> Cancelar pedido
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {canceled && (
        <div className="mb-5 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <XCircle size={16} /> Pedido cancelado el {formatOrderDate(order.canceledAt)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-5">
          {/* Pago */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard size={16} className="text-ui-fg-subtle" /> Pago
              </CardTitle>
              <Badge variant={pay.variant}>{pay.label}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.payments.length === 0 ? (
                <p className="text-sm text-ui-fg-subtle">Sin pagos registrados.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {order.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      <span className="text-ui-fg-subtle">
                        {p.canceledAt
                          ? "Pago cancelado"
                          : p.capturedAt
                            ? "Pago capturado"
                            : "Pago autorizado"}
                      </span>
                      <span className="text-ui-fg-base font-medium">
                        {formatPrice(p.amount, order.currencyCode)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {order.capturable && (
                <Button
                  size="sm"
                  disabled={busy !== null}
                  onClick={() =>
                    runAction("capture", `/api/admin/orders/${order.id}/capture`)
                  }
                >
                  {busy === "capture" ? (
                    <Loader2 size={15} className="mr-2 animate-spin" />
                  ) : (
                    <CreditCard size={15} className="mr-2" />
                  )}
                  Capturar pago
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Preparación / envío */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package size={16} className="text-ui-fg-subtle" /> Preparación
              </CardTitle>
              <Badge variant={ful.variant}>{ful.label}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.fulfillments.length === 0 ? (
                <p className="text-sm text-ui-fg-subtle">
                  El pedido aún no se ha preparado.
                </p>
              ) : (
                <ul className="space-y-2">
                  {order.fulfillments.map((f) => {
                    const shipKey = `ship:${f.id}`;
                    const status = f.canceledAt
                      ? "Cancelada"
                      : f.deliveredAt
                        ? "Entregada"
                        : f.shippedAt
                          ? "Enviada"
                          : "Preparada";
                    return (
                      <li
                        key={f.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-ui-border-base px-3 py-2"
                      >
                        <span className="flex items-center gap-2 text-sm">
                          <Truck size={15} className="text-ui-fg-subtle" />
                          <span className="text-ui-fg-base">{f.itemCount} artículo(s)</span>
                          <span className="text-ui-fg-subtle">· {status}</span>
                        </span>
                        {!f.shippedAt && !f.canceledAt && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy !== null}
                            onClick={() =>
                              runAction(
                                shipKey,
                                `/api/admin/orders/${order.id}/fulfillments/${f.id}/ship`
                              )
                            }
                          >
                            {busy === shipKey ? (
                              <Loader2 size={15} className="mr-2 animate-spin" />
                            ) : (
                              <Truck size={15} className="mr-2" />
                            )}
                            Marcar enviado
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {order.fulfillable && (
                <Button
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => runAction("fulfill", `/api/admin/orders/${order.id}/fulfill`)}
                >
                  {busy === "fulfill" ? (
                    <Loader2 size={15} className="mr-2 animate-spin" />
                  ) : (
                    <Package size={15} className="mr-2" />
                  )}
                  Preparar pedido
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Artículos + totales */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-ui-border-base">
              <CardTitle>Artículos</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-border">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="h-12 w-12 shrink-0 rounded-md border border-ui-border-base bg-ui-bg-component overflow-hidden flex items-center justify-center">
                    {it.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageOff className="h-4 w-4 text-ui-fg-muted" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="block font-medium text-ui-fg-base truncate">{it.title}</span>
                    <span className="block text-xs text-ui-fg-subtle truncate">
                      {it.variantTitle && it.variantTitle !== it.title ? it.variantTitle : null}
                      {it.sku ? ` · ${it.sku}` : ""}
                    </span>
                  </div>
                  <span className="text-sm text-ui-fg-subtle whitespace-nowrap">
                    {formatPrice(it.unitPrice, order.currencyCode)} × {it.quantity}
                  </span>
                  <span className="w-24 text-right font-medium text-ui-fg-base whitespace-nowrap">
                    {formatPrice(it.total, order.currencyCode)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="px-5 py-4 border-t border-ui-border-base space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatPrice(order.subtotal, order.currencyCode)} />
              {order.discountTotal > 0 && (
                <Row
                  label="Descuentos"
                  value={`- ${formatPrice(order.discountTotal, order.currencyCode)}`}
                />
              )}
              <Row label="Envío" value={formatPrice(order.shippingTotal, order.currencyCode)} />
              <Row label="Impuestos" value={formatPrice(order.taxTotal, order.currencyCode)} />
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-ui-border-base">
                <span className="font-semibold text-ui-fg-base">Total</span>
                <span className="font-bold text-ui-fg-base">
                  {formatPrice(order.total, order.currencyCode)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Columna lateral: cliente, envío, historial */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User size={16} className="text-ui-fg-subtle" /> Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-ui-fg-base">{order.customerName || "Cliente"}</p>
              <p className="text-sm text-ui-fg-subtle break-all">{order.email}</p>
            </CardContent>
          </Card>

          {order.shippingAddress && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin size={16} className="text-ui-fg-subtle" /> Envío
                </CardTitle>
              </CardHeader>
              <CardContent>
                <address className="not-italic text-sm text-ui-fg-subtle space-y-0.5">
                  {order.shippingAddress.name && (
                    <p className="text-ui-fg-base font-medium">{order.shippingAddress.name}</p>
                  )}
                  {order.shippingAddress.line1 && <p>{order.shippingAddress.line1}</p>}
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                  <p>
                    {[order.shippingAddress.postalCode, order.shippingAddress.city]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                  {order.shippingAddress.province && <p>{order.shippingAddress.province}</p>}
                  {order.shippingAddress.countryCode && (
                    <p className="uppercase">{order.shippingAddress.countryCode}</p>
                  )}
                  {order.shippingAddress.phone && <p>Tel. {order.shippingAddress.phone}</p>}
                </address>
              </CardContent>
            </Card>
          )}

          <Timeline order={order} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-ui-fg-subtle">
      <span>{label}</span>
      <span className="text-ui-fg-base">{value}</span>
    </div>
  );
}

// Línea de tiempo derivada del estado del pedido (estilo "Actividad" de Medusa).
function Timeline({ order }: { order: OrderDetail }) {
  const events: TimelineEvent[] = [];
  if (order.createdAt) {
    events.push({ at: order.createdAt, label: "Pedido realizado", icon: "created" });
  }
  for (const p of order.payments) {
    if (p.capturedAt) events.push({ at: p.capturedAt, label: "Pago capturado", icon: "paid" });
  }
  for (const f of order.fulfillments) {
    if (f.packedAt) events.push({ at: f.packedAt, label: "Pedido preparado", icon: "packed" });
    if (f.shippedAt) events.push({ at: f.shippedAt, label: "Pedido enviado", icon: "shipped" });
    if (f.deliveredAt)
      events.push({ at: f.deliveredAt, label: "Pedido entregado", icon: "delivered" });
  }
  if (order.canceledAt) {
    events.push({ at: order.canceledAt, label: "Pedido cancelado", icon: "canceled" });
  }
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock size={16} className="text-ui-fg-subtle" /> Historial
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {events.map((e, i) => (
            <li key={`${e.icon}-${i}`} className="flex items-start gap-3">
              <TimelineIcon icon={e.icon} />
              <div className="min-w-0">
                <p className="text-sm text-ui-fg-base leading-tight">{e.label}</p>
                <p className="text-xs text-ui-fg-subtle">{formatOrderDate(e.at)}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function TimelineIcon({ icon }: { icon: TimelineEvent["icon"] }) {
  const cls = "h-4 w-4 shrink-0 mt-0.5";
  switch (icon) {
    case "paid":
      return <CreditCard className={`${cls} text-emerald-600`} />;
    case "packed":
      return <Package className={`${cls} text-blue-600`} />;
    case "shipped":
      return <Truck className={`${cls} text-blue-600`} />;
    case "delivered":
      return <CheckCircle2 className={`${cls} text-emerald-600`} />;
    case "canceled":
      return <XCircle className={`${cls} text-red-600`} />;
    default:
      return <CheckCircle2 className={`${cls} text-ui-fg-subtle`} />;
  }
}
