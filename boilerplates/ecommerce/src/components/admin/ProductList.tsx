"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Pencil, Trash2, Package, ImageOff, MoreHorizontal } from "lucide-react";
import type { AdminProduct } from "@/lib/tenantApi";
import { formatPrice } from "@/lib/format";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type BadgeVariant = "green" | "amber" | "blue" | "red" | "neutral";

const STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  published: { label: "Publicado", variant: "green" },
  draft: { label: "Borrador", variant: "amber" },
  proposed: { label: "Propuesto", variant: "blue" },
  rejected: { label: "Rechazado", variant: "red" },
};

export function ProductList({ initialProducts }: { initialProducts: AdminProduct[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialProducts;
    return initialProducts.filter((p) => p.title.toLowerCase().includes(q));
  }, [initialProducts, query]);

  async function remove(id: string, title: string) {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "No se pudo eliminar.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          {error}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ui-fg-subtle" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar productos…"
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        {initialProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-8 w-8 text-ui-fg-muted" />
            <p className="mt-3 text-sm text-ui-fg-subtle">
              Aún no tienes productos. Crea el primero con &quot;Nuevo producto&quot;.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ui-fg-subtle">
            Sin resultados para &quot;{query}&quot;.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Producto</TableHead>
                <TableHead className="hidden sm:table-cell">Estado</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const st = STATUS[p.status] || { label: p.status, variant: "neutral" as const };
                return (
                  <TableRow key={p.id} className="group">
                    <TableCell>
                      <Link href={`/admin/productos/${p.id}`} className="flex items-center gap-3">
                        <span className="h-10 w-10 shrink-0 rounded-md border border-ui-border-base bg-ui-bg-component overflow-hidden flex items-center justify-center">
                          {p.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.thumbnail} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ImageOff className="h-4 w-4 text-ui-fg-muted" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-ui-fg-base truncate group-hover:underline">
                            {p.title}
                          </span>
                          {p.description && (
                            <span className="block text-xs text-ui-fg-subtle truncate">
                              {p.description}
                            </span>
                          )}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-ui-fg-base whitespace-nowrap">
                      {p.price != null ? formatPrice(p.price, p.currencyCode) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          disabled={busyId === p.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ui-fg-subtle hover:bg-ui-bg-base-hover hover:text-ui-fg-base focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-border-interactive disabled:opacity-50"
                          aria-label="Acciones"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/productos/${p.id}`}>
                              <Pencil /> Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => remove(p.id, p.title)}
                            className="text-ui-fg-error focus:text-ui-fg-error"
                          >
                            <Trash2 /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
