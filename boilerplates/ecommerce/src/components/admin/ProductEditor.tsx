"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Plus, X, Trash2, ImagePlus, Upload, ChevronDown } from "lucide-react";
import type {
  ProductDetail,
  ProductStatus,
  VariantInput,
  ProductRichInput,
  UploadedFile,
} from "@/lib/tenantApi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Tipos internos del formulario (strings para los inputs) ──
interface OptionDraft {
  title: string;
  values: string[];
}
interface VariantDraft {
  key: string;
  id?: string;
  options: Record<string, string>;
  price: string;
  sku: string;
  barcode: string;
  ean: string;
  manageInventory: boolean;
  inventoryQuantity: string;
  allowBackorder: boolean;
}

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "published", label: "Publicado" },
  { value: "draft", label: "Borrador" },
  { value: "proposed", label: "Propuesto" },
  { value: "rejected", label: "Rechazado" },
];

const DEFAULT_OPTION_TITLE = "Variante";

function variantKey(options: Record<string, string>): string {
  return Object.keys(options)
    .sort()
    .map((k) => `${k}:${options[k]}`)
    .join("|");
}

function isSimpleProduct(p: ProductDetail): boolean {
  if (p.options.length === 0) return true;
  if (p.options.length === 1) {
    const o = p.options[0];
    return o.title === DEFAULT_OPTION_TITLE && o.values.length <= 1;
  }
  return false;
}

function cartesian(options: OptionDraft[]): Record<string, string>[] {
  const valid = options.filter((o) => o.title.trim() && o.values.filter((v) => v.trim()).length);
  if (valid.length === 0) return [];
  let combos: Record<string, string>[] = [{}];
  for (const o of valid) {
    const next: Record<string, string>[] = [];
    for (const c of combos) {
      for (const v of o.values.filter((x) => x.trim())) {
        next.push({ ...c, [o.title.trim()]: v.trim() });
      }
    }
    combos = next;
  }
  return combos;
}

function emptyVariant(key: string, options: Record<string, string>): VariantDraft {
  return {
    key,
    options,
    price: "",
    sku: "",
    barcode: "",
    ean: "",
    manageInventory: false,
    inventoryQuantity: "",
    allowBackorder: false,
  };
}

