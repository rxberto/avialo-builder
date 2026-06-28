import Link from "next/link";
import Image from "next/image";
import type { HttpTypes } from "@medusajs/types";
import { getCheapestPrice } from "@/lib/format";
import { AddToCartButton } from "./AddToCartButton";

export function ProductCard({ product }: { product: HttpTypes.StoreProduct }) {
  const price = getCheapestPrice(product);
  const thumbnail = product.thumbnail || product.images?.[0]?.url || null;
  // Variante por defecto para la compra rápida desde la tarjeta.
  const defaultVariantId = product.variants?.[0]?.id;

  return (
    <div className="group relative flex flex-col bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
      {price?.isSale && (
        <span className="absolute top-3 left-3 z-10 bg-rose-500 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-full">
          Oferta
        </span>
      )}

      <Link
        href={`/producto/${product.handle}`}
        className="relative h-64 w-full bg-muted overflow-hidden block"
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={product.title ?? "Producto"}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Sin imagen
          </div>
        )}
      </Link>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <Link href={`/producto/${product.handle}`}>
            <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-2">
              {product.title}
            </h3>
          </Link>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            {price ? (
              price.isSale ? (
                <>
                  <span className="text-xs text-muted-foreground line-through">
                    {price.original}
                  </span>
                  <span className="text-base font-black text-foreground">
                    {price.calculated}
                  </span>
                </>
              ) : (
                <span className="text-base font-black text-foreground">
                  {price.calculated}
                </span>
              )
            ) : (
              <span className="text-sm text-muted-foreground">Consultar</span>
            )}
          </div>

          {defaultVariantId && <AddToCartButton variantId={defaultVariantId} compact />}
        </div>
      </div>
    </div>
  );
}
