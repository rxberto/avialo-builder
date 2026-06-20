import { useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, X, ShieldCheck, Lock, Apple, Smartphone, CreditCard } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

// Apariencia del Payment Element acorde al tema de Avialo (claro/oscuro).
function buildAppearance() {
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return {
    theme: dark ? 'night' : 'stripe',
    variables: {
      colorPrimary: '#2563EB',
      colorBackground: dark ? '#18181b' : '#ffffff',
      borderRadius: '12px',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      spacingUnit: '4px',
    },
  };
}

/**
 * Panel de pago PROPIO de Avialo. Stripe actúa solo de pasarela: montamos Express Checkout
 * (Apple Pay / Google Pay como primera opción) + Payment Element dentro de nuestra UI y
 * confirmamos con stripe.confirmPayment / confirmSetup. Totalmente responsive (sheet en móvil).
 *
 * Props:
 *  - clientSecret: secret del PaymentIntent (intentMode='payment') o SetupIntent ('setup').
 *  - intentMode: 'payment' | 'setup'
 *  - returnUrl: a dónde vuelve Stripe si el método exige redirección (3DS/banco).
 *  - onSuccess(result): pago/guardado correcto sin redirección (result = intent confirmado).
 *  - onClose(): cerrar el modal.
 */
export default function StripePaymentModal({
  open,
  clientSecret,
  intentMode = 'payment',
  title = 'Pago seguro',
  subtitle = 'Cifrado de extremo a extremo · Avialo × Stripe',
  planLabel,
  amountLabel,
  PlanIcon,
  payButtonLabel,
  returnUrl,
  onSuccess,
  onClose,
}) {
  const [ready, setReady] = useState(false);
  const [walletsAvailable, setWalletsAvailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);

  useEffect(() => {
    if (!open || !clientSecret) return;
    let cancelled = false;
    let expressEl = null;
    let paymentEl = null;
    setReady(false);
    setWalletsAvailable(false);
    setError('');

    (async () => {
      const stripe = await stripePromise;
      if (cancelled || !stripe) return;
      stripeRef.current = stripe;

      const elements = stripe.elements({ clientSecret, appearance: buildAppearance() });
      elementsRef.current = elements;

      // Express Checkout = botones de Apple Pay / Google Pay (preferencia nº1 en móvil).
      // Solo en modo pago (en setup no aplica capturar wallet recurrente aquí).
      if (intentMode === 'payment') {
        try {
          expressEl = elements.create('expressCheckout', {
            buttonHeight: 48,
            layout: { maxColumns: 1, maxRows: 2, overflow: 'never' },
          });
          expressEl.on('ready', ({ availablePaymentMethods }) => {
            if (!cancelled) setWalletsAvailable(!!availablePaymentMethods);
          });
          expressEl.on('confirm', async () => {
            if (cancelled) return;
            setSubmitting(true);
            setError('');
            const { error: err } = await stripe.confirmPayment({
              elements,
              confirmParams: { return_url: returnUrl },
              redirect: 'if_required',
            });
            finalize(err);
          });
          expressEl.on('cancel', () => { if (!cancelled) setSubmitting(false); });
          expressEl.mount('#avialo-express-checkout');
        } catch { /* wallets no disponibles: seguimos con tarjeta */ }
      }

      paymentEl = elements.create('payment', {
        layout: { type: 'tabs', defaultCollapsed: false },
      });
      paymentEl.on('ready', () => { if (!cancelled) setReady(true); });
      paymentEl.on('loaderror', (e) => {
        if (!cancelled) setError(e?.error?.message || 'No se pudo cargar el formulario de pago. Recarga e inténtalo de nuevo.');
      });
      paymentEl.mount('#avialo-payment-element');
    })();

    return () => {
      cancelled = true;
      try { expressEl?.destroy(); } catch { /* noop */ }
      try { paymentEl?.destroy(); } catch { /* noop */ }
      stripeRef.current = null;
      elementsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientSecret, intentMode]);

  const finalize = (err) => {
    setSubmitting(false);
    if (err) { setError(err.message || 'No se pudo completar el pago. Revisa los datos e inténtalo de nuevo.'); return; }
    onSuccess?.();
  };

  const handleSubmit = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setError('');

    if (intentMode === 'setup') {
      const { error: err, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required',
      });
      setSubmitting(false);
      if (err) { setError(err.message || 'No se pudo guardar la tarjeta.'); return; }
      onSuccess?.(setupIntent);
      return;
    }

    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });
    finalize(err);
  };

  if (!open || !clientSecret) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-stretch sm:items-center justify-center bg-black/70 backdrop-blur-md sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-md flex flex-col h-full sm:h-auto sm:max-h-[94vh] sm:rounded-3xl overflow-hidden shadow-2xl sm:border border-zinc-200 dark:border-zinc-800 text-left animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Cabecera con marca Avialo */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black tracking-tight text-zinc-900 dark:text-white leading-none truncate">{title}</h3>
              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {subtitle}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen del plan (solo en pago) */}
        {intentMode === 'payment' && (planLabel || amountLabel) && (
          <div className="px-5 py-3 flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {PlanIcon && <PlanIcon className="w-4 h-4 text-brand shrink-0" />}
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">{planLabel}</span>
            </div>
            {amountLabel && (
              <span className="text-sm font-black text-zinc-900 dark:text-white shrink-0">
                {amountLabel} <span className="text-[10px] font-semibold text-zinc-400">/ mes · IVA incl.</span>
              </span>
            )}
          </div>
        )}

        {/* Cuerpo: wallets + Payment Element */}
        <div className="relative flex-1 overflow-y-auto px-5 py-5">
          {!ready && !error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-center bg-white dark:bg-zinc-900">
              <Loader2 className="animate-spin text-brand" size={28} />
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Cargando pasarela segura…</p>
            </div>
          )}

          {/* Express Checkout (Apple Pay / Google Pay) */}
          <div id="avialo-express-checkout" className={walletsAvailable ? 'mb-1' : ''} />
          {walletsAvailable && (
            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">o paga con tarjeta</span>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>
          )}

          {/* Payment Element (tarjeta y métodos) */}
          <div id="avialo-payment-element" className="min-h-[180px]" />

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-650 dark:text-red-400 text-xs font-bold leading-normal">
              {error}
            </div>
          )}
        </div>

        {/* Botón de pago + pie de confianza */}
        <div className="px-5 py-4 border-t border-zinc-150 dark:border-zinc-800 shrink-0 space-y-3 bg-white dark:bg-zinc-900">
          <button
            onClick={handleSubmit}
            disabled={!ready || submitting}
            className="w-full h-12 rounded-xl bg-brand hover:bg-brand/90 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand/20 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {submitting ? 'Procesando…' : (payButtonLabel || (intentMode === 'setup' ? 'Guardar tarjeta' : 'Pagar ahora'))}
          </button>
          <div className="flex items-center justify-center gap-3 text-zinc-400">
            <span className="flex items-center gap-1 text-[10px] font-semibold"><Apple className="w-3 h-3" /> Apple Pay</span>
            <span className="flex items-center gap-1 text-[10px] font-semibold"><Smartphone className="w-3 h-3" /> Google Pay</span>
            <span className="flex items-center gap-1 text-[10px] font-semibold"><CreditCard className="w-3 h-3" /> Tarjeta</span>
            <span className="flex items-center gap-1 text-[10px] font-semibold"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
