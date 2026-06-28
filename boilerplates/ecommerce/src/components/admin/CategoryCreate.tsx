"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

const NO_PARENT = "__none__";

// Botón + drawer para crear una categoría (estilo Medusa Admin, con padre opcional).
export function CategoryCreate({ parents }: { parents: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>(NO_PARENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          handle: handle.trim() || undefined,
          description: description.trim() || undefined,
          parentId: parentId === NO_PARENT ? null : parentId,
        }),
      });
      const data = (await res.json()) as { category?: { id: string }; error?: string };
      if (!res.ok || !data.category) {
        throw new Error(data.error || "No se pudo crear la categoría.");
      }
      setOpen(false);
      setName("");
      setHandle("");
      setDescription("");
      setParentId(NO_PARENT);
      router.push(`/admin/categorias/${data.category.id}`);
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
        <Plus className="mr-1.5 h-4 w-4" /> Crear categoría
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Crear categoría</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nombre</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Camisetas"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-handle">Handle (opcional)</Label>
              <Input
                id="cat-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="camisetas"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Descripción (opcional)</Label>
              <Textarea
                id="cat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría padre (opcional)</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Ninguna (categoría raíz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>Ninguna (categoría raíz)</SelectItem>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
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
