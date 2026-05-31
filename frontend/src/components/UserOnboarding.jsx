import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, ArrowLeft, User, Briefcase, Users, LayoutGrid, Check, Info, AlertCircle, Loader2 } from 'lucide-react';
import { updateProfile } from '../lib/api';
import Logo from './ui/Logo';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DotPattern } from '@/components/ui/dot-pattern';
import { cn } from "@/lib/utils";

export default function UserOnboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [profession, setProfession] = useState('');
  const [role, setRole] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const professions = [
    { id: 'marketing', label: 'Marketing & Ventas', icon: Briefcase, desc: 'Promociono y vendo productos o servicios' },
    { id: 'freelance', label: 'Freelancer / Profesional', icon: User, desc: 'Trabajo por mi cuenta ofreciendo mis servicios' },
    { id: 'agency', label: 'Agencia Digital', icon: LayoutGrid, desc: 'Desarrollo webs y estrategias para múltiples clientes' },
    { id: 'sme', label: 'Dueño de Pyme', icon: Users, desc: 'Dirijo un negocio local o pequeña empresa' },
  ];

  const teamRoles = [
    { id: 'founder', label: 'Fundador / Solopreneur', desc: 'Gestiono y decido todo yo solo' },
    { id: 'tech', label: 'Líder Técnico / Desarrollador', desc: 'Me encargo de la tecnología y sistemas' },
    { id: 'designer', label: 'Diseñador / Creador', desc: 'Enfocado en la marca, contenido y estética' },
    { id: 'other', label: 'Socio de negocio o perfil administrativo', desc: 'Soporte y gestión interna de la empresa' },
  ];

  const plans = [
    {
      id: 'basic',
      name: 'Plan Basic',
      price: '29€',
      period: '/mes',
      desc: '1 sitio corporativo rápido con edits mensuales limitados por IA.',
      features: [
        '1 Sitio Web Corporativo completo',
        '20 Créditos de cambios por IA / mes',
        'Hasta 3 secciones en portada',
        'Dominio .avialo.app gratuito',
        'Soporte estándar por correo'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: 'Plan Pro',
      price: '59€',
      period: '/mes',
      desc: '1 sitio dinámico avanzado con IA Premium e iteraciones ilimitadas.',
      features: [
        '1 Sitio Web Dinámico completo',
        'Créditos de IA ilimitados',
        'Páginas y secciones ilimitadas',
        'Sistema de Reservas y Citas',
        'Dominio personalizado (.com, .es)',
        'Soporte prioritario 24/7'
      ],
      popular: true
    },
    {
      id: 'ecommerce',
      name: 'Plan Ecommerce',
      price: '119€',
      period: '/mes',
      desc: '1 tienda online de alto rendimiento con Medusa.js v2 y Stripe integrado.',
      features: [
        '1 Tienda Headless de alto rendimiento',
        'IA optimizada para catálogo y stock',
        'Créditos de IA ilimitados',
        'Pagos por Stripe 3D Secure',
        'SEO y analítica avanzada',
        'Soporte VIP inmediato'
      ],
      popular: false
    }
  ];

  const handleNext = async () => {
    if (step === 0 && !profession) return;
    if (step === 1 && !role) return;
    
    if (step === 2) {
      setLoading(true);
      setError('');
      try {
        localStorage.setItem('avialo_selected_plan', selectedPlan);
        
        // Guardar en la base de datos real del backend
        const updatedProfile = await updateProfile({
          profession,
          role,
          plan: 'none' // 'none' hasta que se concrete el pago en Stripe
        });

        onComplete({ ...updatedProfile, profession, role, plan: selectedPlan });
      } catch (err) {
        setError(err.message || 'Error al guardar el perfil en el servidor.');
      } finally {
        setLoading(false);
      }
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(prev => prev - 1);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 py-12 overflow-hidden bg-background">
      {/* Dot Pattern Background */}
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
        )}
      />

      {/* Brand Glowing Effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[var(--brand-glow)] rounded-full blur-3xl pointer-events-none opacity-60" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[var(--brand-glow)] rounded-full blur-3xl pointer-events-none opacity-40" />

      <motion.div
        layout
        className="w-full max-w-4xl bg-card/85 backdrop-blur-xl border border-border rounded-[2rem] shadow-2xl p-6 sm:p-10 md:p-12 relative z-10 overflow-hidden"
      >
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-glow)] border border-[var(--brand)]/20 flex items-center justify-center">
              <Logo className="w-5 h-5 text-[var(--brand)]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Personalizando tu entorno</span>
              <span className="text-sm font-bold text-[var(--brand)]">Paso {step + 1} de 3</span>
            </div>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  s === step ? 'w-10 bg-[var(--brand)]' : 'w-2.5 bg-muted border border-border'
                )}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex gap-2.5 items-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="min-h-[350px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 text-left"
              >
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-glow)] border border-[var(--brand)]/20 text-[var(--brand)] text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    <span>Te damos la bienvenida a Avialo Builder</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">¿A qué te dedicas principalmente?</h2>
                  <p className="text-muted-foreground text-sm max-w-xl">Queremos entender tu actividad para adecuar las sugerencias de la IA y los boilerplates.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {professions.map((p) => {
                    const Icon = p.icon;
                    const isSelected = profession === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setProfession(p.id)}
                        className={cn(
                          "relative p-5 rounded-2xl cursor-pointer border-2 transition-all flex items-start gap-4",
                          isSelected 
                            ? 'border-[var(--brand)] bg-[var(--brand-glow)]/10 shadow-md' 
                            : 'border-border bg-card/45 hover:border-[var(--brand)]/40'
                        )}
                      >
                        <div className={cn(
                          "p-2.5 rounded-xl shrink-0 transition-colors",
                          isSelected ? 'bg-[var(--brand)] text-white' : 'bg-muted text-muted-foreground border border-border'
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{p.label}</p>
                          <p className="text-muted-foreground text-[10px] mt-1 leading-normal">{p.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 text-left"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">¿Qué rol te define mejor en tu equipo?</h2>
                  <p className="text-muted-foreground text-sm max-w-xl">Adecuamos la complejidad de la consola de desarrollo a tu nivel técnico.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamRoles.map((r) => {
                    const isSelected = role === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setRole(r.id)}
                        className={cn(
                          "relative p-5 rounded-2xl cursor-pointer border-2 transition-all flex items-center justify-between",
                          isSelected 
                            ? 'border-[var(--brand)] bg-[var(--brand-glow)]/10 shadow-md' 
                            : 'border-border bg-card/45 hover:border-[var(--brand)]/40'
                        )}
                      >
                        <div className="text-left space-y-1">
                          <p className="text-sm font-bold text-foreground">{r.label}</p>
                          <p className="text-muted-foreground text-[10px] leading-normal">{r.desc}</p>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[var(--brand)] text-white flex items-center justify-center shrink-0 ml-3 shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 text-left"
              >
                <div className="space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">Elige tu Plan de Suscripción</h2>
                  <div className="p-4 bg-muted/60 border border-border rounded-2xl text-xs text-muted-foreground flex gap-3 items-center max-w-xl">
                    <Info className="w-4.5 h-4.5 text-[var(--brand)] shrink-0" />
                    <span>Cada suscripción mensual incluye alojamiento y soporte completo para exactamente <strong>1 sitio web activo</strong> con base de datos independiente.</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-5 items-stretch">
                  {plans.map((p) => {
                    const isSelected = selectedPlan === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlan(p.id)}
                        className={cn(
                          "relative p-5 rounded-2xl cursor-pointer border-2 transition-all flex flex-col justify-between bg-card/50",
                          isSelected
                            ? 'border-[var(--brand)] bg-[var(--brand-glow)]/15 shadow-xl ring-1 ring-[var(--brand)]/20'
                            : 'border-border hover:border-[var(--brand)]/40 bg-card/45'
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-foreground">{p.name}</span>
                            {p.popular && (
                              <Badge className="text-[8px] font-black bg-[var(--brand)] text-white px-2 py-0.5 rounded-full uppercase tracking-wider border-none">
                                RECOMENDADO
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-snug mb-4 h-10">{p.desc}</p>
                          <div className="flex items-baseline mb-4">
                            <span className="text-3xl font-black text-foreground">{p.price}</span>
                            <span className="text-muted-foreground text-xs font-semibold ml-0.5">{p.period}</span>
                          </div>
                          <ul className="space-y-2 border-t border-border pt-4">
                            {p.features.slice(0, 3).map((f, i) => (
                              <li key={i} className="flex gap-2 items-start text-[10px] font-medium text-foreground/80">
                                <Check className="w-3.5 h-3.5 text-[var(--brand)] shrink-0 mt-0.5" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-between items-center border-t border-border pt-6">
            {step > 0 ? (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={loading}
                className="gap-2 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver Atrás</span>
              </Button>
            ) : (
              <div />
            )}

            <Button
              onClick={handleNext}
              disabled={(step === 0 && !profession) || (step === 1 && !role) || loading}
              className={cn(
                "font-bold text-xs gap-2 shadow-lg px-6 h-10",
                ((step === 0 && !profession) || (step === 1 && !role)) && "opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando Datos...</span>
                </>
              ) : (
                <>
                  <span>{step === 2 ? 'Completar y Activar Suscripción' : 'Continuar'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
