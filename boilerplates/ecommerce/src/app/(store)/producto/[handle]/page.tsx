import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProductByHandle } from "@/lib/store";
import { ProductPurchase } from "@/components/ProductPurchase";

export const dynamic = "force-dynamic";

interface Props {
  params: { handle: string };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductByHandle(params.handle);
  if (!product) notFound();

  const images =
    product.images?.length
      ? product.images
      : product.thumbnail
        ? [{ id: "thumb", url: product.thumbnail }]
        : [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
      <Link
        href="/productos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft size={15} /> Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Galería */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-square w-full bg-muted rounded-3xl overflow-hidden border border-border">
            {images[0] ? (
              <Image
                src={images[0].url}
                alt={product.title ?? "Producto"}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                Sin imagen
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.slice(0, 4).map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square bg-muted rounded-xl overflow-hidden border border-border"
                >
                  <Image
                    src={img.url}
                    alt={product.title ?? "Producto"}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compra */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            {product.title}
          </h1>
          {product.description && (
            <p className="text-sm sm:text-base text-muted-foreground mt-5 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}

          <div className="mt-8">
            <ProductPurchase product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
