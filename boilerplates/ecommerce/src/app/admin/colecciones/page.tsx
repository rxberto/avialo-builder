import Link from "next/link";
import { AlertCircle, Layers } from "lucide-react";
import { listCollections, storeConfigured, CollectionSummary } from "@/lib/tenantApi";
import { formatOrderDate } from "@/lib/orderLabels";
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
import { CollectionCreate } from "@/components/admin/CollectionCreate";

export const dynamic = "force-dynamic";

export default async function ColeccionesPage() {
  if (!storeConfigured()) {
    return (
      <div className="max-w-lg rounded-xl border border-ui-border-base bg-ui-bg-base p-6 text-sm text-ui-fg-subtle">
        La gestión de la tienda aún no está disponible para este sitio.
      </div>
    );
  }

  let collections: CollectionSummary[] = [];
  let count = 0;
  let loadError: string | null = null;
  try {
    const page = await listCollections({ limit: 50 });
    collections = page.collections;
    count = page.count;
  } catch (err) {
    loadError = err instanceof Error ? err.message : "No se pudieron cargar las colecciones.";
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight">Colecciones</h1>
          <p className="text-sm text-ui-fg-subtle mt-1">
            {count > 0
              ? `${count} colección${count === 1 ? "" : "es"} en tu tienda.`
              : "Agrupa tus productos en colecciones (p. ej. «Verano», «Ofertas»)."}
          </p>
        </div>
        <CollectionCreate />
      </div>

      {loadError && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          <AlertCircle className="h-4 w-4 shrink-0" /> {loadError}
        </div>
      )}

      <Card className="overflow-hidden">
        {collections.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="mx-auto h-8 w-8 text-ui-fg-muted" />
            <p className="mt-3 text-sm text-ui-fg-subtle">Aún no tienes colecciones.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Título</TableHead>
                <TableHead className="hidden sm:table-cell">Handle</TableHead>
                <TableHead className="text-center">Productos</TableHead>
                <TableHead className="hidden md:table-cell">Creada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell>
                    <Link
                      href={`/admin/colecciones/${c.id}`}
                      className="font-medium text-ui-fg-base group-hover:underline"
                    >
                      {c.title}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-ui-fg-subtle font-mono text-xs truncate max-w-[200px]">
                    {c.handle || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="neutral">{c.productCount}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-ui-fg-subtle whitespace-nowrap">
                    {formatOrderDate(c.createdAt)}
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
