"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  ImageOff,
  Loader2,
  Plus,
  X,
  ImagePlus,
  Upload,
} from "lucide-react";
import type {
  ProductDetail,
  ProductRef,
  ProductStatus,
  ProductVariant,
  VariantInput,
  UploadedFile,
} from "@/lib/tenantApi";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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

type BadgeVariant = "green" | "amber" | "blue" | "red" | "neutral";
const STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  published: { label: "Publicado", variant: "green" },
  draft: { label: "Borrador", variant: "amber" },
  proposed: { label: "Propuesto", variant: "blue" },
  rejected: { label: "Rechazado", variant: "red" },
};
const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "published", label: "Publicado" },
  { value: "draft", label: "Borrador" },
  { value: "proposed", label: "Propuesto" },
  { value: "rejected", label: "Rechazado" },
];

type SheetKey = "general" | "media" | "attributes" | "seo" | "organize" | null;

export function ProductDetailView({
  product,
  collections = [],
  categories = [],
  tags = [],
}: {
  product: ProductDetail;
  collections?: ProductRef[];
  categories?: ProductRef[];
  tags?: ProductRef[];
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetKey>(null);
  const [variantEditing, setVariantEditing] = useState<ProductVariant | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const st = STATUS_META[product.status] || { label: product.status, variant: "neutral" as const };

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    setError(null);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({})))?.error || "No se pudo guardar.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function changeStatus(value: string) {
    setStatusBusy(true);
    await patch({ status: value });
    setStatusBusy(false);
  }

  async function remove() {
    if (!confirm(`¿Eliminar "${product.title}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError((await res.json().catch(() => ({})))?.error || "No se pudo eliminar.");
      return;
    }
    router.push("/admin/productos");
    router.refresh();
  }

  return (
    <div className="max-w-5xl">
      {/* Cabecera */}
      <button
        onClick={() => router.push("/admin/productos")}
        className="inline-flex items-center gap-1.5 text-sm text-ui-fg-subtle hover:text-ui-fg-base mb-5"
      >
        <ArrowLeft size={15} /> Productos
      </button>

      {error && (
        <div className="mb-5 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          {error}
        </div>
      )}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight truncate">
              {product.title}
            </h1>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
          {product.subtitle && (
            <p className="text-sm text-ui-fg-subtle mt-1">{product.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-40">
            <Select value={product.status} onValueChange={changeStatus} disabled={statusBusy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-base text-ui-fg-subtle hover:bg-ui-bg-base-hover hover:text-ui-fg-base focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-border-interactive">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSheet("general")}>
                <Pencil /> Editar detalles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={remove} className="text-ui-fg-error focus:text-ui-fg-error">
                <Trash2 /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-5">
          {/* General */}
          <SectionCard title="Detalles" onEdit={() => setSheet("general")}>
            <dl className="divide-y divide-border text-sm">
              <DescRow label="Título" value={product.title} />
              <DescRow label="Subtítulo" value={product.subtitle} />
              <DescRow label="Identificador" value={product.handle} mono />
              <DescRow label="Descripción" value={product.description} />
              <DescRow label="Descuentos" value={product.discountable ? "Permitidos" : "No"} />
            </dl>
          </SectionCard>

          {/* Multimedia */}
          <SectionCard title="Multimedia" onEdit={() => setSheet("media")}>
            {product.thumbnail || product.images.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {[product.thumbnail, ...product.images]
                  .filter((u): u is string => !!u)
                  .map((url, i) => (
                    <div
                      key={i}
                      className="h-20 w-20 rounded-md border border-ui-border-base overflow-hidden bg-ui-bg-component"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
              </div>
            ) : (
              <Empty icon={<ImageOff className="h-5 w-5" />} text="Sin imágenes" />
            )}
          </SectionCard>

          {/* Opciones */}
          {product.options.length > 0 && (
            <SectionCard title="Opciones">
              <div className="space-y-2">
                {product.options.map((o) => (
                  <div key={o.title} className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-ui-fg-base w-28 shrink-0">{o.title}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {o.values.map((v) => (
                        <Badge key={v} variant="neutral">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Variantes */}
          <SectionCard title={`Variantes (${product.variants.length})`} noPadding>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Variante</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Inventario</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.variants.map((v) => (
                  <TableRow key={v.id || v.title}>
                    <TableCell className="font-medium text-ui-fg-base">{v.title}</TableCell>
                    <TableCell className="text-ui-fg-subtle">{v.sku || "—"}</TableCell>
                    <TableCell className="text-right text-ui-fg-subtle">
                      {v.manageInventory ? (v.inventoryQuantity ?? 0) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-ui-fg-base">
                      {v.price != null ? formatPrice(v.price, "eur") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => setVariantEditing(v)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ui-fg-subtle hover:bg-ui-bg-base-hover hover:text-ui-fg-base"
                        aria-label="Editar variante"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </div>

        {/* Columna lateral */}
        <div className="space-y-5">
          {/* Organizar */}
          <SectionCard title="Organizar" onEdit={() => setSheet("organize")}>
            <dl className="divide-y divide-border text-sm">
              <DescRow label="Estado" value={st.label} />
              <DescRow label="Colección" value={product.collectionTitle} />
              <ChipsRow label="Categorías" chips={product.categories.map((c) => c.label)} />
              <ChipsRow label="Etiquetas" chips={product.tagList.map((t) => t.label)} />
            </dl>
          </SectionCard>

          {/* Atributos */}
          <SectionCard title="Atributos" onEdit={() => setSheet("attributes")}>
            <dl className="divide-y divide-border text-sm">
              <DescRow label="Peso" value={product.weight != null ? `${product.weight} g` : null} />
              <DescRow label="Largo" value={product.length != null ? `${product.length} cm` : null} />
              <DescRow label="Alto" value={product.height != null ? `${product.height} cm` : null} />
              <DescRow label="Ancho" value={product.width != null ? `${product.width} cm` : null} />
            </dl>
          </SectionCard>

          {/* SEO */}
          <SectionCard title="SEO" onEdit={() => setSheet("seo")}>
            <dl className="divide-y divide-border text-sm">
              <DescRow label="Título SEO" value={product.seoTitle} />
              <DescRow label="Descripción SEO" value={product.seoDescription} />
            </dl>
          </SectionCard>
        </div>
      </div>

      {/* Drawers */}
      <GeneralSheet
        open={sheet === "general"}
        onClose={() => setSheet(null)}
        product={product}
        onSave={patch}
      />
      <MediaSheet
        open={sheet === "media"}
        onClose={() => setSheet(null)}
        product={product}
        onSave={patch}
      />
      <AttributesSheet
        open={sheet === "attributes"}
        onClose={() => setSheet(null)}
        product={product}
        onSave={patch}
      />
      <SeoSheet open={sheet === "seo"} onClose={() => setSheet(null)} product={product} onSave={patch} />
      <OrganizeSheet
        open={sheet === "organize"}
        onClose={() => setSheet(null)}
        product={product}
        collections={collections}
        categories={categories}
        tags={tags}
        onSave={patch}
      />
      <VariantSheet
        variant={variantEditing}
        onClose={() => setVariantEditing(null)}
        onSave={patch}
      />
    </div>
  );
}

// ── Piezas de presentación ──

function SectionCard({
  title,
  children,
  onEdit,
  noPadding,
}: {
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
  noPadding?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 py-3.5 border-b border-ui-border-base">
        <CardTitle className="text-sm">{title}</CardTitle>
        {onEdit && (
          <button
            onClick={onEdit}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ui-fg-subtle hover:bg-ui-bg-base-hover hover:text-ui-fg-base"
            aria-label="Editar sección"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </CardHeader>
      <CardContent className={cn(noPadding ? "p-0" : "pt-4")}>{children}</CardContent>
    </Card>
  );
}

function DescRow({
  label,
  value,
  mono,
  soon,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  soon?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-ui-fg-subtle shrink-0">{label}</dt>
      <dd className={cn("text-right text-ui-fg-base min-w-0 break-words", mono && "font-mono text-xs")}>
        {soon ? (
          <Badge variant="neutral" className="text-[10px] uppercase">
            Pronto
          </Badge>
        ) : value ? (
          value
        ) : (
          <span className="text-ui-fg-subtle/60">—</span>
        )}
      </dd>
    </div>
  );
}

function ChipsRow({ label, chips }: { label: string; chips: string[] }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-ui-fg-subtle shrink-0">{label}</dt>
      <dd className="min-w-0">
        {chips.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-1.5">
            {chips.map((c) => (
              <Badge key={c} variant="neutral">
                {c}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-ui-fg-subtle/60">—</span>
        )}
      </dd>
    </div>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-ui-fg-muted">
      {icon}
      <span className="mt-2 text-sm">{text}</span>
    </div>
  );
}

// ── Drawers de edición ──

function DrawerShell({
  open,
  onClose,
  title,
  children,
  onSubmit,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">{children}</div>
        <SheetFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const inputLabel = "text-xs font-medium text-ui-fg-subtle";

type SaveFn = (body: Record<string, unknown>) => Promise<boolean>;

function GeneralSheet({
  open,
  onClose,
  product,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  product: ProductDetail;
  onSave: SaveFn;
}) {
  const [title, setTitle] = useState(product.title);
  const [subtitle, setSubtitle] = useState(product.subtitle ?? "");
  const [handle, setHandle] = useState(product.handle);
  const [description, setDescription] = useState(product.description ?? "");
  const [discountable, setDiscountable] = useState(product.discountable);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const ok = await onSave({
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      handle: handle.trim() || null,
      description: description.trim() || null,
      discountable,
    });
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <DrawerShell open={open} onClose={onClose} title="Editar detalles" onSubmit={submit} busy={busy}>
      <div className="space-y-1.5">
        <Label className={inputLabel}>Título</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className={inputLabel}>Subtítulo</Label>
        <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className={inputLabel}>Identificador (handle)</Label>
        <Input value={handle} onChange={(e) => setHandle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className={inputLabel}>Descripción</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
      </div>
      <div className="flex items-center gap-2.5">
        <Switch checked={discountable} onCheckedChange={setDiscountable} id="disc" />
        <Label htmlFor="disc" className="cursor-pointer">
          Permitir descuentos
        </Label>
      </div>
    </DrawerShell>
  );
}

function MediaSheet({
  open,
  onClose,
  product,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  product: ProductDetail;
  onSave: SaveFn;
}) {
  const [thumbnail, setThumbnail] = useState(product.thumbnail ?? "");
  const [images, setImages] = useState<string[]>(product.images);
  const [newImage, setNewImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addImage() {
    const url = newImage.trim();
    if (!url) return;
    setImages((p) => [...p, url]);
    setNewImage("");
  }

  // Sube los archivos elegidos a Medusa y añade sus URLs a la galería.
  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      Array.from(fileList).forEach((f) => form.append("files", f));
      const res = await fetch("/api/admin/uploads", { method: "POST", body: form });
      const data = (await res.json()) as { files?: UploadedFile[]; error?: string };
      if (!res.ok || !data.files) {
        throw new Error(data.error || "No se pudieron subir las imágenes.");
      }
      const urls = data.files.map((f) => f.url);
      // La primera imagen subida se usa como principal si aún no hay.
      setImages((p) => [...p, ...urls]);
      setThumbnail((t) => t || urls[0] || "");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Error inesperado al subir.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function submit() {
    setBusy(true);
    const ok = await onSave({ thumbnail: thumbnail.trim() || null, images });
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <DrawerShell open={open} onClose={onClose} title="Editar multimedia" onSubmit={submit} busy={busy}>
      {/* Subir desde el dispositivo */}
      <div className="space-y-1.5">
        <Label className={inputLabel}>Subir imágenes</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          {uploading ? "Subiendo…" : "Seleccionar imágenes"}
        </Button>
        <p className="text-xs text-ui-fg-subtle">JPG, PNG, WEBP, GIF o AVIF · máx. 5 MB cada una.</p>
        {uploadError && <p className="text-sm text-ui-fg-error">{uploadError}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={inputLabel}>Imagen principal (URL)</Label>
        <Input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="https://…" />
      </div>
      <div className="space-y-1.5">
        <Label className={inputLabel}>Galería</Label>
        <div className="flex gap-2">
          <Input
            value={newImage}
            onChange={(e) => setNewImage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addImage();
              }
            }}
            placeholder="https://… o sube arriba"
          />
          <Button type="button" variant="outline" onClick={addImage} className="shrink-0">
            <ImagePlus /> Añadir
          </Button>
        </div>
        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {images.map((url, i) => (
              <div key={i} className="relative h-20 w-20 rounded-md border border-ui-border-base overflow-hidden bg-ui-bg-component">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black"
                  aria-label="Quitar"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

function AttributesSheet({
  open,
  onClose,
  product,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  product: ProductDetail;
  onSave: SaveFn;
}) {
  const [weight, setWeight] = useState(product.weight != null ? String(product.weight) : "");
  const [length, setLength] = useState(product.length != null ? String(product.length) : "");
  const [height, setHeight] = useState(product.height != null ? String(product.height) : "");
  const [width, setWidth] = useState(product.width != null ? String(product.width) : "");
  const [busy, setBusy] = useState(false);

  const num = (s: string) => {
    const t = s.trim();
    if (t === "") return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  };

  async function submit() {
    setBusy(true);
    const ok = await onSave({
      weight: num(weight),
      length: num(length),
      height: num(height),
      width: num(width),
    });
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <DrawerShell open={open} onClose={onClose} title="Editar atributos" onSubmit={submit} busy={busy}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={inputLabel}>Peso (g)</Label>
          <Input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" min="0" />
        </div>
        <div className="space-y-1.5">
          <Label className={inputLabel}>Largo (cm)</Label>
          <Input value={length} onChange={(e) => setLength(e.target.value)} type="number" min="0" />
        </div>
        <div className="space-y-1.5">
          <Label className={inputLabel}>Alto (cm)</Label>
          <Input value={height} onChange={(e) => setHeight(e.target.value)} type="number" min="0" />
        </div>
        <div className="space-y-1.5">
          <Label className={inputLabel}>Ancho (cm)</Label>
          <Input value={width} onChange={(e) => setWidth(e.target.value)} type="number" min="0" />
        </div>
      </div>
    </DrawerShell>
  );
}

function SeoSheet({
  open,
  onClose,
  product,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  product: ProductDetail;
  onSave: SaveFn;
}) {
  const [seoTitle, setSeoTitle] = useState(product.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(product.seoDescription ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const ok = await onSave({
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
    });
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <DrawerShell open={open} onClose={onClose} title="Editar SEO" onSubmit={submit} busy={busy}>
      <div className="space-y-1.5">
        <Label className={inputLabel}>Título SEO</Label>
        <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className={inputLabel}>Descripción SEO</Label>
        <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} />
      </div>
    </DrawerShell>
  );
}

const NO_COLLECTION = "__none__";

function OrganizeSheet({
  open,
  onClose,
  product,
  collections,
  categories,
  tags,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  product: ProductDetail;
  collections: ProductRef[];
  categories: ProductRef[];
  tags: ProductRef[];
  onSave: SaveFn;
}) {
  const [collectionId, setCollectionId] = useState<string>(product.collectionId ?? NO_COLLECTION);
  const [categoryIds, setCategoryIds] = useState<Set<string>>(
    new Set(product.categories.map((c) => c.id))
  );
  const [tagIds, setTagIds] = useState<Set<string>>(new Set(product.tagList.map((t) => t.id)));
  const [busy, setBusy] = useState(false);

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  async function submit() {
    setBusy(true);
    const ok = await onSave({
      collectionId: collectionId === NO_COLLECTION ? null : collectionId,
      categoryIds: Array.from(categoryIds),
      tagIds: Array.from(tagIds),
    });
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <DrawerShell open={open} onClose={onClose} title="Editar organización" onSubmit={submit} busy={busy}>
      <div className="space-y-1.5">
        <Label className={inputLabel}>Colección</Label>
        <Select value={collectionId} onValueChange={setCollectionId}>
          <SelectTrigger>
            <SelectValue placeholder="Sin colección" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_COLLECTION}>Sin colección</SelectItem>
            {collections.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CheckboxList
        label="Categorías"
        options={categories}
        selected={categoryIds}
        onToggle={(id) => setCategoryIds((s) => toggle(s, id))}
        empty="No has creado categorías todavía."
      />

      <CheckboxList
        label="Etiquetas"
        options={tags}
        selected={tagIds}
        onToggle={(id) => setTagIds((s) => toggle(s, id))}
        empty="No has creado etiquetas todavía."
      />
    </DrawerShell>
  );
}

function CheckboxList({
  label,
  options,
  selected,
  onToggle,
  empty,
}: {
  label: string;
  options: ProductRef[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  empty: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={inputLabel}>{label}</Label>
      {options.length === 0 ? (
        <p className="text-xs text-ui-fg-subtle">{empty}</p>
      ) : (
        <div className="max-h-44 overflow-y-auto rounded-md border border-ui-border-base divide-y divide-border">
          {options.map((o) => {
            const checked = selected.has(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onToggle(o.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-ui-bg-base-hover"
              >
                <span
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded border",
                    checked ? "bg-ui-bg-interactive border-ui-border-interactive" : "border-ui-border-base"
                  )}
                >
                  {checked && <span className="h-1.5 w-1.5 rounded-sm bg-ui-fg-on-color" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-ui-fg-base">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VariantSheet({
  variant,
  onClose,
  onSave,
}: {
  variant: ProductVariant | null;
  onClose: () => void;
  onSave: SaveFn;
}) {
  return variant ? (
    <VariantSheetInner key={variant.id} variant={variant} onClose={onClose} onSave={onSave} />
  ) : null;
}

function VariantSheetInner({
  variant,
  onClose,
  onSave,
}: {
  variant: ProductVariant;
  onClose: () => void;
  onSave: SaveFn;
}) {
  const [price, setPrice] = useState(variant.price != null ? String(variant.price) : "");
  const [sku, setSku] = useState(variant.sku ?? "");
  const [ean, setEan] = useState(variant.ean ?? "");
  const [manageInventory, setManageInventory] = useState(variant.manageInventory);
  const [inventoryQuantity, setInventoryQuantity] = useState(
    variant.inventoryQuantity != null ? String(variant.inventoryQuantity) : ""
  );
  const [allowBackorder, setAllowBackorder] = useState(variant.allowBackorder);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const v: VariantInput = {
      id: variant.id,
      price: price.trim() === "" ? null : parseFloat(price),
      sku: sku.trim() || null,
      ean: ean.trim() || null,
      manageInventory,
      inventoryQuantity:
        manageInventory && inventoryQuantity.trim() !== "" ? parseInt(inventoryQuantity, 10) : null,
      allowBackorder,
    };
    const ok = await onSave({ variants: [v] });
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <DrawerShell open onClose={onClose} title={`Variante · ${variant.title}`} onSubmit={submit} busy={busy}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={inputLabel}>Precio (€)</Label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" min="0" />
        </div>
        <div className="space-y-1.5">
          <Label className={inputLabel}>SKU</Label>
          <Input value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className={inputLabel}>Código de barras (EAN)</Label>
        <Input value={ean} onChange={(e) => setEan(e.target.value)} />
      </div>
      <div className="flex items-center gap-2.5">
        <Switch checked={manageInventory} onCheckedChange={setManageInventory} id="mi" />
        <Label htmlFor="mi" className="cursor-pointer">
          Gestionar inventario
        </Label>
      </div>
      {manageInventory && (
        <>
          <div className="space-y-1.5">
            <Label className={inputLabel}>Stock disponible</Label>
            <Input
              value={inventoryQuantity}
              onChange={(e) => setInventoryQuantity(e.target.value)}
              type="number"
              min="0"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <Switch checked={allowBackorder} onCheckedChange={setAllowBackorder} id="bo" />
            <Label htmlFor="bo" className="cursor-pointer">
              Permitir pedidos sin stock
            </Label>
          </div>
        </>
      )}
    </DrawerShell>
  );
}
