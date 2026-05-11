import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Rocket } from "lucide-react";
import ProgressBar from './ProgressBar';
import StepBusinessData from './StepBusinessData';
import StepVoiceGoals from './StepVoiceGoals';
import StepWebType from './StepWebType';
import StepStructure from './StepStructure';
import StepBranding from './StepBranding';
import StepSummary from './StepSummary';

const PASOS = ['Negocio', 'Voz y Metas', 'Tipo de web', 'Estructura', 'Estilo', 'Resumen'];

export default function OnboardingFlow({ onComplete }) {
  const [paso, setPaso] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [datos, setDatos] = useState({
    businessName: '',
    sector: '',
    sectorOtro: '',
    city: '',
    phone: '',
    email: '',
    description: '',
    logoBase64: '',
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

  const handleComplete = () => {
    const aiContextObject = {
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
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 relative overflow-hidden flex flex-col pt-12 pb-24 px-4 sm:px-6 selection:bg-primary selection:text-primary-foreground">
      {/* Smooth Decorative Backgrounds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col relative z-10">
        
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-zinc-900/80 border-zinc-200/60 dark:border-zinc-800/60 shadow-2xl shadow-zinc-200/20 dark:shadow-black/40 rounded-3xl flex-1 flex flex-col overflow-hidden mt-6">
          <CardContent className="p-6 sm:p-10 flex-1 flex flex-col h-full">
            <ProgressBar pasos={PASOS} pasoActual={paso} maxReachedStep={maxReached} onStepClick={(i) => setPaso(i)} />

            <div className="flex-1 mt-10 relative min-h-[400px]">
              <AnimatePresence mode="wait">
                {paso === 0 && <StepBusinessData key="step0" datos={datos} updateData={updateData} />}
                {paso === 1 && <StepVoiceGoals key="step1" datos={datos} updateData={updateData} />}
                {paso === 2 && <StepWebType key="step2" datos={datos} updateData={updateData} />}
                {paso === 3 && <StepStructure key="step3" datos={datos} updateData={updateData} />}
                {paso === 4 && <StepBranding key="step4" datos={datos} updateData={updateData} />}
                {paso === 5 && <StepSummary key="step5" datos={datos} goToStep={setPaso} />}
              </AnimatePresence>
            </div>

            {/* Bottom Navigation Bar */}
            <div className="mt-12 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setPaso(p => Math.max(0, p - 1))}
                className={`gap-2 px-6 rounded-xl h-12 transition-all ${paso === 0 ? 'invisible pointer-events-none' : ''}`}
              >
                <ChevronLeft className="h-4 w-4" />
                Atrás
              </Button>

              {paso < PASOS.length - 1 ? (
                <Button
                  size="lg"
                  disabled={!puedeAvanzar()}
                  onClick={() => {
                    if (puedeAvanzar()) {
                      const next = paso + 1;
                      setPaso(next);
                      setMaxReached(prev => Math.max(prev, next));
                    }
                  }}
                  className="gap-2 px-8 rounded-xl h-12 font-medium shadow-xl shadow-zinc-950/10 transition-transform active:scale-95"
                >
                  Continuar
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleComplete}
                  className="gap-2 px-8 rounded-xl h-12 font-bold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 shadow-xl shadow-zinc-950/10 transition-transform active:scale-95"
                >
                  <Rocket className="h-4 w-4" />
                  Lanzar Proyecto
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
