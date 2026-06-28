"use client";

import { useMemo, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { getVariantPrice } from "@/lib/format";
import { AddToCartButton } from "./AddToCartButton";

export function ProductPurchase({
  product,
}: {
  product: HttpTypes.StoreProduct;
}) {
  const variants = product.variants ?? [];
  const [variantId, setVariantId] = useState<string | undefined>(
    variants[0]?.id
  );

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === variantId),
    [variants, variantId]
  );

  const price = getVariantPrice(selectedVariant);
  const inStock =
    !selectedVariant?.manage_inventory ||
    (selectedVariant?.inventory_quantity ?? 0) > 0 ||
    selectedVariant?.allow_backorder;

  return (
    <div className="flex flex-col gap-6">
      {/* Precio */}
      <div className="flex items-baseline gap-3">
        {price ? (
          <>
            <span className="text-3xl font-black text-foreground">
              {price.calculated}
            </span>
            {price.isSale && (
              <span className="text-lg text-muted-foreground line-through">
                {price.original}
              </span>
            )}
          </>
        ) : (
          <span className="text-lg text-muted-foreground">
            Precio bajo consulta
          </span>
        )}
      </div>

      {/* Selector de variante (si hay más de una) */}
      {variants.length > 1 && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Opción
          </label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
                  v.id === variantId
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-foreground hover:border-primary/40"
                }`}
              >
                {v.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Disponibilidad */}
      <p className="text-xs font-medium">
        {inStock ? (
          <span className="text-emerald-600">● En stock</span>
        ) : (
          <span className="text-rose-500">● Agotado</span>
        )}
      </p>

      {variantId && (
        <AddToCartButton
          variantId={variantId}
          disabled={!inStock}
          label={inStock ? "Añadir al carrito" : "Sin stock"}
        />
      )}
    </div>
  );
}
