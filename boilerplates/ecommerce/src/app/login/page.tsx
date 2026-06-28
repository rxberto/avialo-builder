"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Store, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { businessConfig } from "@/config/business";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Email o contraseña incorrectos.");
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch {
      setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-theme flex-1 flex items-center justify-center py-12 px-4 bg-[hsl(var(--admin-canvas))] text-ui-fg-base">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary mb-4">
            <Store className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-ui-fg-base">Panel de {businessConfig.name}</h1>
          <p className="mt-1.5 text-sm text-ui-fg-subtle">
            Inicia sesión para gestionar tu tienda.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            {error && (
              <div className="mb-5 flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  type="password"
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                Iniciar sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
