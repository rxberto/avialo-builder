"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import type { PromotionType, PromotionStatus } from "@/lib/tenantApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// Botón + drawer para crear un descuento (estilo Medusa Admin).
export function PromotionCreate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [valueType, setValueType] = useState<PromotionType>("percentage");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<PromotionStatus>("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCode("");
    setValueType("percentage");
    setValue("");
    setStatus("active");
    setError(null);
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
    if (valueType === "percentage" && num > 100) {
      setError("El porcentaje no puede superar 100.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, valueType, value: num, status }),
      });
      const data = (await res.json()) as { promotion?: { id: string }; error?: string };
      if (!res.ok || !data.promotion) {
        throw new Error(data.error || "No se pudo crear el descuento.");
      }
      setOpen(false);
      reset();
      router.push(`/admin/descuentos/${data.promotion.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" /> Crear descuento
      </Button>

      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Crear descuento</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="promo-code">Código</Label>
              <Input
                id="promo-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VERANO10"
                autoFocus
                className="font-mono uppercase"
              />
              <p className="text-xs text-ui-fg-subtle">
                Lo que el cliente escribe al pagar. Se guarda en mayúsculas.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de descuento</Label>
              <Select value={valueType} onValueChange={(v) => setValueType(v as PromotionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                  <SelectItem value="fixed">Importe fijo (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promo-value">
                {valueType === "percentage" ? "Porcentaje" : "Importe (€)"}
              </Label>
              <Input
                id="promo-value"
                type="number"
                inputMode="decimal"
                min="0"
                step={valueType === "percentage" ? "1" : "0.01"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={valueType === "percentage" ? "10" : "5.00"}
              />
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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Crear
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
