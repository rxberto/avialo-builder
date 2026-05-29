import React from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Eye, Zap, Shield, CreditCard, Terminal,
  Calendar, CheckCircle2, Plus, ExternalLink, Sparkles,
  ArrowRight, Clock, Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  deployed: {
    label: 'En Línea',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  failed: {
    label: 'Generación Fallida',
    dot: 'bg-red-500',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
  default: {
    label: 'Construyendo...',
    dot: 'bg-[var(--brand)] animate-pulse',
    badge: 'bg-[var(--brand-glow)] text-[var(--brand)] border-[var(--brand)]/20 animate-pulse',
  },
};

export default function DashboardPage({ user, onLogout, onCreateNewSite, onOpenSiteIDE, onOpenProgress }) {
  const site = user.siteStatus && user.siteStatus !== 'none' ? {
    businessName: user.siteName,
    webType: user.siteType,
    dominio: user.siteDomain,
    jobId: user.siteJobId,
    status: user.siteStatus,
  } : null;

  const planDetails = {
    basic: { name: 'SaaS Basic', price: '29€/mes', limit: '20 edits/mes' },
    pro: { name: 'SaaS Pro', price: '59€/mes', limit: 'Cambios ilimitados' },
    ecommerce: { name: 'SaaS Ecommerce', price: '119€/mes', limit: 'Tienda headless' },
  }[user.plan || 'pro'] || { name: 'Plan Personal', price: '49€/mes', limit: 'Límites estándar' };

  const siteStatus = site?.status || 'pending';
  const statusConf = STATUS_CONFIG[siteStatus] || STATUS_CONFIG.default;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex-1 flex flex-col justify-start w-full relative">
      {/* Background brand glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[var(--brand-glow)] rounded-full blur-3xl pointer-events-none opacity-60" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-7 mb-8 border-b border-border relative z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tu Panel</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Hola,{' '}
            <span className="font-semibold text-[var(--brand)]">{user.name || user.email}</span>.
            Gestiona tu sitio web e integraciones.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-glow)] border border-[var(--brand)]/20 text-[var(--brand)]">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">{planDetails.name}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout} className="text-xs">
            Salir
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-7 relative z-10">
        {/* === LEFT: Site Panel (span 2) === */}
        <div className="lg:col-span-2 space-y-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tu Sitio Web</h2>

          {!site ? (
            /* EMPTY STATE: no site yet */
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className="relative overflow-hidden border-dashed">
                <CardContent className="flex flex-col items-center justify-center text-center py-16 px-8">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--brand-glow)] border border-[var(--brand)]/20 flex items-center justify-center mb-5">
                    <Globe className="w-7 h-7 text-[var(--brand)]" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">Diseña y construye tu web</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
                    Tu plan incluye <strong>1 sitio web activo</strong> completo. Configura marca, estructura y base de datos con nuestro asistente de IA.
                  </p>
                  <Button
                    onClick={onCreateNewSite}
                    className="gap-2 font-semibold shadow-lg"
                    size="lg"
                  >
                    <Plus className="w-4 h-4" />
                    Configurar mi Sitio Web con IA
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            /* SITE EXISTS STATE */
            <motion.div
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="relative overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--brand-glow)] border border-[var(--brand)]/20 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-[var(--brand)]" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{site.businessName}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {user.plan} · {site.webType}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
                      statusConf.badge
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", statusConf.dot)} />
                      {statusConf.label}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Details row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Dominio</p>
                      <a
                        href={`http://${site.dominio}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[var(--brand)] hover:underline underline-offset-4 flex items-center gap-1 truncate"
                      >
                        {site.dominio}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Base de Datos</p>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-semibold">PostgreSQL aislado</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <Button
                      onClick={() => onOpenSiteIDE(site)}
                      className="flex-1 gap-2 font-semibold"
                    >
                      <Eye className="w-4 h-4" />
                      Abrir IDE · Chat IA
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onOpenProgress(site.jobId)}
                      className="gap-2"
                    >
                      <Terminal className="w-4 h-4" />
                      Logs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* === RIGHT: Subscription === */}
        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Suscripción</h2>

          {/* Plan card */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs font-medium">Detalles de Pago</span>
                </div>
                <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  Activa
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2.5">
                {[
                  { label: 'Modalidad', value: planDetails.name, highlight: true },
                  { label: 'Cuota mensual', value: planDetails.price },
                  { label: 'Límites', value: planDetails.limit, small: true },
                  { label: 'Próximo cargo', value: '25 Jun 2026', icon: <Calendar className="w-3 h-3" /> },
                ].map(({ label, value, highlight, small, icon }) => (
                  <div key={label} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={cn(
                      "font-medium flex items-center gap-1",
                      highlight && "text-[var(--brand)]",
                      small && "text-[10px] text-muted-foreground max-w-[120px] text-right truncate"
                    )}>
                      {icon}{value}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-[10px]"
                  onClick={() => alert('Contacta con soporte@avialo.app para cambiar de plan.')}
                >
                  Cambiar Plan
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] text-muted-foreground hover:text-destructive"
                  onClick={() => alert('Se mantendrán las webs activas hasta fin del periodo de facturación.')}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info card */}
          <div className="p-4 rounded-xl border border-[var(--brand)]/15 bg-[var(--brand-glow)] space-y-2">
            <div className="flex items-center gap-2 text-[var(--brand)]">
              <Shield className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Aislamiento Total</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Cada cuenta gestiona <strong>1 sitio activo</strong> con base de datos PostgreSQL aislada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
