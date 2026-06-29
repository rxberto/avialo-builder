"use client";

import { useState } from "react";
import { UserCircle, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/admin/PasswordInput";

interface AccountCardProps {
  me: { id: string; name: string; email: string };
}

// "Mi cuenta": el administrador que ha iniciado sesión cambia su propio nombre y contraseña.
// No toca el rol (eso se gestiona en la tabla y nunca sobre uno mismo).
export function AccountCard({ me }: AccountCardProps) {
  const [name, setName] = useState(me.name);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setDone(null);
    try {
      const body: Record<string, unknown> = { name };
      if (password) body.password = password;
      const res = await fetch(`/api/admin/users/${me.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "No se pudo guardar.");
      setPassword("");
      setDone(
        password
          ? "Cuenta actualizada. Tu nueva contraseña ya está activa."
          : "Cuenta actualizada."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="h-4 w-4" /> Mi cuenta
        </CardTitle>
        <CardDescription className="mt-1">
          Tus datos de acceso al panel. El correo ({me.email}) es tu identidad y no se cambia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-3 py-2 txt-small text-ui-fg-error">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 rounded-md border border-ui-tag-green-border bg-ui-tag-green-bg px-3 py-2 txt-small text-ui-tag-green-text">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {done}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="me-name">Nombre</Label>
              <Input
                id="me-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="me-email">Correo</Label>
              <Input id="me-email" value={me.email} disabled />
            </div>
          </div>

          <PasswordInput
            id="me-password"
            label="Nueva contraseña"
            value={password}
            onChange={setPassword}
            placeholder="Dejar en blanco para no cambiarla"
            optionalHint="Déjala en blanco si no quieres cambiar tu contraseña."
          />

          <div>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar cambios
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
