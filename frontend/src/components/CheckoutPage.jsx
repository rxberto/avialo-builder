import { useState } from 'react';
import { motion } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Rocket, ShieldCheck, Zap, Globe, CheckCircle2,
  Loader2, CreditCard, Building2, ShoppingBag, Lock, Info, Building, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const PLANES = {
  corporativa: {
    nombre: 'Plan SaaS Basic',
    descripcion: '1 sitio corporativo completo. Cambios mensuales limitados por IA (20 edits/mes).',
    precio: 29,
    icono: Building2,
    color: 'blue',
    features: [
      '1 Sitio Web Corporativo completo',
      '20 Créditos de cambios por IA / mes',
      'Dominio .avialo.app incluido',
      'Base de datos multi-tenant aislada',
      'Soporte por email estándar',
    ],
  },
  dinamica: {
    nombre: 'Plan SaaS Pro',
    descripcion: '1 sitio dinámico avanzado (reservas, CRM) con cambios ilimitados e IA Premium.',
    precio: 59,
    icono: Zap,
    color: 'violet',
    features: [
      '1 Sitio Web Dinámico completo',
      'Créditos de cambios por IA ILIMITADOS',
      'Sistema de reservas y citas PostgreSQL',
      'IA Premium (Claude 3.5 Sonnet)',
      'Opción de dominio personalizado',
      'Soporte prioritario 24/7',
    ],
  },
  ecommerce: {
    nombre: 'Plan SaaS Ecommerce',
    descripcion: '1 tienda online de alto rendimiento con Medusa.js v2 y Stripe integrado.',
    precio: 119,
    icono: ShoppingBag,
    color: 'emerald',
    features: [
      '1 Tienda Headless de alto rendimiento',
      'Créditos de cambios por IA ILIMITADOS',
      'Medusa.js v2 + Next.js Storefront',
      'Catálogo y stock ilimitado',
      'Pagos por Stripe 3D Secure',
      'Soporte VIP inmediato',
    ],
  },
};

