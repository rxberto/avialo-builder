import Link from "next/link";
import { AlertCircle, Plus } from "lucide-react";
import { listProducts, storeConfigured, AdminProduct } from "@/lib/tenantApi";
import { ProductList } from "@/components/admin/ProductList";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  if (!storeConfigured()) {
    return (
      <div className="max-w-lg rounded-2xl border border-ui-border-base bg-ui-bg-base p-6 text-sm text-ui-fg-subtle">
        La gestión de la tienda aún no está disponible para este sitio.
      </div>
    );
  }

  let products: AdminProduct[] = [];
  let loadError: string | null = null;
  try {
    products = await listProducts();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "No se pudieron cargar los productos.";
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight">Productos</h1>
          <p className="text-sm text-ui-fg-subtle mt-1">
            Gestiona el catálogo de tu tienda: variantes, precios, inventario y más.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/productos/nuevo">
            <Plus /> Nuevo producto
          </Link>
        </Button>
      </div>

      {loadError && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          <AlertCircle className="h-4 w-4 shrink-0" /> {loadError}
        </div>
      )}

      <ProductList initialProducts={products} />
    </div>
  );
}
