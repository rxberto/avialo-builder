import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Eye, Zap, Shield, CreditCard, Terminal,
  Calendar, CheckCircle2, Plus, ExternalLink, Sparkles,
  ArrowRight, Clock, Database, BarChart3, Users2,
  FileCode2, Check, AlertTriangle, ArrowUpRight, HelpCircle, Loader2,
  ArrowUp, ArrowDown, RefreshCw, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { updateProfile, getRealInvoices, createBillingPortalSession, getSiteAudit, getSubscription } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  deployed: {
    label: 'En Línea',
    dot: 'bg-emerald-500 shadow-emerald-500/50',
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  failed: {
    label: 'Generación Fallida',
    dot: 'bg-red-500 shadow-red-500/50',
    badge: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
  none: {
    label: 'Sin Sitio',
    dot: 'bg-muted-foreground',
    badge: 'bg-muted text-muted-foreground border-border',
  },
  default: {
    label: 'Construyendo...',
    dot: 'bg-brand animate-pulse shadow-brand/50',
    badge: 'bg-brand/10 text-brand border-brand/20 animate-pulse',
  },
};

export default function DashboardPage({ user, onLogout, onCreateNewSite, onOpenSiteIDE, onOpenProgress, onRetrySite, onDeleteSite, onUpdateUser, onAddNotification, onOpenBilling }) {
  const [siteActionLoading, setSiteActionLoading] = useState(null); // 'retry' | 'delete' | null
  const site = user.siteStatus && user.siteStatus !== 'none' ? {
    businessName: user.siteName,
    webType: user.siteType,
    dominio: user.siteDomain,
    jobId: user.siteJobId,
    status: user.siteStatus,
  } : null;

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  // Auditoría de rendimiento REAL (PageSpeed Insights). Antes el dashboard mostraba un 94 fijo.
  const [audit, setAudit] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadAudit = async (refresh = false) => {
    setAuditLoading(true);
    try {
      setAudit(await getSiteAudit(refresh));
    } catch (e) {
      setAudit({ available: false, reason: 'audit_failed', message: e.message });
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (user?.siteStatus === 'deployed') loadAudit(false);
    else setAudit({ available: false, reason: 'no_site' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.siteStatus, user?.siteDomain]);

  // Estado real de la suscripción (para mostrar la próxima renovación, no un dato fijo).
  const [subscription, setSubscription] = useState(null);
  useEffect(() => {
    let active = true;
    getSubscription().then((s) => { if (active) setSubscription(s); }).catch(() => {});
    return () => { active = false; };
  }, [user?.plan]);
  const nextRenewalLabel = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  // 0..100 → color (verde >=90, ámbar >=50, rojo); null → neutro.
  const scoreClass = (s) =>
    s == null ? 'text-muted-foreground' : s >= 90 ? 'text-emerald-500' : s >= 50 ? 'text-amber-500' : 'text-red-500';

  const handleUpdatePlan = async (newPlan) => {
    setIsUpdatingPlan(true);
    try {
      const updated = await updateProfile({ plan: newPlan });
      if (onUpdateUser) onUpdateUser(updated);
      if (onAddNotification) {
        onAddNotification('success', 'Plan SaaS Actualizado', `¡Felicidades! Tu cuenta B2B ha sido cambiada al plan ${newPlan.toUpperCase()} con éxito en PostgreSQL.`);
      }
      setShowUpgradeModal(false);
    } catch (err) {
      if (onAddNotification) {
        onAddNotification('error', 'Error de Suscripción', err.message || 'No se pudo procesar la mejora del plan.');
      }
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const [invoices, setInvoices] = useState([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // Cargar facturas reales de Stripe
  const loadInvoices = async () => {
    setIsLoadingInvoices(true);
    try {
      const data = await getRealInvoices();
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error("Error al cargar facturas reales:", err);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  // Cargar facturas cuando el modal se abre
  useEffect(() => {
    if (showManageModal) {
      loadInvoices();
    }
  }, [showManageModal]);

  // Redirigir de forma segura al portal de facturación real de Stripe
  const handleOpenBillingPortal = async () => {
    setIsOpeningPortal(true);
    if (onAddNotification) {
      onAddNotification('info', 'Acceso Seguro', 'Generando enlace cifrado al portal de Stripe...');
    }
    try {
      const { url } = await createBillingPortalSession();
      if (url) {
        window.open(url, '_blank');
      } else {
        throw new Error("No se pudo obtener el enlace de Stripe.");
      }
    } catch (err) {
      console.error("Error al abrir portal de facturación:", err);
      if (onAddNotification) {
        onAddNotification('error', 'Error del Portal', err.message || 'No se pudo abrir el portal de facturas.');
      }
    } finally {
      setIsOpeningPortal(false);
    }
  };

  // Onboarding Welcome screen state: Forzar ver el nuevo Onboarding V2 si no tiene sitio web
  const [showWelcome, setShowWelcome] = useState(() => {
    if (!site) {
      const v2seen = localStorage.getItem('avialo_onboarding_v2');
      if (v2seen !== 'true') {
        localStorage.setItem('avialo_onboarding_v2', 'true');
        localStorage.removeItem('avialo_hide_dashboard_welcome');
        return true;
      }
      return localStorage.getItem('avialo_hide_dashboard_welcome') !== 'true';
    }
    return false;
  });

  // Provisioning steps simulator: 0 to 4
  const [provisioningStep, setProvisioningStep] = useState(0);

  useEffect(() => {
    if (showWelcome) {
      const t1 = setTimeout(() => setProvisioningStep(1), 800);
      const t2 = setTimeout(() => setProvisioningStep(2), 1800);
      const t3 = setTimeout(() => setProvisioningStep(3), 2800);
      const t4 = setTimeout(() => setProvisioningStep(4), 3800); // Fully provisioned, show CTAs
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [showWelcome]);

  const handleCloseWelcome = () => {
    localStorage.setItem('avialo_hide_dashboard_welcome', 'true');
    setShowWelcome(false);
  };

  const handleStartOnboarding = () => {
    localStorage.setItem('avialo_hide_dashboard_welcome', 'true');
    setShowWelcome(false);
    onCreateNewSite();
  };

  const planDetails = {
    basic: { 
      name: 'Plan SaaS Basic', 
      price: '29€/mes', 
      limit: '20 edits/mes', 
      features: ['1 Sitio Web Activo', 'Base de datos Postgres', 'Certificado SSL Gratis', 'Soporte Básico', 'IDE con IA (20 edits)']
    },
    pro: { 
      name: 'Plan SaaS Pro', 
      price: '59€/mes', 
      limit: 'Cambios ilimitados', 
      features: ['1 Sitio Web Activo', 'Base de datos Postgres', 'Certificado SSL Gratis', 'Soporte Prioritario', 'IDE con IA Ilimitado', 'Dominio Personalizado']
    },
    ecommerce: { 
      name: 'Plan SaaS Ecommerce', 
      price: '119€/mes', 
      limit: 'Tienda headless', 
      features: ['1 Tienda Online Activa', 'Pasarela Stripe Integrada', 'Base de datos Postgres', 'Soporte 24/7 VIP', 'IDE con IA Ilimitado', 'Gestión de Productos Medusa']
    },
  }[user.plan || 'pro'] || { 
    name: 'Plan Personal', 
    price: '49€/mes', 
    limit: 'Límites estándar', 
    features: ['1 Sitio Web Activo', 'Base de datos Postgres', 'Soporte Estándar'] 
  };

  const siteStatus = site?.status || 'none';
  const statusConf = STATUS_CONFIG[siteStatus] || STATUS_CONFIG.default;

  // Staggered Animation Containers
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  // Mock B2B Activity Feed
  const activities = [
    {
      id: 1,
      icon: <CheckCircle2 className="w-4 h-4 text-brand-success" />,
      title: 'Contenedor levantado con éxito',
      desc: `La previsualización de tu sitio está lista en ${site?.dominio || 'tu-proyecto.avialo.app'}.`,
      time: 'Hace 2 horas'
    },
    {
      id: 2,
      icon: <Sparkles className="w-4 h-4 text-brand" />,
      title: 'Edición de IA finalizada',
      desc: 'El Agente IA ha programado un sistema de reservas multi-servicio en src/app/onboarding.',
      time: 'Hace 5 horas'
    },
    {
      id: 3,
      icon: <Terminal className="w-4 h-4 text-brand-info" />,
      title: 'Build de Next.js standalone completado',
      desc: 'Compilación finalizada sin warnings en 45 segundos (Iteración 1).',
      time: 'Hace 5 horas'
    },
    {
      id: 4,
      icon: <Database className="w-4 h-4 text-brand-accent" />,
      title: 'Base de datos PostgreSQL inicializada',
      desc: `Esquema de base de datos multi-tenant creado de forma segura: tenant_schema.`,
      time: 'Hace 6 horas'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 flex-1 flex flex-col justify-start w-full relative overflow-hidden">
      
      {/* Premium background blobs */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[600px] h-[300px] bg-brand-glow rounded-full blur-3xl pointer-events-none opacity-50" />
      <div className="absolute bottom-10 right-1/4 translate-x-1/2 w-[500px] h-[250px] bg-brand-accent/5 rounded-full blur-3xl pointer-events-none opacity-40" />

      {/* ── SIMPLE AND ELEGANT PROVISIONING OVERLAY ── */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-3xl max-w-md w-full p-8 relative overflow-hidden space-y-8"
            >
              {/* Internal subtle visual highlights */}
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-brand/5 dark:bg-brand/10 rounded-full blur-3xl pointer-events-none" />

              <div className="text-center space-y-4 relative z-10">
                <div className="mx-auto w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center relative mb-6">
                  {provisioningStep < 4 ? (
                    <Loader2 className="w-8 h-8 text-brand animate-spin" />
                  ) : (
                    <Sparkles className="w-8 h-8 text-brand animate-pulse" />
                  )}
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                  {provisioningStep < 4 ? 'Preparando tu cuenta...' : '¡Todo listo para empezar!'}
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed">
                  {provisioningStep < 4 
                    ? 'Estamos configurando tu espacio de trabajo de forma segura para que disfrutes de la mejor experiencia.' 
                    : 'Tu perfil ha sido creado correctamente. Ya puedes comenzar a generar tu sitio web con IA.'}
                </p>
              </div>

              {/* ── SIMPLE CHECKLIST ── */}
              <div className="space-y-4 max-w-sm mx-auto text-sm text-zinc-500 dark:text-zinc-400 relative z-10">
                <div className="flex items-center gap-3">
                  {provisioningStep >= 1 ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <div className="w-5 h-5 shrink-0" />}
                  <span className={provisioningStep >= 1 ? "font-semibold text-zinc-900 dark:text-zinc-100" : ""}>Perfil corporativo creado</span>
                </div>
                <div className="flex items-center gap-3">
                  {provisioningStep >= 2 ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <div className="w-5 h-5 shrink-0" />}
                  <span className={provisioningStep >= 2 ? "font-semibold text-zinc-900 dark:text-zinc-100" : ""}>Espacio de trabajo seguro habilitado</span>
                </div>
                <div className="flex items-center gap-3">
                  {provisioningStep >= 3 ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <div className="w-5 h-5 shrink-0" />}
                  <span className={provisioningStep >= 3 ? "font-semibold text-zinc-900 dark:text-zinc-100" : ""}>Motor de Inteligencia Artificial listo</span>
                </div>
              </div>

              {/* Action options - reveal when provisioning is complete */}
              <AnimatePresence>
                {provisioningStep >= 4 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-2 pt-2 relative z-10"
                  >
                    <Button 
                      onClick={handleStartOnboarding}
                      className="w-full py-6 rounded-xl font-bold bg-brand hover:bg-brand-2 text-white shadow-md gap-2 h-12 text-sm cursor-pointer"
                    >
                      🚀 Crear mi Sitio Web con IA
                      <ArrowRight size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleCloseWelcome}
                      className="w-full text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 h-10 cursor-pointer"
                    >
                      Ir al panel de control primero
                    </Button>
                  </motion.div>
                ) : (
                  <div className="h-[104px]" /> // Fixed Spacer during load to avoid jumping layout
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER SECTION ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-8 mb-10 border-b border-border/60 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand tracking-wider uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Workspace Corporativo
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-clip-text">
            Panel de Control
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            ¡Hola, <span className="font-semibold text-foreground">{user.name || user.email}</span>! Gestiona el rendimiento de tu sitio, base de datos y suscripción B2B.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/5 border border-brand/20 text-brand text-xs font-bold animate-pulse-glow">
            <Zap className="w-3.5 h-3.5" />
            {planDetails.name}
          </div>
          <Button variant="outline" size="sm" onClick={onLogout} className="rounded-xl px-4 text-xs font-semibold border-border hover:bg-muted/80">
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* ── STAGGERED GRID LAYOUT ── */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8 relative z-10"
      >
        
        {/* ── QUICK STATS ROW (4 Cards) ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const maxCredits = {
              none: 50,
              basic: 800,
              corporativa: 800,
              pro: 1500,
              dinamica: 1500,
              ecommerce: 3000
            }[user.plan] || 50;

            const usedCredits = Math.max(0, maxCredits - (user.aiCredits ?? 0));
            const progressPercent = Math.min(100, Math.round((usedCredits / maxCredits) * 100));

            const resetDateString = user.creditsResetDate
              ? new Date(user.creditsResetDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
              : "Próximo mes";

            return [
              { 
                title: "Sitios Web Activos", 
                value: site ? "1 / 1" : "0 / 1", 
                desc: site ? "Contenedor online" : "Disponible para generar",
                icon: <Globe className="w-5 h-5 text-brand" /> 
              },
              { 
                title: "Créditos IA Utilizados", 
                value: `${usedCredits} / ${maxCredits}`, 
                desc: `${user.aiCredits ?? 0} restantes`,
                icon: <Zap className="w-5 h-5 text-brand-accent" />,
                progress: progressPercent 
              },
              { 
                title: "Disponibilidad Preview", 
                value: site ? "99.98%" : "N/A", 
                desc: "Monitorizado via Traefik",
                icon: <CheckCircle2 className="w-5 h-5 text-brand-success" />,
                statusDot: site ? "bg-emerald-500" : "bg-muted"
              },
              { 
                title: "Próxima Renovación", 
                value: resetDateString, 
                desc: "Renovación automática",
                icon: <Calendar className="w-5 h-5 text-brand-info" /> 
              }
            ];
          })().map((stat, idx) => (
            <Card key={idx} className="glass shadow-sm hover:border-border/80 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-muted-foreground font-medium truncate">{stat.title}</span>
                  <div className="p-1.5 rounded-lg bg-muted/60 border border-border/30">
                    {stat.icon}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    {stat.statusDot && <span className={cn("w-2.5 h-2.5 rounded-full animate-ping shrink-0", stat.statusDot)} />}
                    {stat.value}
                  </div>
                  {stat.progress !== undefined ? (
                    <div className="mt-2 space-y-1">
                      <Progress value={stat.progress} className="h-1.5 bg-muted" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{stat.desc}</span>
                        <span>{stat.progress}%</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{stat.desc}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* ── MAIN ACTIONS / CONTENT GRID ── */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT: Site Configuration Panel (spans 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {!site ? (
              /* EMPTY STATE: no site yet */
              <motion.div variants={itemVariants}>
                <Card className="glass relative overflow-hidden border-dashed border-2 border-brand/30 hover:border-brand/50 transition-all duration-300">
                  <CardContent className="flex flex-col items-center justify-center text-center py-20 px-8">
                    {/* Glowing composition */}
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-brand/20 blur-xl rounded-full scale-125" />
                      <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center relative">
                        <Globe className="w-8 h-8 text-brand animate-pulse" />
                      </div>
                      <Badge className="absolute -top-2 -right-4 bg-brand-accent text-white font-bold text-[9px] px-2 py-0.5 border-none shadow-md">
                        ¡Listo!
                      </Badge>
                    </div>
                    
                    <h3 className="text-xl font-bold tracking-tight mb-2">Diseña y despliega tu app web con IA</h3>
                    <p className="text-muted-foreground text-sm max-w-md mb-8 leading-relaxed">
                      Tu plan corporativo incluye <strong className="font-bold text-foreground">1 sitio web activo full-stack</strong> (Next.js, PostgreSQL y Panel privado). Completa el formulario de negocio y nuestro Agente IA lo creará de inmediato.
                    </p>
                    
                    <Button
                      onClick={onCreateNewSite}
                      className="gap-2 font-bold shadow-lg shadow-brand/10 hover:shadow-brand/20 bg-brand hover:bg-brand/90 text-white rounded-full px-8 py-6 h-12"
                      size="lg"
                    >
                      <Plus className="w-5 h-5" />
                      Configurar mi Sitio Web con IA
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* SITE EXISTS STATE */
              <motion.div variants={itemVariants}>
                <Card className="glass relative overflow-hidden border border-border/60 shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                          <Globe className="w-6 h-6 text-brand" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold">{site.businessName}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <span className="capitalize">{site.webType} Boilerplate</span> · <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-semibold text-brand-accent border-brand-accent/20 bg-brand-accent/5">{user.plan}</Badge>
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold self-start sm:self-auto shrink-0 shadow-sm",
                        statusConf.badge
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 shadow-sm", statusConf.dot)} />
                        {statusConf.label}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Auditoría de rendimiento REAL (PageSpeed Insights) */}
                    <div className="relative rounded-2xl border border-border/40 bg-zinc-900/5 dark:bg-zinc-900/40 p-4 overflow-hidden min-h-40 flex items-center justify-center group">
                      <div className="absolute inset-0 bg-gradient-to-tr from-brand/5 via-transparent to-brand-accent/5 pointer-events-none" />

                      {auditLoading && !audit?.available ? (
                        <div className="flex items-center gap-3 z-10 text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin text-brand" />
                          <span className="text-sm font-medium">Midiendo rendimiento real…</span>
                        </div>
                      ) : audit?.available ? (
                        <div className="flex items-center gap-6 z-10 w-full justify-center flex-wrap">
                          {/* Gauge de rendimiento */}
                          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path className="text-border/20" strokeWidth="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <path className={cn(scoreClass(audit.scores.performance))} strokeDasharray={`${audit.scores.performance ?? 0}, 100`} strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <div className="absolute text-center">
                              <span className="text-lg font-extrabold text-foreground leading-none">{audit.scores.performance ?? '—'}</span>
                              <span className="text-[8px] text-muted-foreground block -mt-1">Rendimiento</span>
                            </div>
                          </div>
                          {/* Sub-scores + métricas reales */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[['SEO', audit.scores.seo], ['Accesib.', audit.scores.accessibility], ['Buenas prác.', audit.scores.bestPractices]].map(([label, val]) => (
                                <span key={label} className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-border/50 bg-muted/40">
                                  {label}: <span className={scoreClass(val)}>{val ?? '—'}</span>
                                </span>
                              ))}
                            </div>
                            {audit.scores.metrics?.lcp && (
                              <p className="text-[11px] text-muted-foreground">
                                LCP {audit.scores.metrics.lcp}{audit.scores.metrics.cls ? ` · CLS ${audit.scores.metrics.cls}` : ''}
                              </p>
                            )}
                            <div className="flex items-center gap-3">
                              <button onClick={() => loadAudit(true)} disabled={auditLoading} className="text-[10px] font-bold text-brand hover:underline flex items-center gap-1 disabled:opacity-50">
                                <RefreshCw className={cn('w-3 h-3', auditLoading && 'animate-spin')} /> {auditLoading ? 'Midiendo…' : 'Re-medir'}
                              </button>
                              <span className="text-[9px] text-muted-foreground/60">Datos reales · PageSpeed (Google)</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="z-10 text-center px-4">
                          <BarChart3 className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-foreground">
                            {audit?.reason === 'no_site'
                              ? 'Publica tu web para medir su rendimiento real.'
                              : 'No se pudo medir el rendimiento ahora mismo.'}
                          </p>
                          {audit?.reason !== 'no_site' && (
                            <button onClick={() => loadAudit(true)} disabled={auditLoading} className="mt-2 text-[11px] font-bold text-brand hover:underline flex items-center gap-1 mx-auto disabled:opacity-50">
                              <RefreshCw className={cn('w-3 h-3', auditLoading && 'animate-spin')} /> Reintentar
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tech stats and settings summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1 hover:bg-muted/50 transition-colors">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Subdominio de Preview</p>
                        <a
                          href={`http://${site.dominio}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-brand hover:text-brand-2 hover:underline underline-offset-4 flex items-center gap-1 truncate outline-none"
                        >
                          {site.dominio}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                      
                      <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1 hover:bg-muted/50 transition-colors">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Aislamiento B2B</p>
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Shield className="w-3.5 h-3.5 text-brand-success" />
                          <span className="text-xs font-bold">Base de Datos PostgreSQL</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1 hover:bg-muted/50 transition-colors">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Integraciones Activas</p>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-border/60 bg-muted/80">Next.js</Badge>
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-border/60 bg-muted/80">Prisma</Badge>
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-border/60 bg-muted/80">Auth</Badge>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-border/60" />

                    {/* Action buttons — según el estado del sitio */}
                    {siteStatus === 'failed' ? (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={async () => { setSiteActionLoading('retry'); try { await onRetrySite?.(site.jobId); } finally { setSiteActionLoading(null); } }}
                          disabled={siteActionLoading !== null || !site.jobId}
                          className="flex-1 gap-2 font-bold bg-brand hover:bg-brand/90 text-white rounded-full py-5 h-11"
                        >
                          {siteActionLoading === 'retry' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          Reintentar generación
                        </Button>
                        <Button
                          variant="outline"
                          onClick={async () => { setSiteActionLoading('delete'); try { await onDeleteSite?.(site.jobId); } finally { setSiteActionLoading(null); } }}
                          disabled={siteActionLoading !== null}
                          className="gap-2 rounded-full border-red-300 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 h-11"
                        >
                          {siteActionLoading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          Eliminar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => onOpenProgress(site.jobId)}
                          className="gap-2 rounded-full border-border hover:bg-muted/80 h-11"
                        >
                          <Terminal className="w-4 h-4" />
                          Ver Logs
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={() => onOpenSiteIDE(site)}
                          className="flex-1 gap-2 font-bold shadow-md shadow-brand/10 hover:shadow-brand/20 bg-brand hover:bg-brand/90 text-white rounded-full py-5 h-11"
                        >
                          <Eye className="w-4 h-4" />
                          Abrir IDE / Chat IA
                        </Button>
                        {/* La web ya está desplegada: en vez de volver a /progress (que
                            mostraba un falso "reinicio" y hacía desaparecer la web),
                            abrimos la web publicada en una pestaña nueva. */}
                        <Button
                          variant="outline"
                          onClick={() => site.dominio && window.open(`http://${site.dominio}`, '_blank', 'noopener')}
                          disabled={!site.dominio}
                          className="gap-2 rounded-full border-border hover:bg-muted/80 h-11"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Ver web publicada
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* RIGHT: B2B Subscription Panel */}
          <div className="space-y-6">
            
            <motion.div variants={itemVariants}>
              <Card className="glass relative overflow-hidden border border-border/60 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Facturación B2B</span>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 border-emerald-500/20 text-[9px] py-0 px-2 font-bold uppercase tracking-wider">
                      Activa
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-5">
                  <div className="space-y-3">
                    {[
                      { label: 'Suscripción', value: planDetails.name, highlight: true },
                      { label: 'Importe mensual', value: planDetails.price },
                      { label: 'Capacidad de Edición', value: planDetails.limit, textMuted: true },
                      { label: subscription?.cancelAtPeriodEnd ? 'Acceso hasta' : 'Próxima Factura', value: nextRenewalLabel, icon: <Calendar className="w-3 h-3 text-muted-foreground" /> },
                    ].map(({ label, value, highlight, textMuted, icon }, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={cn(
                          "font-bold flex items-center gap-1 text-foreground",
                          highlight && "text-brand",
                          textMuted && "text-[10px] text-muted-foreground max-w-[125px] truncate"
                        )}>
                          {icon}{value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator className="bg-border/60" />

                  {/* Feature checklist */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Características Incluidas</p>
                    <div className="space-y-1.5">
                      {planDetails.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <Check className="w-3.5 h-3.5 text-brand-success shrink-0" />
                          <span className="text-muted-foreground truncate">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-border/60" />

                   <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[10px] font-bold rounded-full py-4 h-8 border-border hover:bg-muted/80 cursor-pointer"
                      onClick={() => (onOpenBilling ? onOpenBilling() : setShowUpgradeModal(true))}
                    >
                      Cambiar Plan
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] font-semibold text-muted-foreground hover:text-brand-accent rounded-full py-4 h-8 cursor-pointer"
                      onClick={() => (onOpenBilling ? onOpenBilling() : setShowManageModal(true))}
                    >
                      Facturación
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Micro-billing alert */}
            <motion.div variants={itemVariants} className="p-4 rounded-2xl border border-brand/15 bg-brand/5 space-y-2 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-brand/5 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex items-center gap-2 text-brand">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Aislamiento PostgreSQL</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-normal">
                Para garantizar la seguridad de tus transacciones, cada cuenta B2B dispone de aislamiento total del motor SQL y volumen físico Docker.
              </p>
            </motion.div>

          </div>
        </div>

        {/* ── QUICK ACTIONS GRID (4 Actions) ── */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Acciones Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                title: "Crear Nuevo Sitio",
                desc: "Iniciar asistente IA",
                icon: <Plus className="w-5 h-5" />,
                action: onCreateNewSite,
                enabled: !site,
                badge: site ? "Sitio Activo" : null
              },
              {
                title: "Abrir IDE",
                desc: "Editor de código & Chat",
                icon: <FileCode2 className="w-5 h-5" />,
                action: () => site ? onOpenSiteIDE(site) : onCreateNewSite(),
                enabled: true
              },
              {
                title: "Ver Analytics",
                desc: "Métricas de tráfico",
                icon: <BarChart3 className="w-5 h-5" />,
                action: () => {},
                enabled: false,
                badge: "Próximamente"
              },
              {
                title: "Invitar Equipo",
                desc: "Gestionar miembros B2B",
                icon: <Users2 className="w-5 h-5" />,
                action: () => {},
                enabled: false,
                badge: "Multi-seat"
              }
            ].map((act, i) => (
              <Card 
                key={i} 
                onClick={act.enabled ? act.action : undefined}
                className={cn(
                  "glass border/60 hover:border-border/80 transition-all duration-300 relative overflow-hidden group cursor-pointer",
                  !act.enabled && "opacity-60 cursor-not-allowed"
                )}
              >
                <CardContent className="p-5 flex flex-col justify-between min-h-[120px]">
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-xl bg-brand/10 text-brand border border-brand/20 group-hover:bg-brand group-hover:text-white transition-colors duration-300">
                      {act.icon}
                    </div>
                    {act.badge && (
                      <Badge variant="outline" className="text-[8px] px-1.5 py-0 font-bold border-border/80 bg-muted/60 text-muted-foreground">
                        {act.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1 group-hover:text-brand transition-colors duration-300">
                      {act.title}
                      {act.enabled && <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{act.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* ── ACTIVITY FEED (Full Width) ── */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Historial de Actividad del Agente IA</h2>
          <Card className="glass border border-border/60 shadow-lg">
            <CardContent className="p-6">
              {site ? (
                <div className="space-y-6">
                  {activities.map((act) => (
                    <div key={act.id} className="flex gap-4 relative group">
                      
                      {/* Timeline line */}
                      <div className="absolute left-[9px] top-6 bottom-[-24px] last:bottom-0 w-[2px] bg-border/40 group-last:hidden" />
                      
                      {/* Timeline icon */}
                      <div className="w-5 h-5 rounded-full bg-background border-2 border-border/60 flex items-center justify-center z-10 shrink-0 relative">
                        {act.icon}
                      </div>

                      <div className="flex-1 -mt-0.5">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="text-xs font-bold text-foreground">{act.title}</h4>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {act.time}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-normal">{act.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
                  <Clock className="w-8 h-8 mb-2 text-border" />
                  <p className="text-xs">No hay actividad registrada en este momento. Comienza creando tu sitio web.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      {/* ── B2B UPGRADE SaaS PLAN MODAL (HIGH AESTHETICS) ── */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/25 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
              className="glass rounded-3xl max-w-4xl w-full p-6 md:p-8 relative my-8 shadow-xl text-zinc-900 dark:text-zinc-50 border-zinc-200/50 dark:border-zinc-800/50"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-full p-2 cursor-pointer transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header */}
              <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles size={12} className="animate-pulse" />
                  <span>Mejora de Infraestructura</span>
                </div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white">Escala tu negocio B2B</h3>
                <p className="text-zinc-650 dark:text-zinc-400 text-xs max-w-md mx-auto">
                  Selecciona el plan óptimo para tu empresa. El cambio se procesará de forma inmediata en tu base de datos PostgreSQL dedicada.
                </p>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  {
                    id: 'basic',
                    name: 'Plan SaaS Basic',
                    price: '29€',
                    desc: 'Ideal para pymes que inician su presencia digital activa.',
                    features: ['1 Sitio Web Next.js', '20 Créditos de IA / mes', 'PostgreSQL Aislado', 'Let\'s Encrypt SSL', 'Soporte Estándar'],
                    color: 'from-blue-500/20 to-transparent',
                    border: 'hover:border-blue-500/30',
                    badge: null
                  },
                  {
                    id: 'pro',
                    name: 'Plan SaaS Pro',
                    price: '59€',
                    desc: 'Para empresas en crecimiento con necesidades dinámicas de IA.',
                    features: ['1 Sitio Web Next.js', 'Créditos IA ILIMITADOS', 'Reservas PostgreSQL', 'Dominio Personalizado', 'Soporte Prioritario 24/7'],
                    color: 'from-brand/25 via-brand/5 to-transparent',
                    border: 'border-brand/40 shadow-[0_0_25px_-5px_rgba(139,92,246,0.15)]',
                    badge: 'MÁS POPULAR'
                  },
                  {
                    id: 'ecommerce',
                    name: 'Plan SaaS Ecommerce',
                    price: '119€',
                    desc: 'Tienda Headless premium con Medusa.js v2 y Stripe.',
                    features: ['1 Tienda Online Medusa', 'Créditos IA ILIMITADOS', 'Pasarela Stripe 3D Secure', 'Gestión Stock Headless', 'Soporte VIP 24/7'],
                    color: 'from-emerald-500/20 to-transparent',
                    border: 'hover:border-emerald-500/30',
                    badge: 'ENTERPRISE'
                  }
                ].map((p) => {
                  const planLevels = {
                    'none': 0,
                    'basic': 1,
                    'pro': 2,
                    'ecommerce': 3
                  };
                  const currentLevel = planLevels[user.plan || 'none'] || 0;
                  const targetLevel = planLevels[p.id] || 0;
                  const isActive = user.plan === p.id;
                  const isUpgrade = targetLevel > currentLevel;
                  const isDowngrade = targetLevel < currentLevel;

                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "relative bg-white/40 dark:bg-zinc-950/40 rounded-2xl border p-5 flex flex-col justify-between overflow-hidden group transition-all duration-300",
                        isActive
                          ? "border-emerald-500 dark:border-emerald-400 shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)] bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]"
                          : isDowngrade
                            ? "border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-300 dark:hover:border-zinc-700"
                            : p.id === 'pro'
                              ? "border-brand/40 shadow-[0_0_20px_-5px_rgba(139,92,246,0.15)] hover:border-brand"
                              : "border-zinc-200 dark:border-zinc-800 hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.05)]"
                      )}
                    >
                      {/* Gradient glow top */}
                      <div
                        className={cn(
                          "absolute inset-x-0 top-0 h-24 bg-gradient-to-b pointer-events-none transition-opacity duration-300",
                          p.color,
                          isActive
                            ? "opacity-60"
                            : isDowngrade
                              ? "opacity-20 group-hover:opacity-40"
                              : "opacity-50 group-hover:opacity-80"
                        )}
                      />
                      
                      {/* Context-aware badges */}
                      <div className="absolute top-3 right-3 flex flex-col gap-1 items-end z-20">
                        {isActive && (
                          <Badge className="bg-emerald-500 hover:bg-emerald-550 text-white font-extrabold text-[8px] tracking-wide border-none px-2 py-0.5 shadow-md flex items-center gap-1 select-none">
                            <Check className="w-2.5 h-2.5" /> PLAN ACTUAL
                          </Badge>
                        )}
                        {!isActive && user.plan && user.plan !== 'none' && isUpgrade && (
                          <Badge className="bg-blue-500 hover:bg-blue-550 text-white font-extrabold text-[8px] tracking-wide border-none px-2 py-0.5 shadow-md flex items-center gap-1 select-none animate-pulse-glow">
                            <ArrowUp className="w-2.5 h-2.5" /> MEJORAR
                          </Badge>
                        )}
                        {!isActive && user.plan && user.plan !== 'none' && isDowngrade && (
                          <Badge className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-extrabold text-[8px] tracking-wide border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 shadow-sm flex items-center gap-1 select-none">
                            <ArrowDown className="w-2.5 h-2.5" /> PLAN INFERIOR
                          </Badge>
                        )}
                        {/* Original Badge (Marketing Category like 'MÁS POPULAR' or 'ENTERPRISE') if not active/downgrade */}
                        {!isActive && !isDowngrade && p.badge && (
                          <Badge className={cn(
                            "font-extrabold text-[8px] tracking-wide px-2 py-0.5 shadow-sm select-none border-none",
                            p.id === 'pro'
                              ? "bg-brand text-white shadow-brand/10"
                              : "bg-emerald-600 text-white shadow-emerald-600/10"
                          )}>
                            {p.badge}
                          </Badge>
                        )}
                      </div>

                      <div className="relative z-10 space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wide">{p.name}</h4>
                          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1 leading-normal h-8">{p.desc}</p>
                        </div>

                        <div className="flex items-baseline gap-1.5 py-2 border-t border-b border-zinc-200 dark:border-zinc-800/60">
                          <span className="text-3xl font-black text-zinc-900 dark:text-white">{p.price}</span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-405">/ mes + IVA</span>
                        </div>

                        <ul className="space-y-2 text-[10px] font-semibold text-zinc-700 dark:text-zinc-355">
                          {p.features.map((f, i) => (
                            <li key={i} className="flex gap-2 items-center text-left">
                              <Check className="w-3.5 h-3.5 text-brand shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="relative z-10 pt-6 mt-4">
                        {isActive ? (
                          <Button
                            disabled
                            className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl py-5 text-xs flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" /> Tu Plan Actual
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleUpdatePlan(p.id)}
                            disabled={isUpdatingPlan}
                            className={cn(
                              "w-full font-bold rounded-xl py-5 text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5",
                              isDowngrade
                                ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-zinc-350 dark:border-zinc-750 shadow-none hover:shadow-sm"
                                : "bg-brand hover:bg-brand/90 text-white shadow-brand/10 hover:shadow-brand/20"
                            )}
                          >
                            {isUpdatingPlan ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isDowngrade ? (
                              <ArrowDown className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
                            ) : (
                              <ArrowUp className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
                            )}
                            
                            {(!user.plan || user.plan === 'none') ? (
                              `Adquirir ${p.id === 'ecommerce' ? 'Ecommerce' : p.id.toUpperCase()}`
                            ) : isUpgrade ? (
                              `Subir a ${p.id === 'ecommerce' ? 'Ecommerce' : p.id.toUpperCase()}`
                            ) : (
                              `Bajar a ${p.id === 'ecommerce' ? 'Ecommerce' : p.id.toUpperCase()}`
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Guarantee footer */}
              <p className="text-[9px] text-zinc-500 text-center mt-6">
                * Las actualizaciones de plan se procesan de forma inmediata en el servidor. En caso de downgrade, el saldo restante se acreditará a tu favor en Stripe.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── B2B MANAGE BILLING / SUBSCRIPTION MODAL (HIGH AESTHETICS) ── */}
      <AnimatePresence>
        {showManageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/25 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
              className="glass rounded-3xl max-w-2xl w-full p-6 md:p-8 relative shadow-xl text-zinc-900 dark:text-zinc-50 border-zinc-200/50 dark:border-zinc-800/50"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowManageModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-full p-2 cursor-pointer transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800/80 pb-4 mb-6 text-left">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-brand">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">Gestionar Suscripción & Facturación</h3>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Portal Seguro de Facturación Intracomunitaria</p>
                </div>
              </div>

              <div className="space-y-6 text-left">
                {/* Mastercard mockup and details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                  
                  {/* Physical credit card mockup */}
                  <div className="relative h-36 bg-gradient-to-tr from-indigo-950 via-indigo-900 to-zinc-900 rounded-2xl p-4 border border-indigo-500/25 flex flex-col justify-between overflow-hidden shadow-lg select-none">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand/10 rounded-bl-full blur-xl pointer-events-none" />
                    
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest">B2B CORPORATE CARD</span>
                      {/* Mastercard red/yellow circle logo */}
                      <div className="flex -space-x-2 shrink-0">
                        <div className="w-5 h-5 rounded-full bg-red-500 opacity-90" />
                        <div className="w-5 h-5 rounded-full bg-yellow-500 opacity-90" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      {/* Chip icon */}
                      <div className="w-6 h-5 rounded bg-yellow-600/35 border border-yellow-500/20 flex items-center justify-center shrink-0">
                        <div className="w-3 h-2.5 border-r border-b border-yellow-500/30" />
                      </div>
                      <p className="text-sm font-mono text-white tracking-widest">••••  ••••  ••••  4242</p>
                    </div>

                    <div className="flex justify-between items-end text-[8px] font-mono text-zinc-400">
                      <div>
                        <span className="block text-[6px] text-zinc-505">CARDHOLDER</span>
                        <span className="font-semibold uppercase tracking-wide text-white">{user.name || user.email}</span>
                      </div>
                      <div>
                        <span className="block text-[6px] text-zinc-505">EXPIRES</span>
                        <span className="font-semibold text-white">12/29</span>
                      </div>
                    </div>
                  </div>

                  {/* Card actions */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-black">Plan actual contratado</span>
                      <p className="text-sm font-bold text-zinc-800 dark:text-white capitalize">{user.plan || 'Ninguno'}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-black">Método de Facturación</span>
                      <p className="text-[11px] text-zinc-700 dark:text-zinc-300">Mensual automático vía Stripe</p>
                    </div>

                    <Button
                      onClick={handleOpenBillingPortal}
                      disabled={isOpeningPortal}
                      className="w-full text-xs font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white dark:border-zinc-750 py-4 h-9 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isOpeningPortal ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ArrowUpRight size={12} />
                      )}
                      Abrir Portal de Facturación
                    </Button>
                  </div>

                </div>

                <Separator className="bg-zinc-200 dark:bg-zinc-800" />

                {/* Real Invoice Downloads */}
                <div className="space-y-2.5">
                  <span className="text-[9px] text-zinc-555 dark:text-zinc-450 uppercase font-black tracking-wider">Últimos Recibos / Historial de Pagos</span>
                  <div className="border border-zinc-200 dark:border-zinc-850 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden bg-zinc-50/50 dark:bg-black/25">
                    {isLoadingInvoices ? (
                      <div className="flex flex-col items-center justify-center py-8 text-zinc-500 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-brand" />
                        <p className="text-[10px] font-medium">Cargando facturas reales de Stripe...</p>
                      </div>
                    ) : invoices.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-zinc-500 text-center gap-2 p-4 select-none">
                        <HelpCircle size={18} className="text-zinc-400" />
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">Sin facturas registradas en Stripe</p>
                          <p className="text-[9px] text-zinc-400 max-w-[270px] mx-auto leading-normal">
                            Tu historial real de pagos aparecerá automáticamente aquí al cobrarse mensualmente tu suscripción activa.
                          </p>
                        </div>
                      </div>
                    ) : (
                      invoices.map((inv, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 text-[11px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-200">{inv.id}</span>
                            <span className="text-[9px] text-zinc-500 dark:text-zinc-555">{inv.date}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-zinc-800 dark:text-white">{inv.amount}</span>
                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded text-[8px]">
                              {inv.status}
                            </span>
                            {inv.pdf ? (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-zinc-500 hover:text-brand cursor-pointer flex items-center justify-center" 
                                onClick={() => {
                                  if (onAddNotification) {
                                    onAddNotification('success', 'Descargando factura', `Abriendo PDF oficial de la factura ${inv.id}...`);
                                  }
                                  window.open(inv.pdf, '_blank');
                                }}
                              >
                                <ExternalLink size={12} />
                              </Button>
                            ) : (
                              <div className="w-6 h-6" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Separator className="bg-zinc-200 dark:bg-zinc-800" />

                {/* Cancel subscription block */}
                <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <AlertTriangle className="text-red-500 w-3.5 h-3.5" />
                      ¿Deseas dar de baja tu cuenta corporativa?
                    </h4>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 max-w-sm leading-normal text-left">
                      Al cancelar la suscripción, se detendrán los cobros futuros pero tu sitio web y esquema PostgreSQL permanecerán activos hasta el final de la facturación.
                    </p>
                  </div>
                  
                  {user.plan === 'none' ? (
                    <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700 bg-zinc-950">
                      Suscripción Cancelada
                    </Badge>
                  ) : (
                    <Button
                      onClick={() => {
                        const confirmCancel = window.confirm('¿Seguro que deseas cancelar tu suscripción a Avialo SaaS? Tu plan volverá al modo gratuito.');
                        if (confirmCancel) {
                          handleUpdatePlan('none');
                          setShowManageModal(false);
                        }
                      }}
                      disabled={isUpdatingPlan}
                      className="bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-500 font-bold text-[10px] rounded-xl py-4 px-3.5 cursor-pointer h-8 shrink-0 self-stretch md:self-auto text-center"
                    >
                      {isUpdatingPlan ? <Loader2 className="w-3 animate-spin mr-1" /> : null}
                      Dar de baja Plan B2B
                    </Button>
                  )}
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </motion.div>
    </div>
  );
}
