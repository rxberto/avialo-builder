import Link from "next/link";
import { AlertCircle, FolderTree } from "lucide-react";
import { listCategories, storeConfigured, CategorySummary } from "@/lib/tenantApi";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryCreate } from "@/components/admin/CategoryCreate";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  if (!storeConfigured()) {
    return (
      <div className="max-w-lg rounded-xl border border-ui-border-base bg-ui-bg-base p-6 text-sm text-ui-fg-subtle">
        La gestión de la tienda aún no está disponible para este sitio.
      </div>
    );
  }

  let categories: CategorySummary[] = [];
  let count = 0;
  let loadError: string | null = null;
  try {
    const page = await listCategories({ limit: 100 });
    categories = page.categories;
    count = page.count;
  } catch (err) {
    loadError = err instanceof Error ? err.message : "No se pudieron cargar las categorías.";
  }

  // Mapa id→nombre para mostrar el padre de cada categoría.
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight">Categorías</h1>
          <p className="text-sm text-ui-fg-subtle mt-1">
            {count > 0
              ? `${count} categoría${count === 1 ? "" : "s"} en tu tienda.`
              : "Organiza tu catálogo en categorías (admiten subcategorías)."}
          </p>
        </div>
        <CategoryCreate parents={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </div>

      {loadError && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          <AlertCircle className="h-4 w-4 shrink-0" /> {loadError}
        </div>
      )}

      <Card className="overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-12 text-center">
            <FolderTree className="mx-auto h-8 w-8 text-ui-fg-muted" />
            <p className="mt-3 text-sm text-ui-fg-subtle">Aún no tienes categorías.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">Padre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Productos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell>
                    <Link
                      href={`/admin/categorias/${c.id}`}
                      className="font-medium text-ui-fg-base group-hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-ui-fg-subtle">
                    {c.parentId ? nameById.get(c.parentId) || "—" : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? "green" : "neutral"}>
                      {c.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="neutral">{c.productCount}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
