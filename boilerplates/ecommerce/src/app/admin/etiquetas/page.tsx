import Link from "next/link";
import { AlertCircle, Tag as TagIcon } from "lucide-react";
import { listTags, storeConfigured, TagSummary } from "@/lib/tenantApi";
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
import { TagCreate } from "@/components/admin/TagCreate";

export const dynamic = "force-dynamic";

export default async function EtiquetasPage() {
  if (!storeConfigured()) {
    return (
      <div className="max-w-lg rounded-xl border border-ui-border-base bg-ui-bg-base p-6 text-sm text-ui-fg-subtle">
        La gestión de la tienda aún no está disponible para este sitio.
      </div>
    );
  }

  let tags: TagSummary[] = [];
  let count = 0;
  let loadError: string | null = null;
  try {
    const page = await listTags({ limit: 100 });
    tags = page.tags;
    count = page.count;
  } catch (err) {
    loadError = err instanceof Error ? err.message : "No se pudieron cargar las etiquetas.";
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight">Etiquetas</h1>
          <p className="text-sm text-ui-fg-subtle mt-1">
            {count > 0
              ? `${count} etiqueta${count === 1 ? "" : "s"} en tu tienda.`
              : "Clasifica tus productos con etiquetas (p. ej. «Novedad», «Rebajas»)."}
          </p>
        </div>
        <TagCreate />
      </div>

      {loadError && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          <AlertCircle className="h-4 w-4 shrink-0" /> {loadError}
        </div>
      )}

      <Card className="overflow-hidden">
        {tags.length === 0 ? (
          <div className="p-12 text-center">
            <TagIcon className="mx-auto h-8 w-8 text-ui-fg-muted" />
            <p className="mt-3 text-sm text-ui-fg-subtle">Aún no tienes etiquetas.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Etiqueta</TableHead>
                <TableHead className="text-center">Productos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map((t) => (
                <TableRow key={t.id} className="group">
                  <TableCell>
                    <Link href={`/admin/etiquetas/${t.id}`} className="inline-flex">
                      <Badge variant="neutral" className="group-hover:bg-ui-bg-base-hover">
                        <TagIcon className="mr-1 h-3 w-3" /> {t.label}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="text-center text-ui-fg-subtle">{t.productCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
