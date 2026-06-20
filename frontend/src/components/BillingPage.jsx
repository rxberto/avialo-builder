import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CreditCard, Loader2, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown, Check,
  Building2, Zap, ShoppingBag, ExternalLink, Calendar, ShieldCheck, X, RefreshCw, Receipt,
  Apple, Smartphone, Wallet, Sparkles, FileText, Star, Info, Hash,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  getSubscription, getRealInvoices, changePlan, cancelSubscription, resumeSubscription,
  updatePaymentMethod, createCheckoutSession,
} from '@/lib/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

// Metadatos de presentación de los 3 planes facturables (orden = nivel).
const PLAN_META = {
  corporativa: {
    label: 'Basic', price: 29, Icon: Building2, level: 1, credits: 800, popular: false,
    tagline: 'Sitio corporativo profesional',
    features: ['1 sitio corporativo', '800 créditos IA/mes', 'PostgreSQL aislado', 'SSL incluido'],
  },
  dinamica: {
    label: 'Pro', price: 59, Icon: Zap, level: 2, credits: 1500, popular: true,
    tagline: 'Reservas, CRM y dominio propio',
    features: ['1 sitio dinámico', '1500 créditos IA/mes', 'Reservas/CRM', 'Dominio propio', 'Soporte 24/7'],
  },
  ecommerce: {
    label: 'Ecommerce', price: 119, Icon: ShoppingBag, level: 3, credits: 3000, popular: false,
    tagline: 'Tienda online de alto rendimiento',
    features: ['1 tienda Medusa.js', '3000 créditos IA/mes', 'Pagos Stripe', 'Stock ilimitado', 'Soporte VIP'],
  },
};
const PLAN_ORDER = ['corporativa', 'dinamica', 'ecommerce'];

// Créditos IA máximos por plan (alineado con el backend y el Dashboard).
const PLAN_CREDITS = { none: 50, basic: 800, corporativa: 800, pro: 1500, dinamica: 1500, ecommerce: 3000 };