export function ProductEditor({
  mode,
  initial,
  productId,
}: {
  mode: "create" | "edit";
  initial?: ProductDetail;
  productId?: string;
}) {
  const router = useRouter();
  const editingSimple = initial ? isSimpleProduct(initial) : true;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [handle, setHandle] = useState(initial?.handle ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<ProductStatus>(
    (initial?.status as ProductStatus) || "published"
  );
  const [discountable, setDiscountable] = useState(initial?.discountable ?? true);

  const [thumbnail, setThumbnail] = useState(initial?.thumbnail ?? "");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [newImage, setNewImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [weight, setWeight] = useState(initial?.weight != null ? String(initial.weight) : "");
  const [length, setLength] = useState(initial?.length != null ? String(initial.length) : "");
  const [height, setHeight] = useState(initial?.height != null ? String(initial.height) : "");
  const [width, setWidth] = useState(initial?.width != null ? String(initial.width) : "");

  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? "");

  const [hasVariants, setHasVariants] = useState<boolean>(initial ? !editingSimple : false);
  const [options, setOptions] = useState<OptionDraft[]>(() => {
    if (initial && !editingSimple) {
      return initial.options.map((o) => ({ title: o.title, values: [...o.values] }));
    }
    return [{ title: "", values: [""] }];
  });
  const [variants, setVariants] = useState<VariantDraft[]>(() => {
    if (initial) {
      return initial.variants.map((v) => ({
        key: variantKey(v.options),
        id: v.id,
        options: v.options,
        price: v.price != null ? String(v.price) : "",
        sku: v.sku ?? "",
        barcode: v.barcode ?? "",
        ean: v.ean ?? "",
        manageInventory: v.manageInventory,
        inventoryQuantity: v.inventoryQuantity != null ? String(v.inventoryQuantity) : "",
        allowBackorder: v.allowBackorder,
      }));
    }
    return [emptyVariant("default", {})];
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const structureLocked = mode === "edit";
  const simpleVariant = variants[0];

  function regenerate(nextOptions: OptionDraft[]) {
    const combos = cartesian(nextOptions);
    setVariants((prev) => {
      const byKey = new Map(prev.map((v) => [v.key, v]));
      if (combos.length === 0) return [emptyVariant("default", {})];
      return combos.map((c) => {
        const key = variantKey(c);
        const existing = byKey.get(key);
        return existing ? { ...existing, options: c } : emptyVariant(key, c);
      });
    });
  }

  function setOptionTitle(i: number, value: string) {
    setOptions((prev) => {
      const next = prev.map((o, idx) => (idx === i ? { ...o, title: value } : o));
      regenerate(next);
      return next;
    });
  }
  function setOptionValues(i: number, raw: string) {
    const values = raw.split(",").map((v) => v.trimStart());
    setOptions((prev) => {
      const next = prev.map((o, idx) => (idx === i ? { ...o, values } : o));
      regenerate(next);
      return next;
    });
  }
  function addOption() {
    setOptions((prev) => [...prev, { title: "", values: [""] }]);
  }
  function removeOption(i: number) {
    setOptions((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      const safe = next.length ? next : [{ title: "", values: [""] }];
      regenerate(safe);
      return safe;
    });
  }

  function setVariantField(key: string, field: keyof VariantDraft, value: string | boolean) {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)));
  }

  function toggleHasVariants(on: boolean) {
    setHasVariants(on);
    if (on) {
      const seedOptions = options.length ? options : [{ title: "", values: [""] }];
      setOptions(seedOptions);
      regenerate(seedOptions);
    } else {
      setVariants((prev) => [
        { ...emptyVariant("default", {}), price: prev[0]?.price ?? "", sku: prev[0]?.sku ?? "" },
      ]);
    }
  }

  function addImage() {
    const url = newImage.trim();
    if (!url) return;
    setImages((prev) => [...prev, url]);
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
      setImages((prev) => [...prev, ...urls]);
      setThumbnail((t) => t || urls[0] || "");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Error inesperado al subir.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function numOrNull(s: string): number | null {
    const t = s.trim();
    if (t === "") return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }
  function intOrNull(s: string): number | null {
    const t = s.trim();
    if (t === "") return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  }

  function buildVariantPayload(): VariantInput[] {
    if (!hasVariants) {
      const v = simpleVariant;
      return [
        {
          ...(v?.id ? { id: v.id } : {}),
          title: "Única",
          options: { [DEFAULT_OPTION_TITLE]: "Única" },
          price: numOrNull(v?.price ?? ""),
          sku: v?.sku.trim() || null,
          barcode: v?.barcode.trim() || null,
          ean: v?.ean.trim() || null,
          manageInventory: v?.manageInventory ?? false,
          inventoryQuantity: v?.manageInventory ? intOrNull(v?.inventoryQuantity ?? "") : null,
          allowBackorder: v?.allowBackorder ?? false,
        },
      ];
    }
    return variants.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      title: Object.values(v.options).join(" / ") || "Variante",
      options: v.options,
      price: numOrNull(v.price),
      sku: v.sku.trim() || null,
      barcode: v.barcode.trim() || null,
      ean: v.ean.trim() || null,
      manageInventory: v.manageInventory,
      inventoryQuantity: v.manageInventory ? intOrNull(v.inventoryQuantity) : null,
      allowBackorder: v.allowBackorder,
    }));
  }

  async function submit() {
    setError(null);
    if (!title.trim()) {
      setError("El nombre del producto es obligatorio.");
      return;
    }
    setBusy(true);
    try {
      const variantPayload = buildVariantPayload();
      const common = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        description: description.trim() || null,
        status,
        discountable,
        thumbnail: thumbnail.trim() || null,
        images,
        weight: numOrNull(weight),
        length: numOrNull(length),
        height: numOrNull(height),
        width: numOrNull(width),
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
      };

      if (mode === "create") {
        const payload: ProductRichInput = {
          ...common,
          handle: handle.trim() || null,
          options: hasVariants
            ? options
                .filter((o) => o.title.trim())
                .map((o) => ({
                  title: o.title.trim(),
                  values: o.values.map((v) => v.trim()).filter(Boolean),
                }))
            : [{ title: DEFAULT_OPTION_TITLE, values: ["Única"] }],
          variants: variantPayload,
        };
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error || "No se pudo crear.");
      } else {
        const payload = {
          ...common,
          handle: handle.trim() || null,
          variants: variantPayload,
        };
        const res = await fetch(`/api/admin/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error || "No se pudo guardar.");
      }
      router.push("/admin/productos");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl pb-16">
      {/* Cabecera */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/productos")}>
          <ArrowLeft /> Productos
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/productos")}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Save />}
            {mode === "create" ? "Crear producto" : "Guardar cambios"}
          </Button>
        </div>
      </div>

      <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight mb-6">
        {mode === "create" ? "Nuevo producto" : title || "Editar producto"}
      </h1>

      {error && (
        <div className="mb-6 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* General */}
        <Section title="General">
          <Field label="Nombre" required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Camiseta de algodón"
            />
          </Field>
          <Field label="Subtítulo">
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Texto corto opcional"
            />
          </Field>
          <Field label="Descripción">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Estado">
              <Select value={status} onValueChange={(v) => setStatus(v as ProductStatus)}>
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
            </Field>
            <Field label="Identificador (handle)">
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="se genera automáticamente"
              />
            </Field>
          </div>
          <div className="flex items-center gap-2.5">
            <Switch id="discountable" checked={discountable} onCheckedChange={setDiscountable} />
            <Label htmlFor="discountable" className="cursor-pointer">
              Permitir descuentos en este producto
            </Label>
          </div>
        </Section>

        {/* Multimedia */}
        <Section title="Multimedia">
          <Field label="Subir imágenes">
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
            <p className="mt-1 text-xs text-ui-fg-subtle">
              JPG, PNG, WEBP, GIF o AVIF · máx. 5 MB cada una.
            </p>
            {uploadError && <p className="mt-1 text-sm text-ui-fg-error">{uploadError}</p>}
          </Field>
          <Field label="Imagen principal (URL)">
            <Input
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Galería de imágenes">
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
                placeholder="https://… y pulsa Añadir"
              />
              <Button type="button" variant="outline" onClick={addImage} className="shrink-0">
                <ImagePlus /> Añadir
              </Button>
            </div>
            {images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {images.map((url, i) => (
                  <div
                    key={i}
                    className="relative h-20 w-20 rounded-md border border-ui-border-base overflow-hidden bg-ui-bg-component"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black"
                      aria-label="Quitar"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>
        </Section>

        {/* Variantes */}
        <Section title="Precio y variantes">
          {!structureLocked && (
            <div className="flex items-center gap-2.5 mb-2">
              <Switch id="hasVariants" checked={hasVariants} onCheckedChange={toggleHasVariants} />
              <Label htmlFor="hasVariants" className="cursor-pointer">
                Este producto tiene variantes (tallas, colores…)
              </Label>
            </div>
          )}
          {structureLocked && (
            <p className="text-xs text-ui-fg-subtle mb-2">
              La estructura de opciones no se puede cambiar tras crear el producto; puedes editar el
              precio, SKU e inventario de cada variante.
            </p>
          )}

          {!hasVariants ? (
            <SimpleVariantFields
              variant={simpleVariant}
              onChange={(field, value) => setVariantField(simpleVariant.key, field, value)}
            />
          ) : (
            <div className="space-y-5">
              {!structureLocked && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ui-fg-subtle">
                    Opciones
                  </p>
                  {options.map((o, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <Input
                        value={o.title}
                        onChange={(e) => setOptionTitle(i, e.target.value)}
                        placeholder="Talla"
                        className="max-w-[10rem]"
                      />
                      <Input
                        value={o.values.join(", ")}
                        onChange={(e) => setOptionValues(i, e.target.value)}
                        placeholder="S, M, L (separadas por comas)"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(i)}
                        className="text-ui-fg-subtle hover:text-ui-fg-error shrink-0"
                        aria-label="Quitar opción"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="link" size="sm" onClick={addOption} className="px-0">
                    <Plus /> Añadir opción
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-ui-fg-subtle">
                  Variantes ({variants.length})
                </p>
                {variants.map((v) => (
                  <div key={v.key} className="rounded-md border border-ui-border-base overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-ui-bg-component/40">
                      <span className="font-medium text-sm text-ui-fg-base flex-1 truncate">
                        {Object.values(v.options).join(" / ") || "Variante"}
                      </span>
                      <div className="w-28">
                        <Input
                          value={v.price}
                          onChange={(e) => setVariantField(v.key, "price", e.target.value)}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Precio €"
                          className="h-8 text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpanded((p) => ({ ...p, [v.key]: !p[v.key] }))}
                        className="p-1.5 text-ui-fg-subtle hover:text-ui-fg-base"
                        aria-label="Más detalles"
                      >
                        <ChevronDown
                          size={16}
                          className={cn("transition-transform", expanded[v.key] && "rotate-180")}
                        />
                      </button>
                    </div>
                    {expanded[v.key] && (
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-ui-border-base">
                        <Field label="SKU">
                          <Input
                            value={v.sku}
                            onChange={(e) => setVariantField(v.key, "sku", e.target.value)}
                          />
                        </Field>
                        <Field label="Código de barras (EAN)">
                          <Input
                            value={v.ean}
                            onChange={(e) => setVariantField(v.key, "ean", e.target.value)}
                          />
                        </Field>
                        <VariantInventoryFields
                          variant={v}
                          onChange={(field, value) => setVariantField(v.key, field, value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Organización */}
        <Section title="Organización y envío">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Peso (g)">
              <Input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" min="0" />
            </Field>
            <Field label="Largo (cm)">
              <Input value={length} onChange={(e) => setLength(e.target.value)} type="number" min="0" />
            </Field>
            <Field label="Alto (cm)">
              <Input value={height} onChange={(e) => setHeight(e.target.value)} type="number" min="0" />
            </Field>
            <Field label="Ancho (cm)">
              <Input value={width} onChange={(e) => setWidth(e.target.value)} type="number" min="0" />
            </Field>
          </div>
        </Section>

        {/* SEO */}
        <Section title="SEO">
          <Field label="Título SEO">
            <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          </Field>
          <Field label="Descripción SEO">
            <Textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={2}
            />
          </Field>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-ui-fg-subtle">
        {label} {required && <span className="text-ui-fg-error">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SimpleVariantFields({
  variant,
  onChange,
}: {
  variant: VariantDraft;
  onChange: (field: keyof VariantDraft, value: string | boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Precio (€)" required>
          <Input
            value={variant?.price ?? ""}
            onChange={(e) => onChange("price", e.target.value)}
            type="number"
            step="0.01"
            min="0"
          />
        </Field>
        <Field label="SKU">
          <Input value={variant?.sku ?? ""} onChange={(e) => onChange("sku", e.target.value)} />
        </Field>
      </div>
      <VariantInventoryFields variant={variant} onChange={onChange} />
    </div>
  );
}

function VariantInventoryFields({
  variant,
  onChange,
}: {
  variant: VariantDraft;
  onChange: (field: keyof VariantDraft, value: string | boolean) => void;
}) {
  return (
    <>
      <div className="sm:col-span-2 flex items-center gap-2.5">
        <Switch
          checked={variant?.manageInventory ?? false}
          onCheckedChange={(c) => onChange("manageInventory", c)}
        />
        <Label className="cursor-pointer">Gestionar inventario</Label>
      </div>
      {variant?.manageInventory && (
        <>
          <Field label="Stock disponible">
            <Input
              value={variant?.inventoryQuantity ?? ""}
              onChange={(e) => onChange("inventoryQuantity", e.target.value)}
              type="number"
              min="0"
            />
          </Field>
          <div className="flex items-end">
            <div className="flex items-center gap-2.5 pb-2">
              <Switch
                checked={variant?.allowBackorder ?? false}
                onCheckedChange={(c) => onChange("allowBackorder", c)}
              />
              <Label className="cursor-pointer">Permitir pedidos sin stock</Label>
            </div>
          </div>
        </>
      )}
    </>
  );
}