export default function CheckoutPage({ clientData, onSkipPayment, onPreRedirect }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Formulario B2B Facturación
  const [companyName, setCompanyName] = useState('');
  const [cif, setCif] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('España');

  const webType = clientData?.websiteArchitecture?.type || 'dinamica';
  const plan = PLANES[webType] || PLANES.dinamica;
  const PlanIcon = plan.icono;

  const handleCheckout = async () => {
    // Validar facturación B2B
    if (!companyName || !cif || !address || !city || !postalCode) {
      setShowValidationErrors(true);
      setError('Por favor, completa todos los datos de facturación de tu empresa.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (onPreRedirect) onPreRedirect();
      
      // Guardar datos de facturación localmente
      const billingData = { companyName, cif, address, city, postalCode, country };
      localStorage.setItem('avialo_billing_data', JSON.stringify(billingData));

      const session = await createCheckoutSession({
        clientData,
        billingData,
        priceId: `price_avialo_${webType}`,
        successUrl: `${window.location.origin}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}?payment=cancel`,
      });

      if (session.url) {
        window.location.href = session.url;
        return;
      }

      if (session.sessionId) {
        const stripe = await stripePromise;
        const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: session.sessionId });
        if (stripeError) throw new Error(stripeError.message);
      }
    } catch (err) {
      setError(err.message || 'Error al conectar con el sistema de pago.');
      setLoading(false);
    }
  };

  const handleSkipPaymentClick = () => {
    if (!companyName || !cif || !address || !city || !postalCode) {
      setShowValidationErrors(true);
      setError('Por favor, completa todos los datos de facturación de tu empresa antes de simular el pago.');
      return;
    }
    // Guardar datos de facturación localmente
    const billingData = { companyName, cif, address, city, postalCode, country };
    localStorage.setItem('avialo_billing_data', JSON.stringify(billingData));
    onSkipPayment();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 relative select-none">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/3 w-[35rem] h-[35rem] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Rocket size={13} className="text-indigo-500 animate-pulse" />
            <span>Despliegue Premium SaaS</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-b from-zinc-900 via-indigo-950 to-zinc-900 dark:from-zinc-50 dark:via-indigo-200 dark:to-zinc-50 bg-clip-text text-transparent leading-none">
            Activa tu cuenta de empresa
          </h1>
          <p className="text-zinc-550 dark:text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed">
            Completa la información de facturación de tu pyme y accede de forma inmediata a tu panel de desarrollo B2B.
          </p>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          
          {/* LEFT COLUMN (Span 3): B2B Billing Details & Secure Gateway */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Formulario Facturación B2B */}
            <Card className="border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl bg-white dark:bg-zinc-900 p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-850 pb-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
                  <Building size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold">Datos de Facturación (B2B)</h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-0.5">Necesario para la deducción del IVA intracomunitario</p>
                </div>
              </div>

              {showValidationErrors && (!companyName || !cif || !address || !city || !postalCode) && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex gap-2.5 items-center">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Por favor, completa todos los campos obligatorios marcados en rojo.</span>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-405 mb-1.5">Nombre de la Empresa / Razón Social *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Clinica Dental S.L."
                    className={cn(
                      "w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl px-3.5 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all",
                      showValidationErrors && !companyName ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5" : "border-zinc-200 dark:border-zinc-850"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-405 mb-1.5">CIF / NIF de Empresa *</label>
                  <input
                    type="text"
                    value={cif}
                    onChange={(e) => setCif(e.target.value)}
                    placeholder="B-12345678"
                    className={cn(
                      "w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl px-3.5 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all",
                      showValidationErrors && !cif ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5" : "border-zinc-200 dark:border-zinc-850"
                    )}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-405 mb-1.5">Dirección Fiscal *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle Gran Vía 45, Piso 3"
                    className={cn(
                      "w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl px-3.5 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all",
                      showValidationErrors && !address ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5" : "border-zinc-200 dark:border-zinc-850"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-405 mb-1.5">Ciudad *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Madrid"
                    className={cn(
                      "w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl px-3.5 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all",
                      showValidationErrors && !city ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5" : "border-zinc-200 dark:border-zinc-850"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-405 mb-1.5">Código Postal *</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="28013"
                    className={cn(
                      "w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl px-3.5 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all",
                      showValidationErrors && !postalCode ? "border-destructive ring-2 ring-destructive/20 bg-destructive/5" : "border-zinc-200 dark:border-zinc-850"
                    )}
                  />
                </div>
              </div>
            </Card>

            {/* Pasarela y Términos */}
            <Card className="border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl bg-white dark:bg-zinc-900 p-6 md:p-8 space-y-5">
              <div className="flex items-center gap-3">
                <Lock size={15} className="text-zinc-450 dark:text-zinc-500" />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Pasarela de Pago Segura</span>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-650 dark:text-red-400 text-xs font-bold leading-normal">
                  {error}
                </div>
              )}

              <Button
                size="lg"
                className="w-full h-14 text-xs font-bold gap-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xl shadow-zinc-900/10 transition-all active:scale-[0.98]"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                {loading ? 'Conectando con Stripe...' : `Activar Suscripción Mensual (${plan.precio}€)`}
              </Button>

              {/* Botón de prueba sin pago (solo dev) */}
              {import.meta.env.DEV && (
                <div className="pt-2 text-center border-t border-zinc-100 dark:border-zinc-850">
                  <button
                    onClick={handleSkipPaymentClick}
                    className="text-[10px] text-zinc-450 hover:text-zinc-650 dark:hover:text-zinc-300 underline underline-offset-2 transition-colors font-bold"
                  >
                    [DEV] Simular pago de suscripción y activar cuenta
                  </button>
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN (Span 2): Order Summary & Social Proof */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Resumen de Pedido */}
            <Card className="border-zinc-250 dark:border-zinc-800 rounded-3xl shadow-xl bg-zinc-900 text-zinc-50 overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <PlanIcon size={20} className="text-indigo-500" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">{plan.nombre}</h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">Facturación Mensual Recurrente</p>
                  </div>
                </div>

                <ul className="space-y-3.5 border-t border-b border-zinc-800 py-5">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex gap-2.5 items-start text-xs font-semibold text-zinc-300">
                      <CheckCircle2 size={15} className="text-indigo-500 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-2.5 text-xs font-semibold">
                  <div className="flex justify-between text-zinc-400">
                    <span>Base Imponible</span>
                    <span>{(plan.precio / 1.21).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>IVA (21%)</span>
                    <span>{(plan.precio - plan.precio / 1.21).toFixed(2)}€</span>
                  </div>
                  <Separator className="bg-zinc-800" />
                  <div className="flex justify-between font-black text-white text-sm">
                    <span>Total hoy</span>
                    <span>{plan.precio}€ / mes</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Testimonio B2B */}
            <Card className="border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl bg-white dark:bg-zinc-900 p-6 space-y-3 text-left">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className="text-yellow-400 text-xs">★</span>
                ))}
              </div>
              <p className="text-[10px] text-zinc-550 dark:text-zinc-400 leading-relaxed font-semibold italic">
                "Pagar los 59€/mes del Plan Pro de Avialo ha sido la mejor inversión. La IA generó nuestro portal de reservas PostgreSQL en una tarde y ahora hacemos todos los ajustes por chat."
              </p>
              <div className="flex items-center gap-2.5 pt-2">
                <span className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 block" />
                <div>
                  <p className="text-[10px] font-bold text-zinc-900 dark:text-zinc-550">Dr. Alejandro Sanz</p>
                  <p className="text-[9px] text-zinc-500">Fundador, Sanz Dental Madrid</p>
                </div>
              </div>
            </Card>

            {/* Garantía */}
            <div className="flex gap-3 items-center text-left text-zinc-450 dark:text-zinc-550">
              <ShieldCheck className="w-8 h-8 text-indigo-500 shrink-0" />
              <p className="text-[9px] font-bold leading-normal">
                Garantía total de reembolso por 7 días. Si no estás encantado con la web que genera la IA, cancelas y te devolvemos el 100% al instante.
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
