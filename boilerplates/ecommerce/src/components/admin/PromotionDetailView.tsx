"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Pencil, Trash2, Loader2, Ticket } from "lucide-react";
import type { PromotionDetail, PromotionStatus } from "@/lib/tenantApi";
import { promoStatusMeta, promoTypeLabel, promotionValueLabel } from "@/lib/promoLabels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function PromotionDetailView({ promotion: initial }: { promotion: PromotionDetail }) {
  const router = useRouter();
  const [promotion, setPromotion] = useState<PromotionDetail>(initial);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const st = promoStatusMeta(promotion.status);

  async function remove() {
    if (!confirm("¿Eliminar este descuento? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/promotions/${promotion.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo eliminar.");
      router.push("/admin/descuentos");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/descuentos"
        className="inline-flex items-center gap-1.5 text-sm text-ui-fg-subtle hover:text-ui-fg-base mb-5"
      >
        <ArrowLeft size={15} /> Descuentos
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-ui-border-base bg-ui-bg-component">
            <Ticket size={18} className="text-ui-fg-subtle" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight font-mono">
              {promotion.code}
            </h1>
            <p className="text-sm text-ui-fg-subtle mt-0.5">
              {promoTypeLabel(promotion.valueType)} · {promotionValueLabel(promotion)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={st.variant}>{st.label}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil size={15} className="mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={remove}
              >
                <Trash2 size={15} className="mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 text-sm">
          <Row label="Código" value={promotion.code} mono />
          <Row label="Tipo" value={promoTypeLabel(promotion.valueType)} />
          <Row label="Valor" value={promotionValueLabel(promotion)} />
          <Row label="Estado" value={st.label} />
          <Row label="Aplicación" value="Al total del pedido" />
        </CardContent>
      </Card>

      <EditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        promotion={promotion}
        onSaved={(p) => {
          setPromotion(p);
          router.refresh();
        }}
      />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ui-fg-subtle">{label}</span>
      <span className={`text-ui-fg-base ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function EditSheet({
  open,
  onOpenChange,
  promotion,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  promotion: PromotionDetail;
  onSaved: (p: PromotionDetail) => void;
}) {
  const [code, setCode] = useState(promotion.code);
  const [value, setValue] = useState(String(promotion.value));
  const [status, setStatus] = useState<PromotionStatus>(promotion.status as PromotionStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resincroniza el formulario cada vez que se abre el drawer.
  function handleOpen(o: boolean) {
    if (o) {
      setCode(promotion.code);
      setValue(String(promotion.value));
      setStatus(promotion.status as PromotionStatus);
      setError(null);
    }
    onOpenChange(o);
  }

  async function submit() {
    const trimmed = code.trim();
    const num = parseFloat(value);
    if (!trimmed) {
      setError("El código no puede estar vacío.");
      return;
    }
    if (!Number.isFinite(num) || num <= 0) {
      setError("Indica un valor mayor que 0.");
      return;
    }
    if (promotion.valueType === "percentage" && num > 100) {
      setError("El porcentaje no puede superar 100.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/promotions/${promotion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, value: num, status }),
      });
      const data = (await res.json()) as { promotion?: PromotionDetail; error?: string };
      if (!res.ok || !data.promotion) throw new Error(data.error || "No se pudo guardar.");
      onSaved(data.promotion);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Editar descuento</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-code">Código</Label>
            <Input
              id="edit-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-value">
              {promotion.valueType === "percentage" ? "Porcentaje" : "Importe (€)"}
            </Label>
            <Input
              id="edit-value"
              type="number"
              inputMode="decimal"
              min="0"
              step={promotion.valueType === "percentage" ? "1" : "0.01"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <p className="text-xs text-ui-fg-subtle">
              No se puede cambiar el tipo de descuento; crea uno nuevo si lo necesitas.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as PromotionStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-ui-fg-error">{error}</p>}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
