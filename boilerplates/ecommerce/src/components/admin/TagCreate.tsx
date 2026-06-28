"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
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

// Botón + drawer para crear una etiqueta (estilo Medusa Admin).
export function TagCreate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!label.trim()) {
      setError("La etiqueta no puede estar vacía.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() }),
      });
      const data = (await res.json()) as { tag?: { id: string }; error?: string };
      if (!res.ok || !data.tag) {
        throw new Error(data.error || "No se pudo crear la etiqueta.");
      }
      setOpen(false);
      setLabel("");
      router.push(`/admin/etiquetas/${data.tag.id}`);
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
        <Plus className="mr-1.5 h-4 w-4" /> Crear etiqueta
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Crear etiqueta</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="tag-label">Etiqueta</Label>
              <Input
                id="tag-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Oferta"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
              <p className="text-xs text-ui-fg-subtle">
                Una palabra o frase corta para clasificar productos (p. ej. «Novedad», «Rebajas»).
              </p>
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
