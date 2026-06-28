import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrder, getStoreSettings, OrderDetail, StoreSettings } from "@/lib/tenantApi";
import { businessConfig } from "@/config/business";
import { formatPrice } from "@/lib/format";
import { formatOrderDate } from "@/lib/orderLabels";
import { paymentBadge } from "@/lib/orderLabels";
import { PrintButton } from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

// Número de factura legible a partir del nº de pedido (FAC-00001).
function invoiceNumber(displayId: number | null): string {
  return `FAC-${String(displayId ?? 0).padStart(5, "0")}`;
}

export default async function FacturaPage({ params }: { params: { id: string } }) {
  // Detrás de auth: solo el dueño (admin) puede generar facturas.
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/login");

  let order: OrderDetail;
  try {
    order = await getOrder(params.id);
  } catch {
    notFound();
  }

  // Datos del vendedor: ajustes de la tienda (Medusa) con fallback a businessConfig.
  let settings: StoreSettings | null = null;
  try {
    settings = await getStoreSettings();
  } catch {
    settings = null;
  }
  const sellerName = settings?.storeName || businessConfig.name;
  const sellerEmail = settings?.contactEmail || businessConfig.contact.email;
  const sellerPhone = settings?.contactPhone || businessConfig.contact.phone;
  const sellerCif = businessConfig.cif;

  const currency = order.currencyCode;
  const addr = order.shippingAddress;
  const pay = paymentBadge(order.paymentStatus);

  return (
    <div className="invoice-root min-h-screen bg-neutral-100 py-8 print:bg-white print:py-0">
      {/* Barra de acciones (no se imprime) */}
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4 print:hidden">
        <a href={`/admin/pedidos/${order.id}`} className="text-sm text-neutral-600 hover:text-neutral-900">
          ← Volver al pedido
        </a>
        <PrintButton />
      </div>

      {/* Hoja A4 */}
      <div className="mx-auto max-w-[210mm] bg-white p-[18mm] text-neutral-800 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-8 border-b border-neutral-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{sellerName}</h1>
            <div className="mt-1.5 text-xs leading-relaxed text-neutral-500">
              {sellerCif && <p>CIF: {sellerCif}</p>}
              {sellerEmail && <p>{sellerEmail}</p>}
              {sellerPhone && <p>{sellerPhone}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold uppercase tracking-widest text-neutral-400">Factura</p>
            <p className="mt-1 font-mono text-sm font-semibold text-neutral-900">
              {invoiceNumber(order.displayId)}
            </p>
            <p className="text-xs text-neutral-500">{formatOrderDate(order.createdAt)}</p>
          </div>
        </div>

        {/* Cliente */}
        <div className="grid grid-cols-2 gap-8 py-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Facturar a
            </p>
            <p className="mt-1.5 font-medium text-neutral-900">
              {order.customerName || addr?.name || "Cliente"}
            </p>
            <div className="text-xs leading-relaxed text-neutral-500">
              {order.email && <p>{order.email}</p>}
              {addr?.line1 && <p>{addr.line1}</p>}
              {addr?.line2 && <p>{addr.line2}</p>}
              {(addr?.postalCode || addr?.city) && (
                <p>{[addr?.postalCode, addr?.city].filter(Boolean).join(" ")}</p>
              )}
              {addr?.province && <p>{addr.province}</p>}
              {addr?.countryCode && <p className="uppercase">{addr.countryCode}</p>}
              {addr?.phone && <p>Tel. {addr.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Pedido
            </p>
            <p className="mt-1.5 font-medium text-neutral-900">#{order.displayId ?? "—"}</p>
            <p className="text-xs text-neutral-500">Estado de pago: {pay.label}</p>
          </div>
        </div>

        {/* Líneas */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-[11px] uppercase tracking-wider text-neutral-400">
              <th className="py-2 font-semibold">Concepto</th>
              <th className="py-2 text-center font-semibold">Cant.</th>
              <th className="py-2 text-right font-semibold">Precio</th>
              <th className="py-2 text-right font-semibold">Importe</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id} className="border-b border-neutral-100">
                <td className="py-2.5 pr-4">
                  <span className="font-medium text-neutral-900">{it.title}</span>
                  {it.variantTitle && it.variantTitle !== it.title && (
                    <span className="block text-xs text-neutral-500">{it.variantTitle}</span>
                  )}
                  {it.sku && <span className="block text-xs text-neutral-400">{it.sku}</span>}
                </td>
                <td className="py-2.5 text-center text-neutral-600">{it.quantity}</td>
                <td className="py-2.5 text-right text-neutral-600">
                  {formatPrice(it.unitPrice, currency)}
                </td>
                <td className="py-2.5 text-right font-medium text-neutral-900">
                  {formatPrice(it.total, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="mt-6 flex justify-end">
          <dl className="w-64 space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatPrice(order.subtotal, currency)} />
            {order.discountTotal > 0 && (
              <Row label="Descuento" value={`- ${formatPrice(order.discountTotal, currency)}`} />
            )}
            <Row label="Envío" value={formatPrice(order.shippingTotal, currency)} />
            <Row label="Impuestos (incl.)" value={formatPrice(order.taxTotal, currency)} />
            <div className="flex items-center justify-between border-t border-neutral-300 pt-2 text-base font-bold text-neutral-900">
              <dt>Total</dt>
              <dd>{formatPrice(order.total, currency)}</dd>
            </div>
          </dl>
        </div>

        {/* Pie */}
        <div className="mt-12 border-t border-neutral-200 pt-4 text-center text-[11px] text-neutral-400">
          <p>Gracias por tu compra en {sellerName}.</p>
          <p>Factura generada el {formatOrderDate(new Date().toISOString())}.</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-neutral-600">
      <dt>{label}</dt>
      <dd className="text-neutral-900">{value}</dd>
    </div>
  );
}
