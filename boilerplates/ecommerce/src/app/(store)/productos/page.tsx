import { Search } from "lucide-react";
import { listProducts } from "@/lib/store";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { q?: string };
}

export default async function CatalogPage({ searchParams }: Props) {
  const q = searchParams.q?.trim() || undefined;
  const { products, count } = await listProducts({ limit: 24, q });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-border mb-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Catálogo
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {count} {count === 1 ? "producto" : "productos"} disponibles.
          </p>
        </div>

        {/* Buscador (GET → ?q=) */}
        <form
          action="/productos"
          method="get"
          className="flex items-center gap-2 max-w-md w-full border border-border px-3 py-2 rounded-xl bg-muted/30"
        >
          <Search size={16} className="text-muted-foreground" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar productos..."
            className="bg-transparent border-none outline-none text-sm w-full text-foreground"
          />
        </form>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">
            {q
              ? `No encontramos resultados para "${q}".`
              : "Aún no hay productos publicados."}
          </p>
        </div>
      )}
    </div>
  );
}
