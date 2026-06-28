"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/medusa";
import { formatPrice } from "@/lib/format";

export default function OrderConfirmationPage({
  params,
}: {
  params: { id: string };
}) {
  const [order, setOrder] = useState<HttpTypes.StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sdk.store.order
      .retrieve(params.id, {
        fields: "*items,*shipping_address,+email,*summary",
      })
      .then(({ order: o }) => setOrder(o))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24 w-full text-center">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
        <CheckCircle2 className="h-9 w-9 text-emerald-500" />
      </div>
      <h1 className="text-3xl font-black tracking-tight text-foreground">
        ¡Gracias por tu compra!
      </h1>
      <p className="text-sm text-muted-foreground mt-3">
        Hemos recibido tu pedido correctamente. Te enviaremos la confirmación
        por email.
      </p>

      {loading ? (
        <div className="mt-10 flex justify-center text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : order ? (
        <div className="mt-10 text-left p-6 bg-card border border-border rounded-2xl">
          <div className="flex justify-between text-sm mb-4 pb-4 border-b border-border">
            <span className="text-muted-foreground">Nº de pedido</span>
            <span className="font-bold text-foreground">
              #{order.display_id ?? params.id.slice(-8)}
            </span>
          </div>
          <ul className="flex flex-col gap-3">
            {(order.items ?? []).map((item) => (
              <li key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground truncate">
                  {item.quantity}× {item.product_title ?? item.title}
                </span>
                <span className="font-medium text-foreground whitespace-nowrap">
                  {formatPrice(item.total ?? 0, order.currency_code ?? "eur")}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between pt-4 mt-4 border-t border-border text-base font-black text-foreground">
            <span>Total</span>
            <span>
              {formatPrice(order.total ?? 0, order.currency_code ?? "eur")}
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-10 text-sm text-muted-foreground">
          Tu referencia de pedido es{" "}
          <span className="font-bold text-foreground">{params.id}</span>.
        </p>
      )}

      <Link
        href="/productos"
        className="mt-10 inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-primary/90 transition-all"
      >
        Seguir comprando
      </Link>
    </div>
  );
}
