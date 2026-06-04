import { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CreditCard, Loader2, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown, Check,
  Building2, Zap, ShoppingBag, ExternalLink, Calendar, ShieldCheck, X, RefreshCw, Receipt
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
    label: 'Basic', price: 29, Icon: Building2, level: 1,
    features: ['1 sitio corporativo', '800 créditos IA/mes', 'PostgreSQL aislado', 'SSL incluido'],
  },
  dinamica: {
    label: 'Pro', price: 59, Icon: Zap, level: 2,
    features: ['1 sitio dinámico', '1500 créditos IA/mes', 'Reservas/CRM', 'Dominio propio', 'Soporte 24/7'],
  },
  ecommerce: {
    label: 'Ecommerce', price: 119, Icon: ShoppingBag, level: 3,
    features: ['1 tienda Medusa.js', '3000 créditos IA/mes', 'Pagos Stripe', 'Stock ilimitado', 'Soporte VIP'],
  },
};
const PLAN_ORDER = ['corporativa', 'dinamica', 'ecommerce'];

const STATUS_LABEL = {
  active: { text: 'Activa', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  trialing: { text: 'En prueba', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  past_due: { text: 'Pago pendiente', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  canceled: { text: 'Cancelada', cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
  unpaid: { text: 'Impagada', cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

const fmtDate = (ms) => ms ? new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtAmount = (cents, currency = 'eur') => cents != null
  ? `${(cents / 100).toFixed(2).replace('.', ',')} ${currency === 'eur' ? '€' : currency.toUpperCase()}`
  : '—';

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
      toast.success('Cancelación programada', { description: 'Mantienes el acceso hasta el final del periodo.' });
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
  const currentLevel = currentPlan ? (PLAN_META[currentPlan]?.level || 0) : 0;
  const statusInfo = sub?.status ? (STATUS_LABEL[sub.status] || { text: sub.status, cls: 'bg-muted text-muted-foreground border-border' }) : null;

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10 w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand tracking-wider uppercase mb-1">
          <CreditCard className="w-3.5 h-3.5" /> Facturación
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Tu suscripción</h1>
        <p className="text-muted-foreground text-sm mt-1.5">Gestiona tu plan, método de pago y facturas. Datos en tiempo real desde Stripe.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-brand" /> Cargando tu facturación…
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── Estado actual de la suscripción ── */}
          <Card className="glass border border-border/60 shadow-lg overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  Suscripción {currentPlan ? PLAN_META[currentPlan]?.label : ''}
                </CardTitle>
                {sub?.active && statusInfo && (
                  <span className={cn('px-3 py-1 rounded-full border text-xs font-bold', statusInfo.cls)}>
                    {sub.cancelAtPeriodEnd ? `Cancela el ${fmtDate(sub.currentPeriodEnd)}` : statusInfo.text}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {sub?.active ? (
                <>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Importe</p>
                      <p className="text-sm font-bold">{fmtAmount(sub.amount, sub.currency)} <span className="text-xs font-medium text-muted-foreground">/ {sub.interval === 'month' ? 'mes' : sub.interval}</span></p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" /> {sub.cancelAtPeriodEnd ? 'Acceso hasta' : 'Próxima renovación'}</p>
                      <p className="text-sm font-bold">{fmtDate(sub.currentPeriodEnd)}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Método de pago</p>
                      <p className="text-sm font-bold capitalize">
                        {sub.paymentMethod ? `${sub.paymentMethod.brand} •••• ${sub.paymentMethod.last4}` : 'Sin tarjeta'}
                      </p>
                    </div>
                  </div>

                  {sub.cancelAtPeriodEnd && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Tu suscripción se cancelará el {fmtDate(sub.currentPeriodEnd)}. Puedes reanudarla antes de esa fecha.
                    </div>
                  )}

                  <Separator className="my-5 bg-border/60" />

                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={handleUpdateCard} disabled={!!action}
                      className="gap-2 rounded-full h-10 text-xs font-bold border-border hover:bg-muted/80">
                      {action === 'card' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      Actualizar tarjeta
                    </Button>
                    {sub.cancelAtPeriodEnd ? (
                      <Button onClick={handleResume} disabled={!!action}
                        className="gap-2 rounded-full h-10 text-xs font-bold bg-brand hover:bg-brand/90 text-white">
                        {action === 'resume' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Reanudar suscripción
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => setConfirmCancel(true)} disabled={!!action}
                        className="gap-2 rounded-full h-10 text-xs font-bold border-red-300 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20">
                        {action === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        Cancelar suscripción
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm font-semibold text-foreground mb-1">No tienes una suscripción activa</p>
                  <p className="text-xs text-muted-foreground">Elige un plan abajo para activar tu cuenta.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Selector de planes ── */}
          <div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Planes disponibles</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {PLAN_ORDER.map((id) => {
                const meta = PLAN_META[id];
                const isCurrent = currentPlan === id;
                const isUpgrade = meta.level > currentLevel;
                const busy = action === `plan:${id}`;
                return (
                  <Card key={id} className={cn('relative border shadow-sm flex flex-col', isCurrent ? 'border-emerald-500 dark:border-emerald-400 shadow-[0_0_22px_-6px_rgba(16,185,129,0.3)]' : 'border-border/60 hover:border-brand/40')}>
                    <CardContent className="p-5 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-xl bg-brand/10 text-brand border border-brand/20"><meta.Icon className="w-5 h-5" /></div>
                        {isCurrent && <Badge className="bg-emerald-500 text-white text-[9px] font-extrabold border-none gap-1"><Check className="w-2.5 h-2.5" /> ACTUAL</Badge>}
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-wide">{meta.label}</h3>
                      <div className="flex items-baseline gap-1 mt-1 mb-3">
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
                          isCurrent ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default'
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
              <ShieldCheck className="w-3.5 h-3.5 text-brand" /> Los cambios de plan se prorratean automáticamente. Pagos seguros gestionados por Stripe.
            </p>
          </div>

          {/* ── Facturas reales ── */}
          <div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2"><Receipt className="w-4 h-4" /> Historial de facturas</h2>
            <Card className="glass border border-border/60 shadow-sm">
              <CardContent className="p-0">
                {invoices.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground">Aún no hay facturas.</div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-muted-foreground">{inv.id}</span>
                          <span className="text-xs text-muted-foreground">{inv.date}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-xs">{inv.amount}</span>
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                            inv.status === 'Pagada' ? 'bg-emerald-500/10 text-emerald-500' : inv.status === 'Pendiente' ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground')}>
                            {inv.status}
                          </span>
                          {inv.pdf && (
                            <a href={inv.pdf} target="_blank" rel="noreferrer" className="text-brand hover:text-brand-2 flex items-center gap-1 text-xs font-bold">
                              PDF <ExternalLink className="w-3 h-3" />
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
            <p className="text-sm text-muted-foreground mb-5">
              Mantendrás el acceso hasta el {fmtDate(sub?.currentPeriodEnd)}. Después, tu plan se desactivará. Podrás reanudarla antes de esa fecha.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmCancel(false)} className="rounded-xl text-xs font-semibold">Mantener plan</Button>
              <Button onClick={handleCancel} className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white">Sí, cancelar</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Checkout embedded (compra inicial / actualizar tarjeta) ── */}
      {checkoutSecret && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-border flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-wider">Pago seguro · Stripe</h3>
              </div>
              <button onClick={closeCheckout} className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest">Cerrar</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 bg-muted/20 min-h-[350px] flex flex-col justify-center">
              {!checkoutInstance && (
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="animate-spin text-brand" size={28} />
                  <p className="text-xs font-semibold text-muted-foreground">Cargando pasarela segura…</p>
                </div>
              )}
              <div id="billing-checkout-container" className={cn('w-full transition-opacity', checkoutInstance ? 'opacity-100' : 'opacity-0')} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
