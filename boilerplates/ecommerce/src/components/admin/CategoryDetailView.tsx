"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  ImageOff,
  Loader2,
  Search,
  FolderTree,
} from "lucide-react";
import type { CategoryDetail, AdminProduct } from "@/lib/tenantApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

const NO_PARENT = "__none__";

const STATUS_LABEL: Record<string, string> = {
  published: "Publicado",
  draft: "Borrador",
  proposed: "Propuesto",
  rejected: "Rechazado",
};

function statusVariant(status: string): "green" | "neutral" | "amber" {
  if (status === "published") return "green";
  if (status === "draft") return "neutral";
  return "amber";
}

export function CategoryDetailView({
  category,
  allProducts,
  allCategories,
}: {
  category: CategoryDetail;
  allProducts: AdminProduct[];
  allCategories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inCategory = useMemo(
    () => new Set(category.products.map((p) => p.id)),
    [category.products]
  );
  const available = useMemo(
    () => allProducts.filter((p) => !inCategory.has(p.id)),
    [allProducts, inCategory]
  );
  // Posibles padres: todas menos ella misma (evita ciclo directo).
  const parentOptions = useMemo(
    () => allCategories.filter((c) => c.id !== category.id),
    [allCategories, category.id]
  );

  async function changeProducts(changes: { add?: string[]; remove?: string[] }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar.");
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar esta categoría? Los productos no se borran.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "No se pudo eliminar.");
      }
      router.push("/admin/categorias");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/categorias"
        className="inline-flex items-center gap-1.5 text-sm text-ui-fg-subtle hover:text-ui-fg-base mb-5"
      >
        <ArrowLeft size={15} /> Categorías
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight truncate">
              {category.name}
            </h1>
            <Badge variant={category.isActive ? "green" : "neutral"}>
              {category.isActive ? "Activa" : "Inactiva"}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ui-fg-subtle">
            {category.handle && <span className="font-mono">/{category.handle}</span>}
            {category.parentName && (
              <span className="inline-flex items-center gap-1">
                <FolderTree size={13} /> {category.parentName}
              </span>
            )}
          </div>
          {category.description && (
            <p className="mt-2 text-sm text-ui-fg-subtle max-w-prose">{category.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Editar detalles
            </DropdownMenuItem>
            <DropdownMenuItem onClick={remove} className="text-ui-fg-error focus:text-ui-fg-error">
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {error && <p className="mb-4 text-sm text-ui-fg-error">{error}</p>}

      {/* Subcategorías */}
      {category.children.length > 0 && (
        <Card className="mb-5 overflow-hidden">
          <CardHeader className="border-b border-ui-border-base">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderTree size={16} className="text-ui-fg-subtle" /> Subcategorías
              <Badge variant="neutral">{category.children.length}</Badge>
            </CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border">
            {category.children.map((ch) => (
              <li key={ch.id} className="px-5 py-3">
                <Link
                  href={`/admin/categorias/${ch.id}`}
                  className="font-medium text-ui-fg-base hover:underline"
                >
                  {ch.name}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Productos */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-ui-border-base">
          <CardTitle className="flex items-center gap-2 text-base">
            Productos <Badge variant="neutral">{category.products.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} disabled={busy}>
            <Plus className="mr-1.5 h-4 w-4" /> Añadir productos
          </Button>
        </CardHeader>

        {category.products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-ui-fg-subtle">Esta categoría aún no tiene productos.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {category.products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <span className="h-10 w-10 shrink-0 rounded-md border border-ui-border-base bg-ui-bg-component overflow-hidden flex items-center justify-center">
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-4 w-4 text-ui-fg-muted" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/productos/${p.id}`}
                    className="block font-medium text-ui-fg-base truncate hover:underline"
                  >
                    {p.title}
                  </Link>
                </div>
                <Badge variant={statusVariant(p.status)}>{STATUS_LABEL[p.status] || p.status}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => changeProducts({ remove: [p.id] })}
                  disabled={busy}
                  title="Quitar de la categoría"
                >
                  <Trash2 className="h-4 w-4 text-ui-fg-subtle" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <EditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        category={category}
        parentOptions={parentOptions}
        onSaved={() => router.refresh()}
      />

      <AddProductsSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        available={available}
        busy={busy}
        onConfirm={async (ids) => {
          const ok = await changeProducts({ add: ids });
          if (ok) setAddOpen(false);
        }}
      />
    </div>
  );
}

// ── Drawer: editar categoría ──
function EditSheet({
  open,
  onOpenChange,
  category,
  parentOptions,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: CategoryDetail;
  parentOptions: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState(category.description || "");
  const [isActive, setIsActive] = useState(category.isActive);
  const [parentId, setParentId] = useState<string>(category.parentId || NO_PARENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description,
        isActive,
        parentId: parentId === NO_PARENT ? null : parentId,
      };
      if (handle.trim()) body.handle = handle.trim();
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar categoría</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="ec-name">Nombre</Label>
            <Input id="ec-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-handle">Handle (opcional)</Label>
            <Input
              id="ec-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="Déjalo vacío para conservarlo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-desc">Descripción</Label>
            <Textarea
              id="ec-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Categoría padre</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Ninguna (categoría raíz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT}>Ninguna (categoría raíz)</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border border-ui-border-base px-3 py-2.5">
            <div>
              <Label className="text-sm">Activa</Label>
              <p className="text-xs text-ui-fg-subtle">Visible en la tienda.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          {error && <p className="text-sm text-ui-fg-error">{error}</p>}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── Drawer: añadir productos (selección múltiple) ──
function AddProductsSheet({
  open,
  onOpenChange,
  available,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  available: AdminProduct[];
  busy: boolean;
  onConfirm: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? available.filter((p) => p.title.toLowerCase().includes(q)) : available;
  }, [available, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) setSelected(new Set());
        onOpenChange(v);
      }}
    >
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Añadir productos</SheetTitle>
        </SheetHeader>

        <div className="relative my-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ui-fg-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos…"
            className="pl-8"
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-ui-fg-subtle">
              No hay productos disponibles para añadir.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className="flex w-full items-center gap-3 py-2.5 text-left"
                    >
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                          checked ? "bg-ui-bg-interactive border-ui-border-interactive" : "border-ui-border-base"
                        }`}
                      >
                        {checked && <span className="h-1.5 w-1.5 rounded-sm bg-ui-fg-on-color" />}
                      </span>
                      <span className="h-9 w-9 shrink-0 rounded-md border border-ui-border-base bg-ui-bg-component overflow-hidden flex items-center justify-center">
                        {p.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageOff className="h-4 w-4 text-ui-fg-muted" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ui-fg-base">{p.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <SheetFooter className="border-t border-ui-border-base pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={busy || selected.size === 0}
          >
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Añadir{selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
