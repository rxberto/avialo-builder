import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronLeft, ChevronRight, Rocket, ShieldCheck, 
  Sparkles, CheckCircle2, Circle, AlertCircle, Box, Server 
} from "lucide-react";
import StepBusinessData from './StepBusinessData';
import StepVoiceGoals from './StepVoiceGoals';
import StepWebType from './StepWebType';
import StepStructure from './StepStructure';
import StepBranding from './StepBranding';
import StepSummary from './StepSummary';
import { cn } from '@/lib/utils';
import { getProfile } from '../../lib/api';

const PASOS = [
  { label: 'Negocio', desc: 'Identidad y sector', detail: 'Datos básicos de tu empresa' },
  { label: 'Metas', desc: 'Objetivo y tono', detail: 'Estrategia de comunicación' },
  { label: 'Tipo', desc: 'Motor de la web', detail: 'Core de arquitectura web' },
  { label: 'Secciones', desc: 'Estructura', detail: 'Sitemap y páginas principales' },
  { label: 'Estilo', desc: 'Identidad visual', detail: 'Colores, fuentes y estética' },
  { label: 'Resumen', desc: 'Lanzamiento', detail: 'Hoja de ruta y compilación' }
];

export default function OnboardingFlow({ user, onComplete, onSyncProfile }) {
  const [paso, setPaso] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [datos, setDatos] = useState({
    businessName: '',
    sector: '',
    sectorOtro: '',
    city: '',
    phone: '',
    email: user?.email || '',
    description: '',
    logoBase64: '',
    customDomain: user?.siteDomain || '',
    mainGoal: 'ventas',
    toneOfVoice: 'cercano',
    targetAudience: 'general',
    webType: '',
    enabledFeatures: [],
    pages: ['Inicio', 'Contacto'],
    homeSections: ['Hero', 'Servicios', 'Testimonios', 'Llamada a la acción'],
    designMode: 'auto',
    aiPrompt: '',
    mood: 'modern',
    animationLevel: 'subtle',
    imageTreatment: 'realistic',
    primaryColor: '#1a56db',
    accentColor: '#f59e0b',
    typography: 'sans',
    uiStyle: 'rounded',
    colorTheme: 'light',
    spacingStyle: 'balanced',
  });

  useEffect(() => {
    if (user?.email && !datos.email) {
      setDatos(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        setLoadingSubscription(true);
        if (onSyncProfile) {
          await onSyncProfile();
        } else {
          const profile = await getProfile();
          const savedUserStr = localStorage.getItem('avialo_user');
          if (savedUserStr) {
            const savedUser = JSON.parse(savedUserStr);
            const updated = { ...savedUser, ...profile };
            localStorage.setItem('avialo_user', JSON.stringify(updated));
            localStorage.setItem('avialo_plan', profile.plan || 'none');
          }
        }
      } catch (err) {
        console.warn('⚠️ No se pudo comprobar la suscripción:', err);
      } finally {
        setTimeout(() => {
          setLoadingSubscription(false);
        }, 600);
      }
    };
    checkSubscription();
  }, []);

  const updateData = (campo, valor) => {
    setDatos(prev => ({ ...prev, [campo]: valor }));
  };

  const puedeAvanzar = () => {
    if (paso === 0) {
      const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email);
      const isSectorValid = datos.sector === 'Otro' ? datos.sectorOtro.trim() !== '' : datos.sector !== '';
      return datos.businessName.trim() !== '' && isSectorValid && datos.city.trim() !== '' && isEmailValid;
    }
    if (paso === 1) return datos.mainGoal !== '' && datos.toneOfVoice !== '' && datos.targetAudience !== '';
    if (paso === 2) return datos.webType !== '';
    if (paso === 3) return datos.pages.length >= 2;
    return true;
  };

  const handleNext = () => {
    if (puedeAvanzar()) {
      setShowErrors(false);
      const next = paso + 1;
      setPaso(next);
      setMaxReached(prev => Math.max(prev, next));
    } else {
      setShowErrors(true);
    }
  };

  const handlePrev = () => {
    setShowErrors(false);
    setPaso(p => Math.max(0, p - 1));
  };

  const handleComplete = () => {
    const aiContextObject = {
      customDomain: datos.customDomain,
      businessContext: {
        name: datos.businessName,
        industry: datos.sector === 'Otro' ? datos.sectorOtro : datos.sector,
        city: datos.city,
        contact: {
          phone: datos.phone || undefined,
          email: datos.email
        },
        description: datos.description || undefined,
        logoBase64: datos.logoBase64 || undefined
      },
      strategy: {
        primaryGoal: datos.mainGoal,
        toneOfVoice: datos.toneOfVoice,
        targetAudience: datos.targetAudience
      },
      websiteArchitecture: {
        type: datos.webType,
        backendFramework: datos.webType === 'ecommerce' ? 'Medusa.js' : 'Vite/Node',
        automatedFeatures: datos.enabledFeatures,
        siteNavigationOrder: datos.pages,
        homePageStructure: datos.homeSections
      },
      designAestheticPreference: {
        generationMode: datos.designMode,
        userPrompt: datos.aiPrompt || undefined,
        mood: datos.mood,
        animationLevel: datos.animationLevel,
        imageTreatment: datos.imageTreatment,
        typography: datos.typography,
        brandPrimaryHex: datos.primaryColor,
        brandAccentHex: datos.accentColor,
        interfaceStyle: datos.uiStyle,
        spacingDensity: datos.spacingStyle,
        baseTheme: datos.colorTheme
      }
    };
    
    const cleanObject = JSON.parse(JSON.stringify(aiContextObject));
    onComplete(cleanObject);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-brand selection:text-white">
      
      {/* Dynamic light glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand/5 dark:bg-brand/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full bg-brand-accent/5 dark:bg-brand-accent/10 blur-[140px]" />
      </div>

      <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-6 flex-1 justify-center">
        
        {/* Sleek, High-Fidelity Progress Stepper (Stripe / Claude Onboarding Hybrid) */}
        <div className="w-full space-y-4 px-2 select-none">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <div className="flex items-center gap-1.5 text-brand">
              <Sparkles size={13} className="animate-pulse text-brand" />
              <span className="font-extrabold">AVIALO IA</span>
            </div>
            <div className="bg-brand/10 text-brand border border-brand/20 px-2 py-0.5 rounded-full font-extrabold text-[10px]">
              PROGRESO: {Math.round(((paso + 1) / PASOS.length) * 100)}%
            </div>
          </div>

          {/* Connected Stepper Steps */}
          <div className="relative flex items-center justify-between w-full py-2">
            {/* Background connection line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-zinc-200 dark:bg-zinc-800 z-0 rounded-full">
              <motion.div 
                className="h-full bg-gradient-to-r from-brand to-brand-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(paso / (PASOS.length - 1)) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </div>

            {/* Steps interactive pills */}
            {PASOS.map((p, i) => {
              const isCurrent = paso === i;
              const isCompleted = i < paso;
              const isReachable = i <= maxReached;

              return (
                <button
                  key={i}
                  disabled={!isReachable}
                  onClick={() => setPaso(i)}
                  className="relative z-10 flex flex-col items-center gap-1.5 outline-none cursor-pointer group disabled:cursor-not-allowed"
                >
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.15 : 1,
                    }}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold border-2 transition-all duration-300",
                      isCurrent
                        ? "bg-brand border-brand text-white ring-4 ring-brand/15 dark:ring-brand/30 shadow-md shadow-brand/20"
                        : isCompleted
                          ? "bg-zinc-950 dark:bg-zinc-50 border-zinc-950 dark:border-zinc-50 text-white dark:text-zinc-950 shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-muted-foreground hover:border-zinc-400"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={10} className="stroke-[3]" />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </motion.div>

                  {/* Step Label (Hidden on small mobile) */}
                  <span
                    className={cn(
                      "text-[9px] font-extrabold uppercase tracking-wider transition-colors duration-300 hidden md:inline-block",
                      isCurrent 
                        ? "text-brand" 
                        : isCompleted 
                          ? "text-foreground" 
                          : "text-muted-foreground"
                    )}
                  >
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Subtext explaining active step */}
          <div className="text-center py-0.5">
            <p className="text-xs text-muted-foreground font-semibold">
              <span className="text-foreground font-extrabold">Configurando {PASOS[paso].label}:</span> {PASOS[paso].detail}
            </p>
          </div>
        </div>

        {/* Central Jotform card container */}
        <Card className="backdrop-blur-xl bg-white/70 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/40 shadow-2xl rounded-3xl w-full overflow-hidden">
          <CardContent className="p-6 sm:p-10 flex flex-col justify-between h-full min-h-[420px]">
            
            {/* Form Active Step Wrapper */}
            <div className="flex-1 relative">
              <AnimatePresence mode="wait">
                {paso === 0 && <StepBusinessData key="step0" datos={datos} updateData={updateData} showErrors={showErrors} />}
                {paso === 1 && <StepVoiceGoals key="step1" datos={datos} updateData={updateData} showErrors={showErrors} />}
                {paso === 2 && <StepWebType key="step2" datos={datos} updateData={updateData} showErrors={showErrors} user={user} loadingSubscription={loadingSubscription} />}
                {paso === 3 && <StepStructure key="step3" datos={datos} updateData={updateData} showErrors={showErrors} />}
                {paso === 4 && <StepBranding key="step4" datos={datos} updateData={updateData} showErrors={showErrors} />}
                {paso === 5 && <StepSummary key="step5" datos={datos} goToStep={(i) => { setShowErrors(false); setPaso(i); }} />}
              </AnimatePresence>
            </div>

            {/* Error validation banner */}
            {showErrors && (
              <div className="text-xs font-semibold text-destructive mt-4 animate-fade-in flex items-center gap-1.5 justify-end select-none">
                <AlertCircle size={13} />
                <span>Por favor, completa todos los campos requeridos marcados con *</span>
              </div>
            )}

            {/* Bottom Nav Bar */}
            <div className="mt-8 pt-6 border-t border-zinc-200/40 dark:border-zinc-800/40 flex items-center justify-between gap-4 select-none">
              
              <Button
                variant="ghost"
                size="lg"
                onClick={handlePrev}
                className={`gap-2 px-6 rounded-xl h-11 text-xs font-semibold transition-all ${paso === 0 ? 'invisible pointer-events-none' : ''}`}
              >
                <ChevronLeft className="h-4 w-4" />
                Atrás
              </Button>

              {paso < PASOS.length - 1 ? (
                <Button
                  size="lg"
                  onClick={handleNext}
                  className="gap-2 px-8 rounded-xl h-11 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 shadow-xl shadow-zinc-950/10 transition-transform active:scale-95 cursor-pointer"
                >
                  Continuar
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleComplete}
                  className="gap-2 px-8 rounded-xl h-11 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 shadow-xl shadow-zinc-950/10 transition-transform active:scale-95 cursor-pointer relative group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <Rocket className="h-4 w-4 shrink-0" />
                  Lanzar Proyecto Web
                </Button>
              )}

            </div>

          </CardContent>
        </Card>

        {/* Reassuring clean branding footer */}
        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-1.5 select-none pt-2">
          <ShieldCheck size={12} className="text-brand-success" />
          <span>Infraestructura Segura Multi-Tenant de AVIALO</span>
        </div>

      </div>

    </div>
  );
}
