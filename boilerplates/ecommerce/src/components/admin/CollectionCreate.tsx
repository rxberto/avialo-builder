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

// Botón + drawer para crear una colección (estilo Medusa Admin).
export function CollectionCreate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), handle: handle.trim() || undefined }),
      });
      const data = (await res.json()) as { collection?: { id: string }; error?: string };
      if (!res.ok || !data.collection) {
        throw new Error(data.error || "No se pudo crear la colección.");
      }
      setOpen(false);
      setTitle("");
      setHandle("");
      router.push(`/admin/colecciones/${data.collection.id}`);
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
        <Plus className="mr-1.5 h-4 w-4" /> Crear colección
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Crear colección</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="col-title">Título</Label>
              <Input
                id="col-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Verano 2026"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="col-handle">Handle (opcional)</Label>
              <Input
                id="col-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="verano-2026"
              />
              <p className="text-xs text-ui-fg-subtle">
                Identificador para la URL. Si lo dejas vacío se genera del título.
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
