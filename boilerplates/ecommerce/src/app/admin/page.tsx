import Link from "next/link";
import { Package, Plus, ShoppingCart, Eye, EyeOff } from "lucide-react";
import { listProducts, storeConfigured, AdminProduct } from "@/lib/tenantApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// Panel de inicio: resumen rápido de la tienda (estilo dashboard de Medusa).
export default async function AdminHome() {
  let products: AdminProduct[] = [];
  let loadError: string | null = null;
  if (storeConfigured()) {
    try {
      products = await listProducts();
    } catch (err) {
      loadError = err instanceof Error ? err.message : "No se pudieron cargar los datos.";
    }
  }

  const total = products.length;
  const published = products.filter((p) => p.status === "published").length;
  const drafts = total - published;

  const stats = [
    { label: "Productos", value: total, icon: Package },
    { label: "Publicados", value: published, icon: Eye },
    { label: "Borradores", value: drafts, icon: EyeOff },
  ];

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight">Inicio</h1>
        <p className="text-sm text-ui-fg-subtle mt-1">Un vistazo rápido a tu tienda.</p>
      </div>

      {loadError && (
        <div className="rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-ui-fg-subtle">{s.label}</CardTitle>
                <Icon className="h-4 w-4 text-ui-fg-subtle" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-ui-fg-base">{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones rápidas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/admin/productos/nuevo">
              <Plus /> Nuevo producto
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/productos">
              <Package /> Ver productos
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/pedidos">
              <ShoppingCart /> Pedidos
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
