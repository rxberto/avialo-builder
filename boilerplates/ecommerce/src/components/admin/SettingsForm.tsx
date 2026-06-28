"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Store, CreditCard } from "lucide-react";
import type { StoreSettings } from "@/lib/tenantApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsForm({ settings: initial }: { settings: StoreSettings }) {
  const router = useRouter();
  const [storeName, setStoreName] = useState(initial.storeName);
  const [storeDescription, setStoreDescription] = useState(initial.storeDescription);
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [contactPhone, setContactPhone] = useState(initial.contactPhone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    storeName !== initial.storeName ||
    storeDescription !== initial.storeDescription ||
    contactEmail !== initial.contactEmail ||
    contactPhone !== initial.contactPhone;

  async function submit() {
    if (contactEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail.trim())) {
      setError("El email de contacto no es válido.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, storeDescription, contactEmail, contactPhone }),
      });
      const data = (await res.json()) as { settings?: StoreSettings; error?: string };
      if (!res.ok || !data.settings) throw new Error(data.error || "No se pudo guardar.");
      setSaved(true);
      router.refresh();
      // Oculta el aviso de guardado tras unos segundos.
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Store size={16} className="text-ui-fg-subtle" /> Información de la tienda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="store-name">Nombre de la tienda</Label>
            <Input
              id="store-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Mi Tienda"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="store-desc">Descripción</Label>
            <Textarea
              id="store-desc"
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
              placeholder="Una frase breve sobre tu tienda."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Email de contacto</Label>
            <Input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="hola@mitienda.es"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-phone">Teléfono</Label>
            <Input
              id="contact-phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+34 600 000 000"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard size={16} className="text-ui-fg-subtle" /> Moneda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ui-fg-subtle">Moneda de la tienda</span>
            <Badge variant="neutral" className="uppercase">
              {initial.currencyCode}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-ui-fg-subtle">
            La moneda se configura a nivel de plataforma. Si necesitas cambiarla, contacta con
            soporte.
          </p>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-ui-fg-error">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={saving || !dirty}>
          {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Guardar cambios
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
            <Check size={15} /> Guardado
          </span>
        )}
      </div>
    </div>
  );
}