const STATUS_LABEL = {
  active: { text: 'Activa', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', dot: 'bg-emerald-500' },
  trialing: { text: 'En prueba', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20', dot: 'bg-blue-500' },
  past_due: { text: 'Pago pendiente', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20', dot: 'bg-amber-500' },
  canceled: { text: 'Cancelada', cls: 'bg-red-500/10 text-red-500 border-red-500/20', dot: 'bg-red-500' },
  unpaid: { text: 'Impagada', cls: 'bg-red-500/10 text-red-500 border-red-500/20', dot: 'bg-red-500' },
};

const fmtDate = (ms) => ms ? new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtDateShort = (ms) => ms ? new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—';
const fmtAmount = (cents, currency = 'eur') => cents != null
  ? `${(cents / 100).toFixed(2).replace('.', ',')} ${currency === 'eur' ? '€' : currency.toUpperCase()}`
  : '—';

// Lee los datos fiscales B2B que el usuario introdujo en el checkout (persistidos en localStorage).
const readBillingData = () => {
  try {
    const raw = localStorage.getItem('avialo_billing_data');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export default function BillingPage({ user, onSyncProfile, onAddNotification }) {
  const [sub, setSub] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState(null); // 'plan:<id>' | 'cancel' | 'resume' | 'card' | null
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Checkout embedded (compra inicial o actualización de tarjeta)
  const [checkoutSecret, setCheckoutSecret] = useState(null);
  const [checkoutInstance, setCheckoutInstance] = useState(null);

  const billing = useMemo(() => readBillingData(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, inv] = await Promise.all([
        getSubscription(),
        getRealInvoices().catch(() => ({ invoices: [] })),
      ]);
      setSub(s);
      setInvoices(inv.invoices || []);
    } catch (e) {
      setError(e.message || 'No se pudo cargar la facturación.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Si volvemos del flujo de tarjeta actualizada, refrescar y avisar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('card') === 'updated') {
      toast.success('Tarjeta actualizada', { description: 'Tu nuevo método de pago quedó guardado.' });
      window.history.replaceState({}, '', '/billing');
      load();
    }
  }, [load]);

  const mountCheckout = async (clientSecret) => {
    setCheckoutSecret(clientSecret);
    setTimeout(async () => {
      try {
        const stripe = await stripePromise;
        // Stripe.js (API dahlia): initEmbeddedCheckout() → createEmbeddedCheckoutPage({ fetchClientSecret }).
        const checkout = await stripe.createEmbeddedCheckoutPage({ fetchClientSecret: async () => clientSecret });
        checkout.mount('#billing-checkout-container');
        setCheckoutInstance(checkout);
      } catch (e) {
        setError(e.message || 'No se pudo cargar la pasarela de pago.');
        setCheckoutSecret(null);
      }
    }, 80);
  };

  const closeCheckout = () => {
    if (checkoutInstance) { checkoutInstance.destroy(); setCheckoutInstance(null); }
    setCheckoutSecret(null);
  };

  const handleChangePlan = async (plan) => {
    if (action) return;
    setAction(`plan:${plan}`);
    setError('');
    try {
      await changePlan(plan);
      toast.success('Plan actualizado', { description: `Tu suscripción ahora es ${PLAN_META[plan]?.label}. El prorrateo se aplica automáticamente.` });
      onAddNotification?.('success', 'Plan actualizado', `Has cambiado al plan ${PLAN_META[plan]?.label}.`);
      await onSyncProfile?.();
      await load();
    } catch (e) {
      if (e.needsCheckout) {
        // No hay suscripción activa: abrir Checkout para contratar este plan.
        try {
          const session = await createCheckoutSession({
            clientData: { websiteArchitecture: { type: plan } },
            successUrl: `${window.location.origin}/billing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/billing`,
          });
          if (session.clientSecret) { await mountCheckout(session.clientSecret); }
          else if (session.url) { window.location.href = session.url; }
          else { setError('No se pudo iniciar el pago.'); }
        } catch (ce) {
          setError(ce.message || 'No se pudo iniciar el pago.');
        }
      } else {
        setError(e.message || 'No se pudo cambiar de plan.');
      }
    } finally {
      setAction(null);
    }
  };

  const handleCancel = async () => {
    setAction('cancel');
    setConfirmCancel(false);
    try {
      await cancelSubscription();
      toast.success('Cancelación programada', { description: `Mantienes el acceso hasta el ${fmtDate(sub?.currentPeriodEnd)}. No habrá más cobros.` });
      await load();
    } catch (e) { setError(e.message); } finally { setAction(null); }
  };

  const handleResume = async () => {
    setAction('resume');
    try {
      await resumeSubscription();
      toast.success('Suscripción reanudada');
      await load();
    } catch (e) { setError(e.message); } finally { setAction(null); }
  };

  const handleUpdateCard = async () => {
    setAction('card');
    setError('');
    try {
      const { clientSecret } = await updatePaymentMethod();
      if (clientSecret) await mountCheckout(clientSecret);
      else setError('No se pudo iniciar la actualización de la tarjeta.');
    } catch (e) { setError(e.message); } finally { setAction(null); }
  };

  const currentPlan = sub?.plan && sub.plan !== 'none' ? sub.plan : null;
  const currentMeta = currentPlan ? PLAN_META[currentPlan] : null;
  const currentLevel = currentMeta?.level || 0;
  const statusInfo = sub?.status ? (STATUS_LABEL[sub.status] || { text: sub.status, cls: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' }) : null;
  const PlanIcon = currentMeta?.Icon || CreditCard;

  // Uso de créditos IA del periodo (datos reales del perfil del usuario).
  const maxCredits = PLAN_CREDITS[user?.plan] ?? PLAN_CREDITS[currentPlan] ?? 50;
  const remainingCredits = Math.max(0, user?.aiCredits ?? 0);
  const usedCredits = Math.max(0, maxCredits - remainingCredits);
  const creditsPercent = Math.min(100, Math.round((usedCredits / maxCredits) * 100));
  const creditsLow = remainingCredits <= maxCredits * 0.15;

  const hasFiscal = billing && (billing.companyName || billing.cif);

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-10 py-8 sm:py-10 w-full">
      {/* ── Encabezado ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand tracking-wider uppercase mb-1.5">
          <CreditCard className="w-3.5 h-3.5" /> Facturación
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Tu suscripción</h1>
        <p className="text-muted-foreground text-sm mt-1.5">Gestiona tu plan, créditos, método de pago y facturas. Datos en tiempo real desde Stripe.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="h-56 rounded-3xl bg-muted/40 border border-border/50 animate-pulse" />
          <div className="grid md:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => <div key={i} className="h-64 rounded-2xl bg-muted/40 border border-border/50 animate-pulse" />)}
          </div>
        </div>
      ) : (
        <div className="space-y-9">
          {/* ════════ HERO: estado de la suscripción ════════ */}
          {sub?.active ? (
            <Card className="relative overflow-hidden border-border/60 shadow-xl rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-brand/12 via-brand/[0.04] to-transparent pointer-events-none" />
              <div className="absolute -top-24 -right-16 w-72 h-72 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
              <CardContent className="relative p-6 md:p-8">
                <div className="grid lg:grid-cols-[1.35fr_1fr] gap-7">
                  {/* Lado izquierdo: plan + estado + créditos */}
                  <div className="min-w-0">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-2xl bg-brand/10 text-brand border border-brand/20 shrink-0">
                        <PlanIcon className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Plan actual</span>
                          {statusInfo && (
                            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold', statusInfo.cls)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', statusInfo.dot, sub.status === 'active' && 'animate-pulse')} />
                              {sub.cancelAtPeriodEnd ? `Cancela el ${fmtDateShort(sub.currentPeriodEnd)}` : statusInfo.text}
                            </span>
                          )}
                        </div>
                        <h2 className="text-2xl font-black tracking-tight mt-1 leading-none">
                          {currentMeta?.label || 'Suscripción'}
                          <span className="text-sm font-bold text-muted-foreground ml-2">
                            {fmtAmount(sub.amount, sub.currency)}<span className="text-xs font-medium">/{sub.interval === 'month' ? 'mes' : sub.interval}</span>
                          </span>
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">{currentMeta?.tagline}</p>
                      </div>
                    </div>

                    {/* Uso de créditos IA */}
                    <div className="mt-7 p-4 rounded-2xl bg-background/60 border border-border/50 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="flex items-center gap-1.5 text-xs font-bold">
                          <Sparkles className={cn('w-3.5 h-3.5', creditsLow ? 'text-amber-500' : 'text-brand')} /> Créditos IA este mes
                        </span>
                        <span className={cn('text-xs font-black tabular-nums', creditsLow ? 'text-amber-500' : 'text-foreground')}>
                          {remainingCredits.toLocaleString('es-ES')} <span className="text-muted-foreground font-semibold">/ {maxCredits.toLocaleString('es-ES')}</span>
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${creditsPercent}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={cn('h-full rounded-full', creditsLow ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-brand to-brand-2')}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {usedCredits.toLocaleString('es-ES')} usados · se reinician el {fmtDate(user?.creditsResetDate ? new Date(user.creditsResetDate).getTime() : sub.currentPeriodEnd)}
                      </p>
                    </div>
                  </div>

                  {/* Lado derecho: próximo cobro + método de pago + acciones */}
                  <div className="rounded-2xl bg-background/70 border border-border/60 p-5 flex flex-col backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Calendar className="w-3 h-3" /> {sub.cancelAtPeriodEnd ? 'Acceso hasta' : 'Próximo cobro'}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black tracking-tight">{sub.cancelAtPeriodEnd ? '—' : fmtAmount(sub.amount, sub.currency)}</span>
                      {!sub.cancelAtPeriodEnd && <span className="text-[11px] text-muted-foreground font-semibold">IVA incl.</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sub.cancelAtPeriodEnd ? `Sin más cobros. Activo hasta el ${fmtDate(sub.currentPeriodEnd)}.` : `El ${fmtDate(sub.currentPeriodEnd)}`}
                    </p>

                    <Separator className="my-4 bg-border/60" />

                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Método de pago</p>
                        <p className="text-sm font-bold capitalize truncate">
                          {sub.paymentMethod ? `${sub.paymentMethod.brand} •••• ${sub.paymentMethod.last4}` : 'Sin tarjeta guardada'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto pt-5 flex flex-col gap-2">
                      <Button variant="outline" onClick={handleUpdateCard} disabled={!!action}
                        className="gap-2 rounded-xl h-10 text-xs font-bold border-border hover:bg-muted/80 w-full justify-center">
                        {action === 'card' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                        Actualizar tarjeta
                      </Button>
                      {sub.cancelAtPeriodEnd ? (
                        <Button onClick={handleResume} disabled={!!action}
                          className="gap-2 rounded-xl h-10 text-xs font-bold bg-brand hover:bg-brand/90 text-white w-full justify-center">
                          {action === 'resume' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          Reanudar suscripción
                        </Button>
                      ) : (
                        <button onClick={() => setConfirmCancel(true)} disabled={!!action}
                          className="h-9 text-[11px] font-bold text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50">
                          Cancelar suscripción
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {sub.cancelAtPeriodEnd && (
                  <div className="relative mt-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Tu suscripción se cancelará el {fmtDate(sub.currentPeriodEnd)}. Conservas todo el acceso hasta esa fecha y puedes reanudarla cuando quieras.
                  </div>
                )}
                {sub.status === 'past_due' && (
                  <div className="relative mt-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    No pudimos cobrar tu último recibo. Actualiza tu tarjeta para no perder el acceso; Stripe reintentará el cobro automáticamente.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Sin suscripción activa */
            <Card className="relative overflow-hidden border-dashed border-2 border-border/70 rounded-3xl">
              <CardContent className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold">No tienes una suscripción activa</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Elige uno de los planes de abajo para activar tu cuenta y empezar a generar tu web con IA.</p>
              </CardContent>
            </Card>
          )}

          {/* ════════ Selector de planes ════════ */}
          <div>
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{currentPlan ? 'Cambiar de plan' : 'Planes disponibles'}</h2>
              <span className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1.5"><Info className="w-3 h-3" /> Prorrateo automático al cambiar</span>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {PLAN_ORDER.map((id) => {
                const meta = PLAN_META[id];
                const isCurrent = currentPlan === id;
                const isUpgrade = meta.level > currentLevel;
                const busy = action === `plan:${id}`;
                return (
                  <Card key={id} className={cn('relative border shadow-sm flex flex-col rounded-2xl transition-all',
                    isCurrent ? 'border-emerald-500 dark:border-emerald-400 shadow-[0_0_24px_-6px_rgba(16,185,129,0.35)]'
                      : meta.popular ? 'border-brand/50 shadow-[0_0_28px_-10px_var(--brand-glow)] hover:border-brand'
                      : 'border-border/60 hover:border-brand/40')}>
                    {meta.popular && !isCurrent && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                        <Badge className="bg-brand text-white text-[9px] font-extrabold border-none gap-1 px-2.5 py-0.5 shadow-md"><Star className="w-2.5 h-2.5 fill-white" /> MÁS POPULAR</Badge>
                      </div>
                    )}
                    <CardContent className="p-5 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className={cn('p-2 rounded-xl border', isCurrent ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-brand/10 text-brand border-brand/20')}><meta.Icon className="w-5 h-5" /></div>
                        {isCurrent && <Badge className="bg-emerald-500 text-white text-[9px] font-extrabold border-none gap-1"><Check className="w-2.5 h-2.5" /> ACTUAL</Badge>}
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-wide">{meta.label}</h3>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 mb-2 h-7">{meta.tagline}</p>
                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-2xl font-black">{meta.price}€</span>
                        <span className="text-[10px] text-muted-foreground">/ mes · IVA incl.</span>
                      </div>
                      <ul className="space-y-1.5 mb-5 flex-1">
                        {meta.features.map((f) => (
                          <li key={f} className="flex gap-1.5 items-center text-[11px] text-muted-foreground">
                            <Check className="w-3 h-3 text-brand shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => handleChangePlan(id)}
                        disabled={isCurrent || !!action}
                        className={cn('w-full rounded-xl h-10 text-xs font-bold gap-1.5',
                          isCurrent ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default hover:bg-emerald-500/10'
                            : 'bg-brand hover:bg-brand/90 text-white')}
                      >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : isCurrent ? <><Check className="w-3.5 h-3.5" /> Tu plan</>
                          : currentPlan ? (isUpgrade ? <><ArrowUp className="w-3.5 h-3.5" /> Mejorar</> : <><ArrowDown className="w-3.5 h-3.5" /> Cambiar</>)
                          : <>Contratar</>}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand" /> Al mejorar o cambiar de plan, Stripe prorratea automáticamente la diferencia. Pagos seguros con cifrado de extremo a extremo.
            </p>
          </div>

          {/* ════════ Datos fiscales + Facturas ════════ */}
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Datos de facturación (B2B) */}
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" /> Datos de facturación</h2>
              <Card className="glass border border-border/60 shadow-sm rounded-2xl">
                <CardContent className="p-5">
                  {hasFiscal ? (
                    <dl className="space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-xs text-muted-foreground font-semibold shrink-0">Empresa</dt>
                        <dd className="font-bold text-right">{billing.companyName || '—'}</dd>
                      </div>
                      <Separator className="bg-border/50" />
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-xs text-muted-foreground font-semibold shrink-0">NIF / CIF</dt>
                        <dd className="font-bold text-right font-mono tracking-wide">{billing.cif || '—'}</dd>
                      </div>
                      {(billing.address || billing.city || billing.postalCode) && (
                        <>
                          <Separator className="bg-border/50" />
                          <div className="flex items-start justify-between gap-3">
                            <dt className="text-xs text-muted-foreground font-semibold shrink-0">Dirección</dt>
                            <dd className="font-semibold text-right text-xs leading-relaxed">
                              {[billing.address, [billing.postalCode, billing.city].filter(Boolean).join(' '), billing.country].filter(Boolean).join(', ')}
                            </dd>
                          </div>
                        </>
                      )}
                      <div className="pt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Info className="w-3 h-3 shrink-0" /> Estos datos aparecen en tus facturas. Para cambiarlos, contacta con soporte.
                      </div>
                    </dl>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm font-semibold">Sin datos fiscales todavía</p>
                      <p className="text-xs text-muted-foreground mt-1">Se guardarán automáticamente al contratar tu primer plan.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Historial de facturas */}
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2"><Receipt className="w-4 h-4" /> Historial de facturas</h2>
              <Card className="glass border border-border/60 shadow-sm rounded-2xl">
                <CardContent className="p-0">
                  {invoices.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Aún no hay facturas. Aparecerán aquí tras tu primer cobro.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {invoices.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between px-5 py-3.5 gap-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate flex items-center gap-1"><Hash className="w-2.5 h-2.5 text-muted-foreground" />{inv.id}</p>
                              <p className="text-[11px] text-muted-foreground">{inv.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="font-black text-xs">{inv.amount}</p>
                              <span className={cn('text-[9px] font-bold uppercase tracking-wide',
                                inv.status === 'Pagada' ? 'text-emerald-500' : inv.status === 'Pendiente' ? 'text-amber-500' : 'text-muted-foreground')}>
                                {inv.status}
                              </span>
                            </div>
                            {inv.pdf && (
                              <a href={inv.pdf} target="_blank" rel="noreferrer" title="Descargar PDF"
                                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-brand hover:border-brand/40 transition-colors shrink-0">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Pie de confianza */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-2 text-muted-foreground">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Pagos cifrados por Stripe</span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold"><Apple className="w-3.5 h-3.5" /> Apple Pay</span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold"><Smartphone className="w-3.5 h-3.5" /> Google Pay</span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold"><CreditCard className="w-3.5 h-3.5" /> Tarjeta</span>
          </div>
        </div>
      )}

      {/* ── Confirmación de cancelación ── */}
      {confirmCancel && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmCancel(false)}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
              <h3 className="text-base font-bold">¿Cancelar tu suscripción?</h3>
            </div>
            <div className="text-sm text-muted-foreground mb-5 space-y-2">
              <p>
                No se corta nada hoy. Seguirás con <strong className="text-foreground">acceso completo a tu plan hasta el {fmtDate(sub?.currentPeriodEnd)}</strong>, el final del periodo que ya tienes pagado.
              </p>
              <p>
                Ese día el servicio se desactivará y <strong className="text-foreground">no se te volverá a cobrar</strong>. Puedes reanudarla en cualquier momento antes de esa fecha.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmCancel(false)} className="rounded-xl text-xs font-semibold">Mantener plan</Button>
              <Button onClick={handleCancel} className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white">Sí, cancelar</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Checkout embedded (compra inicial / actualizar tarjeta) ── */}
      {checkoutSecret && (
        <div className="fixed inset-0 z-[120] flex items-stretch sm:items-center justify-center bg-black/70 backdrop-blur-md sm:p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full sm:max-w-xl flex flex-col h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl overflow-hidden shadow-2xl sm:border border-border animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
            <div className="px-5 py-4 sm:px-6 flex items-center justify-between border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight leading-none">Pago seguro</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Cifrado · Avialo × Stripe
                  </p>
                </div>
              </div>
              <button onClick={closeCheckout} aria-label="Cerrar"
                className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative flex-1 overflow-y-auto bg-card px-3 sm:px-5 py-4">
              {!checkoutInstance && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-center bg-card">
                  <Loader2 className="animate-spin text-brand" size={28} />
                  <p className="text-xs font-semibold text-muted-foreground">Cargando pasarela segura…</p>
                </div>
              )}
              <div id="billing-checkout-container" className="w-full min-h-[340px]" />
            </div>
            <div className="px-5 sm:px-6 py-2.5 border-t border-border flex items-center justify-center gap-3 shrink-0 text-muted-foreground">
              <span className="flex items-center gap-1 text-[10px] font-semibold"><Apple className="w-3 h-3" /> Apple Pay</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold"><Smartphone className="w-3 h-3" /> Google Pay</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Stripe</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
