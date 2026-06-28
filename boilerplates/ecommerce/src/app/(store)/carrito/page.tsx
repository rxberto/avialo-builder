"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, X, Loader2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { toVisiblePromoCode } from "@/lib/promoCode";

export default function CartPage() {
  const { cart, updateItem, removeItem, applyPromo, removePromo, loading } = useCart();
  const items = cart?.items ?? [];
  const currency = cart?.currency_code ?? "eur";
  const promotions = cart?.promotions ?? [];
  const discountTotal = cart?.discount_total ?? 0;

  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

  async function submitPromo() {
    if (!promoInput.trim()) return;
    setPromoBusy(true);
    setPromoError(null);
    const res = await applyPromo(promoInput);
    setPromoBusy(false);
    if (res.ok) {
      setPromoInput("");
    } else {
      setPromoError(res.error ?? "No se pudo aplicar el código.");
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center w-full">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
          <ShoppingBag className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">
          Tu carrito está vacío
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Añade productos para continuar con tu compra.
        </p>
        <Link
          href="/productos"
          className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-xl shadow-lg hover:bg-primary/90 transition-all text-sm"
        >
          Ver catálogo <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 w-full">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mb-10">
        Tu carrito
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Líneas */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 bg-card border border-border rounded-2xl"
            >
              <div className="relative h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-muted border border-border">
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt={item.product_title ?? item.title ?? "Producto"}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : null}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-foreground truncate">
                  {item.product_title ?? item.title}
                </h3>
                {item.variant_title && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.variant_title}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatPrice(item.unit_price ?? 0, currency)} / ud.
                </p>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center border border-border rounded-lg">
                    <button
                      onClick={() =>
                        updateItem(item.id, Math.max(1, (item.quantity ?? 1) - 1))
                      }
                      disabled={loading}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
                      aria-label="Reducir"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-3 text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateItem(item.id, (item.quantity ?? 1) + 1)}
                      disabled={loading}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
                      aria-label="Aumentar"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={loading}
                    className="p-1.5 text-muted-foreground hover:text-rose-500 disabled:opacity-50"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="text-sm font-black text-foreground whitespace-nowrap">
                {formatPrice(item.total ?? 0, currency)}
              </div>
            </div>
          ))}
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 p-6 bg-card border border-border rounded-2xl">
            <h2 className="font-bold text-foreground mb-4">Resumen</h2>

            {/* Cupón de descuento */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value);
                    setPromoError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitPromo();
                    }
                  }}
                  placeholder="Código de descuento"
                  className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={submitPromo}
                  disabled={promoBusy || !promoInput.trim()}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                >
                  {promoBusy ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
                  Aplicar
                </button>
              </div>
              {promoError && <p className="mt-1.5 text-xs text-rose-500">{promoError}</p>}
              {promotions.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {promotions.map((p) => (
                    <li
                      key={p.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 pl-2.5 pr-1.5 py-0.5 text-xs font-semibold"
                    >
                      <Tag size={11} /> {toVisiblePromoCode(p.code ?? "")}
                      <button
                        onClick={() => removePromo(p.code ?? "")}
                        disabled={loading}
                        className="rounded-full p-0.5 hover:bg-emerald-100"
                        aria-label="Quitar cupón"
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd>{formatPrice(cart?.item_subtotal ?? 0, currency)}</dd>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <dt>Descuento</dt>
                  <dd>- {formatPrice(discountTotal, currency)}</dd>
                </div>
              )}
              {(cart?.shipping_total ?? 0) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <dt>Envío</dt>
                  <dd>{formatPrice(cart?.shipping_total ?? 0, currency)}</dd>
                </div>
              )}
              {(cart?.tax_total ?? 0) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <dt>Impuestos</dt>
                  <dd>{formatPrice(cart?.tax_total ?? 0, currency)}</dd>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-border text-base font-black text-foreground">
                <dt>Total</dt>
                <dd>{formatPrice(cart?.total ?? 0, currency)}</dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-xl shadow-lg hover:bg-primary/90 transition-all text-sm"
            >
              Finalizar compra <ArrowRight size={16} />
            </Link>
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              Pago seguro con Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
