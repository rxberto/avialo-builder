"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Landmark,
  Plug,
} from "lucide-react";
import type { PaymentSettings, PaymentProvider } from "@/lib/tenantApi";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// Panel dedicado de Pagos: el dueño elige y configura su pasarela (Stripe Connect, Redsys, …).
// Solo una pasarela activa a la vez (la que usa el checkout de la tienda).
export function PaymentsPanel() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // acción en curso

  // Formulario Redsys.
  const [redsys, setRedsys] = useState({
    merchantCode: "",
    terminal: "001",
    environment: "test" as "test" | "live",
    secretKey: "",
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/payments/settings");
      if (!res.ok) throw new Error((await res.json()).error || "No se pudo cargar la configuración de pagos.");
      const s = (await res.json()).settings as PaymentSettings;
      setSettings(s);
      setRedsys((prev) => ({
        ...prev,
        merchantCode: s.redsys.merchantCode || prev.merchantCode,
        terminal: s.redsys.terminal || prev.terminal,
        environment: s.redsys.environment || prev.environment,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar pagos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function post(path: string, body?: unknown): Promise<unknown> {
    const res = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error((await res.json()).error || "La acción no se pudo completar.");
    return res.json();
  }

  async function activate(provider: PaymentProvider) {
    setBusy(`activate-${provider}`);
    setError(null);
    try {
      const data = (await post("/api/admin/payments/provider", { provider })) as { settings: PaymentSettings };
      setSettings(data.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar.");
    } finally {
      setBusy(null);
    }
  }

  async function connectStripe() {
    setBusy("stripe-connect");
    setError(null);
    try {
      const data = (await post("/api/admin/payments/connect")) as { url: string };
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo conectar.");
      setBusy(null);
    }
  }

  async function openDashboard() {
    setBusy("stripe-dashboard");
    setError(null);
    try {
      const data = (await post("/api/admin/payments/dashboard")) as { url: string };
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el panel.");
    } finally {
      setBusy(null);
    }
  }

  async function saveRedsys(e: React.FormEvent) {
    e.preventDefault();
    setBusy("redsys-save");
    setError(null);
    try {
      const data = (await post("/api/admin/payments/redsys", redsys)) as { settings: PaymentSettings };
      setSettings(data.settings);
      setRedsys((prev) => ({ ...prev, secretKey: "" })); // no retener el secreto en memoria
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar Redsys.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ui-fg-subtle">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuración de pagos…
      </div>
    );
  }

  const active = settings?.activeProvider ?? "none";
  const stripe = settings?.stripe;
  const redsysCfg = settings?.redsys;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {active === "none" && (
        <div className="flex items-center gap-2 rounded-md border border-ui-border-base bg-ui-bg-subtle px-4 py-3 text-sm text-ui-fg-subtle">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Tu tienda todavía no tiene una pasarela de pago activa. Configura y activa una para
          empezar a cobrar.
        </div>
      )}

      {/* ── Stripe Connect ── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Stripe
              </CardTitle>
              <CardDescription className="mt-1">
                Tarjeta, Apple Pay y Google Pay. El dinero llega directo a tu cuenta de Stripe; no
                compartes claves con nosotros.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {active === "stripe" && <Badge variant="green">Activa</Badge>}
              <Badge variant={stripe?.chargesEnabled ? "green" : stripe?.connected ? "amber" : "neutral"}>
                {stripe?.chargesEnabled ? "Lista" : stripe?.connected ? "Pendiente" : "Sin conectar"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {stripe?.chargesEnabled ? (
              <>
                <span className="flex items-center gap-2 text-sm text-ui-fg-base">
                  <CheckCircle2 className="h-4 w-4 text-ui-fg-interactive" /> Conectada y verificada.
                </span>
                <Button variant="secondary" size="sm" onClick={openDashboard} disabled={!!busy}>
                  {busy === "stripe-dashboard" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Ver mis cobros
                </Button>
                {active !== "stripe" && (
                  <Button size="sm" onClick={() => activate("stripe")} disabled={!!busy}>
                    {busy === "activate-stripe" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Activar Stripe
                  </Button>
                )}
              </>
            ) : (
              <Button size="sm" onClick={connectStripe} disabled={!!busy}>
                {busy === "stripe-connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {stripe?.connected ? "Completar configuración" : "Conectar con Stripe"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Redsys ── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-4 w-4" /> Redsys (TPV bancario)
              </CardTitle>
              <CardDescription className="mt-1">
                El TPV virtual de tu banco español. Necesitas tu código de comercio (FUC), terminal
                y clave secreta SHA-256. Tu clave se guarda cifrada.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {active === "redsys" && <Badge variant="green">Activa</Badge>}
              <Badge variant={redsysCfg?.configured ? "green" : "neutral"}>
                {redsysCfg?.configured ? "Configurada" : "Sin configurar"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveRedsys} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rs-merchant">Código de comercio (FUC)</Label>
                <Input
                  id="rs-merchant"
                  value={redsys.merchantCode}
                  onChange={(e) => setRedsys({ ...redsys, merchantCode: e.target.value })}
                  placeholder="999008881"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rs-terminal">Terminal</Label>
                <Input
                  id="rs-terminal"
                  value={redsys.terminal}
                  onChange={(e) => setRedsys({ ...redsys, terminal: e.target.value })}
                  placeholder="001"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rs-env">Entorno</Label>
                <Select
                  value={redsys.environment}
                  onValueChange={(v) => setRedsys({ ...redsys, environment: v as "test" | "live" })}
                >
                  <SelectTrigger id="rs-env">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Pruebas (test)</SelectItem>
                    <SelectItem value="live">Producción (real)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rs-secret">Clave secreta (SHA-256)</Label>
                <Input
                  id="rs-secret"
                  type="password"
                  value={redsys.secretKey}
                  onChange={(e) => setRedsys({ ...redsys, secretKey: e.target.value })}
                  placeholder={redsysCfg?.configured ? "•••••••• (guardada)" : "Pega tu clave"}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" variant="secondary" disabled={!!busy}>
                {busy === "redsys-save" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar Redsys
              </Button>
              {redsysCfg?.configured && active !== "redsys" && (
                <Button type="button" size="sm" onClick={() => activate("redsys")} disabled={!!busy}>
                  {busy === "activate-redsys" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Activar Redsys
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Otras pasarelas (extensible) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-4 w-4" /> Otra pasarela
          </CardTitle>
          <CardDescription className="mt-1">
            ¿Usas PayPal, Bizum, una pasarela local u otra plataforma? Escríbenos y la integramos en
            tu tienda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <a href="mailto:soporte@avialo.app?subject=Quiero%20otra%20pasarela%20de%20pago">
              Solicitar integración
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
