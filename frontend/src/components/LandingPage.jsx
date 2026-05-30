import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Check, Sparkles, Code, Globe, MessageSquare, 
  Smartphone, Zap, Shield, Play, ArrowUpRight, Cpu, 
  Database, ShoppingBag, Eye, RefreshCw, HelpCircle, 
  ChevronDown, Calendar, CreditCard, Sun, Moon, Info, Star 
} from 'lucide-react';
import Logo from './ui/Logo';
import { DotPattern } from './ui/dot-pattern';
import { AnimatedShinyText } from './ui/animated-shiny-text';
import { AnimatedGradientText } from './ui/animated-gradient-text';
import { ShimmerButton } from './ui/shimmer-button';
import { BorderBeam } from './ui/border-beam';
import { NumberTicker } from './ui/number-ticker';
import { cn } from '@/lib/utils';

export default function LandingPage({ onNavigate }) {
  // Simulator State
  const [activePreset, setActivePreset] = useState('dentist');
  const [isTyping, setIsTyping] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'user',
      text: 'Avialo, crea una web para mi clínica dental y añade un calendario de citas con PostgreSQL.'
    },
    {
      sender: 'ai',
      text: '¡Entendido! He generado un sitio corporativo médico completo. Activé el esquema PostgreSQL y un módulo interactivo de citas. Las reservas se guardan en tiempo real.'
    }
  ]);

  // Simulated appointment state for dentist preset
  const [selectedDate, setSelectedDate] = useState(null);
  const [appointmentConfirmed, setAppointmentConfirmed] = useState(false);

  // Simulated purchase state for ecommerce preset
  const [cartCount, setCartCount] = useState(0);
  const [checkoutOpened, setCheckoutOpened] = useState(false);
  const [purchaseCompleted, setPurchaseCompleted] = useState(false);

  // Simulated course state for academy preset
  const [activeLesson, setActiveLesson] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  // Presets configuration
  const presets = {
    dentist: {
      title: 'Clínica Dental Dentalia',
      prompt: 'Avialo, crea una web para mi clínica dental y añade un calendario de citas con PostgreSQL.',
      reply: '¡Entendido! He generado un sitio corporativo médico completo. Activé el esquema PostgreSQL y un módulo interactivo de citas. Las reservas se guardan en tiempo real.',
      features: ['Esquema Postgres Aislado', 'Formularios Reactivos', 'Citas Inmediatas']
    },
    ecommerce: {
      title: 'AERO-KICKS Store',
      prompt: 'Quiero vender zapatillas online con un eCommerce headless súper rápido.',
      reply: '¡Perfecto! He aprovisionado una tienda headless con Medusa.js v2 y Stripe en la base de datos de tu esquema aislado. El catálogo carga al instante.',
      features: ['Medusa.js v2 Headless', 'Stripe Directo', 'Carga < 100ms']
    },
    academy: {
      title: 'Cody-Academy',
      prompt: 'Añade una academia online con cursos premium y protección de contenidos.',
      reply: 'Hecho. He estructurado la base de datos de lecciones y el panel de alumnos para tu academia SaaS. Autenticación y visualización de vídeo integrados.',
      features: ['Autenticación Segura', 'Control de Progreso', 'Streaming Aislado']
    }
  };

  // Change preset with simulation effect
  const handlePresetChange = (presetKey) => {
    if (presetKey === activePreset) return;
    setIsCompiling(true);
    setIsTyping(true);
    setSelectedDate(null);
    setAppointmentConfirmed(false);
    setCartCount(0);
    setCheckoutOpened(false);
    setPurchaseCompleted(false);
    setIsPlaying(false);

    setChatMessages([
      { sender: 'user', text: presets[presetKey].prompt }
    ]);

    setTimeout(() => {
      setIsTyping(false);
      setChatMessages(prev => [
        ...prev,
        { sender: 'ai', text: presets[presetKey].reply }
      ]);
      setTimeout(() => {
        setIsCompiling(false);
        setActivePreset(presetKey);
      }, 500);
    }, 1200);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 15 } }
  };

  const plans = [
    {
      name: 'Plan Basic',
      price: '29€',
      period: '/mes',
      description: '1 sitio corporativo completo. Cambios y modificaciones por IA limitados.',
      features: [
        '1 Sitio Web completo',
        '20 Créditos de cambios por IA / mes',
        'Boilerplate corporativo estándar',
        'Dominio .avialo.app incluido',
        'Soporte por email estándar'
      ],
      cta: 'Elegir Plan Basic',
      popular: false,
      tier: 'basic'
    },
    {
      name: 'Plan Pro',
      price: '59€',
      period: '/mes',
      description: '1 sitio dinámico avanzado con créditos de cambios ilimitados y reservas.',
      features: [
        '1 Sitio Web completo',
        'Créditos de IA ILIMITADOS',
        'Sistema de reservas y citas integrado',
        'Dashboard privado de clientes y admin',
        'Dominio personalizado (.com, .es)',
        'Soporte prioritario 24/7'
      ],
      cta: 'Elegir Plan Pro',
      popular: true,
      tier: 'pro'
    },
    {
      name: 'Plan Ecommerce',
      price: '119€',
      period: '/mes',
      description: '1 tienda online de alto rendimiento con Medusa.js v2 y Stripe integrado.',
      features: [
        '1 Sitio Ecommerce completo',
        'Créditos de IA ILIMITADOS',
        'Catálogo headless ultra rápido',
        'Gestión de stock y pasarela Stripe',
        'SEO y analítica avanzada',
        'Soporte técnico VIP inmediato'
      ],
      cta: 'Elegir Plan Ecommerce',
      popular: false,
      tier: 'ecommerce'
    }
  ];

  const faqs = [
    {
      q: '¿Qué es exactamente Avialo Builder?',
      a: 'Avialo Builder es una plataforma de desarrollo autónoma basada en Inteligencia Artificial de última generación. A partir de una descripción en español, es capaz de diseñar, estructurar el código, aprovisionar bases de datos PostgreSQL aisladas y desplegar una web interactiva full-stack en minutos.'
    },
    {
      q: '¿Qué significa que cada cuenta incluye 1 Sitio Web activo?',
      a: 'Para mantener la máxima estabilidad y potencia dedicada en nuestros servidores, cada plan asignado incluye exactamente un sitio web en producción completo, con su base de datos aislada y sus dominios. Puedes iterar y modificar este sitio de forma ilimitada si tienes el Plan Pro o Ecommerce.'
    },
    {
      q: '¿Puedo cambiar de plan o cancelar en cualquier momento?',
      a: 'Sí, totalmente. No tenemos ningún tipo de permanencia. Puedes subir, bajar de nivel o cancelar tu plan de forma inmediata desde el apartado de Ajustes en tu panel de control.'
    },
    {
      q: '¿Cómo funciona la base de datos PostgreSQL aislada?',
      a: 'Cada sitio web generado por la IA en Avialo tiene su propio contenedor y esquema de base de datos PostgreSQL totalmente independiente. Esto asegura que la información de tus citas, leads o ventas esté 100% segura y aislada de otros tenants.'
    },
    {
      q: '¿El eCommerce incluye pasarela de pago real?',
      a: 'Sí. El Plan Ecommerce genera un frontend headless de alto rendimiento conectado a Medusa.js v2 e integra de forma automática la pasarela Stripe para cobros y control de inventario en tiempo real.'
    }
  ];

  return (
    <div className="bg-background text-foreground overflow-x-hidden min-h-screen relative select-none">
      {/* Background Dot Pattern with Mask */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <DotPattern
          className={cn(
            "[mask-image:radial-gradient(1000px_circle_at_center,white,transparent)] opacity-60 dark:opacity-40"
          )}
        />
      </div>

      {/* Modern fluid background blur blobs */}
      <div className="absolute top-[-150px] left-[10%] w-[50rem] h-[50rem] bg-indigo-500/10 dark:bg-brand/12 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[7s] z-0" />
      <div className="absolute top-[-100px] right-[10%] w-[45rem] h-[45rem] bg-purple-500/10 dark:bg-brand-2/12 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[9s] z-0" />
      <div className="absolute top-[30%] left-[25%] w-[40rem] h-[40rem] bg-pink-500/5 dark:bg-brand-accent/5 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-16 md:pt-36 md:pb-24 flex flex-col items-center justify-center text-center px-6 max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center w-full"
        >
          {/* Animated Glow Pill Badge */}
          <motion.div variants={itemVariants} className="mb-8">
            <AnimatedGradientText className="px-5 py-2">
              <Sparkles className="w-4 h-4 mr-2 text-indigo-500 dark:text-brand animate-spin duration-[4s]" />
              <span className="text-xs font-semibold tracking-wide bg-gradient-to-r from-zinc-850 to-zinc-650 dark:from-zinc-100 dark:to-zinc-350 bg-clip-text text-transparent">
                Plataforma SaaS de Desarrollo Autónomo v2.0
              </span>
              <ArrowRight className="w-3.5 h-3.5 ml-2 text-indigo-500 dark:text-brand" />
            </AnimatedGradientText>
          </motion.div>

          {/* Spectacular Centralized, Ultra-Modern and Stable H1 */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black tracking-tight mb-8 leading-[1.05] max-w-5xl text-zinc-900 dark:text-white"
          >
            Tu web full-stack, <br className="hidden sm:inline" />
            creada por IA y{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-brand dark:via-brand-accent dark:to-brand-2">
              editable en vivo.
            </span>
          </motion.h1>

          {/* Spectacular Subtitle Description */}
          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg md:text-xl text-zinc-500 dark:text-zinc-400 mb-12 max-w-3xl font-medium leading-relaxed"
          >
            Describe tu negocio en español. Nuestra IA diseña interfaces espectaculares, escribe código limpio, aprovisiona bases de datos <span className="text-zinc-800 dark:text-zinc-100 font-semibold underline decoration-indigo-500/40">PostgreSQL reales</span> y despliega de inmediato. Luego, realiza cualquier cambio conversando por chat.
          </motion.p>

          {/* Spectacular CTAs */}
          <motion.div 
            variants={itemVariants} 
            className="flex flex-col sm:flex-row gap-5 justify-center items-center w-full sm:w-auto mb-14"
          >
            <ShimmerButton
              onClick={() => onNavigate('register')}
              className="px-8 py-4.5 text-sm font-black tracking-wider shadow-xl shadow-indigo-500/10 dark:shadow-brand/10 transition-transform active:scale-[0.98]"
              borderRadius="1rem"
              shimmerColor="var(--brand-accent)"
              background="linear-gradient(135deg, var(--brand), var(--brand-2))"
            >
              <span>EMPEZAR CON MI CUENTA SAAS</span>
              <ArrowRight className="w-4 h-4" />
            </ShimmerButton>

            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-8 py-4.5 rounded-2xl bg-white hover:bg-zinc-50 dark:bg-zinc-900/60 dark:hover:bg-zinc-850/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 font-bold transition-all duration-300 text-xs active:scale-[0.98] shadow-sm"
            >
              Ver Planes y Características
            </a>
          </motion.div>

          {/* Responsive Row of Elegant Mini-Badges directly below Hero buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-3.5 max-w-4xl mx-auto mb-16 px-4"
          >
            <div className="flex items-center gap-2 px-4.5 py-2.5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/80 rounded-full shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                ⚡ Despliegue en 42s
              </span>
            </div>
            <div className="flex items-center gap-2 px-4.5 py-2.5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/80 rounded-full shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                🗄️ Postgres Aislado
              </span>
            </div>
            <div className="flex items-center gap-2 px-4.5 py-2.5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/80 rounded-full shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
              <ShoppingBag className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                🛍️ eCommerce Headless
              </span>
            </div>
            <div className="flex items-center gap-2 px-4.5 py-2.5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/80 rounded-full shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
              <Check className="w-3.5 h-3.5 text-brand-success" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                💳 Stripe & Reservas
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Live IDE Simulator Interactive Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, type: 'spring', bounce: 0.2 }}
          className="relative max-w-6xl mx-auto mt-4 w-full rounded-3xl border border-zinc-200 dark:border-zinc-800/80 overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_100px_rgba(124,58,237,0.08)] bg-card/75 backdrop-blur-2xl"
        >
          {/* Moving border beam */}
          <BorderBeam size={280} duration={12} borderWidth={2} colorFrom="var(--brand)" colorTo="var(--brand-accent)" />

          {/* Editor Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-zinc-100/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-850">
            <div className="flex gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-red-400 block cursor-pointer hover:bg-red-500 transition-colors" />
              <span className="w-3.5 h-3.5 rounded-full bg-yellow-400 block cursor-pointer hover:bg-yellow-500 transition-colors" />
              <span className="w-3.5 h-3.5 rounded-full bg-green-400 block cursor-pointer hover:bg-green-500 transition-colors" />
            </div>
            
            {/* Live Mode Tag */}
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-200/60 dark:bg-zinc-900/60 px-6 py-1.5 rounded-lg border border-zinc-300/20 flex items-center gap-1.5 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-brand animate-pulse" />
              <span>avialobuilder.com/editor-ide/tenant-08</span>
            </div>

            {/* View Mode badge */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-success bg-brand-success/15 border border-brand-success/20 px-2.5 py-1 rounded-full animate-pulse-glow">
                ● LIVE SYNC
              </span>
            </div>
          </div>

          <div className="min-h-[520px] lg:h-[580px] bg-zinc-50/50 dark:bg-zinc-950/40 flex flex-col md:flex-row relative">
            {/* Left Chat & Control Panel */}
            <div className="w-full md:w-[350px] border-r border-zinc-200 dark:border-zinc-850 p-6 flex flex-col justify-between bg-white dark:bg-zinc-900/90 text-left shrink-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 dark:bg-brand/10 flex items-center justify-center">
                      <Logo className="w-4 h-4 text-indigo-600 dark:text-brand" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-850 dark:text-zinc-200">Avialo Engine</span>
                  </div>
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-bold">GPT-4o / Claude 3.5</span>
                </div>

                {/* Preset Switcher inside the IDE */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">Probar caso de uso:</span>
                  <div className="grid grid-cols-3 gap-1.5 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <button 
                      onClick={() => handlePresetChange('dentist')}
                      className={cn(
                        "text-[9px] font-black uppercase py-2 px-1 rounded-lg transition-all text-center",
                        activePreset === 'dentist' 
                          ? "bg-white dark:bg-zinc-850 text-indigo-600 dark:text-brand shadow-sm font-bold border border-zinc-200/50 dark:border-zinc-800" 
                          : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-650"
                      )}
                    >
                      Médico
                    </button>
                    <button 
                      onClick={() => handlePresetChange('ecommerce')}
                      className={cn(
                        "text-[9px] font-black uppercase py-2 px-1 rounded-lg transition-all text-center",
                        activePreset === 'ecommerce' 
                          ? "bg-white dark:bg-zinc-850 text-indigo-600 dark:text-brand shadow-sm font-bold border border-zinc-200/50 dark:border-zinc-800" 
                          : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-650"
                      )}
                    >
                      eCommerce
                    </button>
                    <button 
                      onClick={() => handlePresetChange('academy')}
                      className={cn(
                        "text-[9px] font-black uppercase py-2 px-1 rounded-lg transition-all text-center",
                        activePreset === 'academy' 
                          ? "bg-white dark:bg-zinc-850 text-indigo-600 dark:text-brand shadow-sm font-bold border border-zinc-200/50 dark:border-zinc-800" 
                          : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-650"
                      )}
                    >
                      Academia
                    </button>
                  </div>
                </div>

                {/* Simulated Conversation */}
                <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
                  <AnimatePresence mode="popLayout">
                    {chatMessages.map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          "p-3.5 rounded-2xl text-xs leading-relaxed border shadow-sm",
                          msg.sender === 'user'
                            ? "bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-850 text-right"
                            : "bg-indigo-50/50 dark:bg-indigo-950/15 border-indigo-100/60 dark:border-indigo-900/10 text-indigo-900 dark:text-indigo-350"
                        )}
                      >
                        <div className="font-black text-[9px] uppercase tracking-wider mb-1 block">
                          {msg.sender === 'user' ? 'Roberto (Tú)' : 'Avialo AI'}
                        </div>
                        {msg.text}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Typing Indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1.5 p-3 bg-zinc-100 dark:bg-zinc-950/60 border border-border/50 rounded-xl max-w-fit"
                    >
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Chat Input Field (Disabled for simulator, with custom helper) */}
              <div className="mt-4 pt-4 border-t border-zinc-150 dark:border-zinc-850">
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    placeholder="Escribe para modificar en vivo..."
                    className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-4 pr-10 py-3.5 text-xs focus:outline-none placeholder:text-zinc-400 font-medium"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
                    <MessageSquare size={14} />
                  </div>
                </div>
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block mt-2 text-center font-semibold uppercase tracking-wider">
                  💡 Haz clic en los botones de arriba para iterar
                </span>
              </div>
            </div>

            {/* Right Live-Updating Visual Preview Panel */}
            <div className="flex-1 p-6 flex flex-col bg-zinc-100/50 dark:bg-zinc-900/20 relative items-center justify-center overflow-hidden min-h-[360px] md:min-h-0">
              {/* Compiling/Updating overlay */}
              <AnimatePresence>
                {isCompiling && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/70 dark:bg-zinc-950/75 backdrop-blur-md z-30 flex flex-col items-center justify-center"
                  >
                    <RefreshCw className="w-10 h-10 text-indigo-500 dark:text-brand animate-spin mb-4" />
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-250 animate-pulse">
                      Compilando código y esquemas PostgreSQL...
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Visual Frame */}
              <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-850 flex flex-col overflow-hidden max-w-lg lg:max-w-none">
                {/* Visual Frame Nav Bar */}
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850/60 px-5 py-3 bg-zinc-50/50 dark:bg-zinc-900">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-success block animate-pulse" />
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                      {activePreset === 'dentist' && 'clinica-dentalia.avialo.app'}
                      {activePreset === 'ecommerce' && 'aero-kicks.avialo.app'}
                      {activePreset === 'academy' && 'cody-academy.avialo.app'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-zinc-150 dark:bg-zinc-950 px-2 py-0.5 rounded-lg border border-border/20 text-[9px] font-black tracking-wider text-zinc-400 dark:text-zinc-550 uppercase">
                    PROVIEW MODE
                  </div>
                </div>

                {/* Simulated Webpage Contents */}
                <div className="p-6 flex-1 flex flex-col overflow-y-auto space-y-5 text-left text-xs bg-zinc-50/20 dark:bg-zinc-950/10">
                  {/* Preset 1: Dentist Layout */}
                  {activePreset === 'dentist' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4 flex-1 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                            🦷 Dentalia Premium
                          </span>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-500 py-0.5 px-2 rounded-full border border-emerald-500/20 font-bold">
                            ★ 4.9 (184 reseñas)
                          </span>
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-450 leading-relaxed text-[11px]">
                          Cuidamos de tu sonrisa con tecnología avanzada e implantes indoloros. Reserva tu primera cita gratis hoy mismo.
                        </p>
                      </div>

                      {/* Interactive Postgres Booking Widget */}
                      <div className="border border-indigo-200/50 dark:border-indigo-900/30 rounded-2xl p-4 bg-indigo-50/20 dark:bg-indigo-950/10 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
                            📅 Agenda Online (PostgreSQL)
                          </span>
                          <span className="text-[9px] text-indigo-500 font-bold animate-pulse">2 Huecos Libres Hoy</span>
                        </div>

                        {!appointmentConfirmed ? (
                          <div className="space-y-3">
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block mb-1">Elige una fecha para reservar cita al instante:</span>
                            <div className="grid grid-cols-4 gap-1.5">
                              {['Lun 22', 'Mar 23', 'Mié 24', 'Jue 25'].map((date) => (
                                <button
                                  key={date}
                                  onClick={() => setSelectedDate(date)}
                                  className={cn(
                                    "py-2 rounded-xl text-[10px] font-bold border transition-all text-center",
                                    selectedDate === date
                                      ? "bg-indigo-500 dark:bg-brand text-white border-transparent shadow-md"
                                      : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-350 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                                  )}
                                >
                                  {date}
                                </button>
                              ))}
                            </div>
                            <button
                              disabled={!selectedDate}
                              onClick={() => setAppointmentConfirmed(true)}
                              className="w-full mt-2 py-2.5 bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-950 rounded-xl text-[10px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
                            >
                              Reservar cita al instante
                            </button>
                          </div>
                        ) : (
                          <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="py-4 text-center space-y-2.5"
                          >
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-500/20">
                              <Check size={16} />
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-zinc-850 dark:text-zinc-200 block uppercase tracking-wider">¡Cita Guardada Exitosamente!</span>
                              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block mt-1">
                                Confirmado para el <strong className="text-indigo-650 dark:text-brand">{selectedDate}</strong> a las 10:00h en PostgreSQL.
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setAppointmentConfirmed(false);
                                setSelectedDate(null);
                              }}
                              className="text-[9px] text-indigo-500 dark:text-brand hover:underline font-bold"
                            >
                              Volver a agendar
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Preset 2: Ecommerce Medusa Layout */}
                  {activePreset === 'ecommerce' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4 flex-1 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-black tracking-widest text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 uppercase">
                          <ShoppingBag size={14} className="text-purple-500" /> AERO-KICKS
                        </span>
                        <div className="relative bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full border border-border/40 text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                          <span>🛒 Cesta</span>
                          <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold">
                            {cartCount}
                          </span>
                        </div>
                      </div>

                      {/* Product Grid */}
                      <div className="grid grid-cols-2 gap-3.5">
                        {[
                          { name: 'Aero Max v2', price: '89,00 €', color: 'de oklch(0.55 0.22 270)' },
                          { name: 'Cloud Walker', price: '120,00 €', color: 'de oklch(0.65 0.2 25)' }
                        ].map((prod, i) => (
                          <div 
                            key={i} 
                            className="bg-white dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-200/50 dark:border-zinc-800 flex flex-col justify-between h-[130px] shadow-sm relative group"
                          >
                            <div>
                              <span className="text-[10px] font-bold text-zinc-850 dark:text-zinc-200 block truncate">{prod.name}</span>
                              <span className="text-[9px] text-zinc-400 dark:text-zinc-550 block">Medusa.js Engine</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 mx-auto flex items-center justify-center my-1 text-[8px] text-zinc-400 font-bold border border-dashed border-zinc-300 dark:border-zinc-700">
                              IMG MOCK
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">{prod.price}</span>
                              <button
                                onClick={() => setCartCount(c => c + 1)}
                                className="w-5 h-5 rounded-lg bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs shadow"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Medusa Checkout Module */}
                      <div className="pt-2">
                        {cartCount > 0 && !checkoutOpened && (
                          <button
                            onClick={() => setCheckoutOpened(true)}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all animate-bounce"
                          >
                            Ir a Caja Headless ({cartCount} prod.)
                          </button>
                        )}

                        {checkoutOpened && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3.5 border border-purple-500/20 rounded-2xl bg-purple-500/5 text-[9px] space-y-2.5 relative"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-black uppercase tracking-wider text-purple-650 dark:text-purple-400 flex items-center gap-1">
                                <CreditCard size={10} /> PASARELA STRIPE INTEGRADA
                              </span>
                              <button 
                                onClick={() => { setCheckoutOpened(false); setPurchaseCompleted(false); }}
                                className="text-zinc-400 dark:text-zinc-550 text-xs hover:text-zinc-650"
                              >
                                ×
                              </button>
                            </div>

                            {!purchaseCompleted ? (
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-450 dark:text-zinc-500">Monto total a cobrar: <strong className="text-zinc-900 dark:text-zinc-100">{(cartCount * 89).toFixed(2)} €</strong></span>
                                <button
                                  onClick={() => setPurchaseCompleted(true)}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-650 text-white rounded-lg font-black uppercase tracking-wider"
                                >
                                  Confirmar Pago
                                </button>
                              </div>
                            ) : (
                              <motion.div 
                                initial={{ scale: 0.98 }}
                                animate={{ scale: 1 }}
                                className="text-center py-2 space-y-1.5 text-emerald-500 font-bold"
                              >
                                <span>🎉 ¡Pago procesado con éxito por Stripe!</span>
                                <span className="text-zinc-400 dark:text-zinc-555 block text-[8px]">
                                  Base de datos PostgreSQL actualizada (Tenant Stock - {cartCount} unidades).
                                </span>
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Preset 3: Academy Courses Layout */}
                  {activePreset === 'academy' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4 flex-1 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                          📚 CODY ACADEMY
                        </span>
                        <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full border border-indigo-200/20 text-[9px] text-indigo-650 dark:text-indigo-400 font-bold">
                          <span>Progreso:</span>
                          <strong>42%</strong>
                        </div>
                      </div>

                      {/* Main Player Simulator */}
                      <div className="h-[120px] rounded-2xl bg-zinc-900 flex flex-col items-center justify-center relative overflow-hidden border border-zinc-800 shadow-md">
                        {isPlaying ? (
                          <div className="absolute inset-0 bg-indigo-950/40 z-10 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                              Reproduciendo Lección {activeLesson + 1}
                            </span>
                            <span className="text-[8px] text-zinc-350 mt-1 block">Streaming de vídeo seguro</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsPlaying(true)}
                            className="w-10 h-10 rounded-full bg-white text-zinc-900 flex items-center justify-center shadow-lg hover:scale-105 transition-all z-20 cursor-pointer"
                          >
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                          </button>
                        )}
                        <span className="absolute bottom-2 left-3 text-[8px] text-zinc-400 font-bold">
                          Vídeo {activeLesson + 1}: Configurando Medusa v2
                        </span>
                      </div>

                      {/* Course Curriculum list */}
                      <div className="space-y-1.5">
                        {[
                          '1. Introducción al entorno SaaS',
                          '2. Conexión de esquemas PostgreSQL',
                          '3. Despliegue automático en Vercel'
                        ].map((lesson, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setActiveLesson(idx);
                              setIsPlaying(false);
                            }}
                            className={cn(
                              "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-[10px] font-bold",
                              activeLesson === idx
                                ? "bg-indigo-50/40 dark:bg-indigo-950/10 border-indigo-500/20 text-indigo-750 dark:text-brand"
                                : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850"
                            )}
                          >
                            <span className="truncate pr-4">{lesson}</span>
                            {activeLesson === idx && <span className="text-[8px] bg-indigo-500 text-white py-0.5 px-1.5 rounded uppercase font-black">Activo</span>}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Trust & Limits Info banner */}
      <section className="py-10 bg-zinc-50 dark:bg-zinc-900/60 border-t border-b border-zinc-200/60 dark:border-zinc-800/80 text-center px-6 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-455 font-bold flex items-center gap-2 mx-auto md:mx-0">
            <Info size={16} className="text-indigo-500 shrink-0" />
            <span>
              Políticas de Aislamiento Estricto: Cada plan asigna exactamente <strong className="text-zinc-800 dark:text-zinc-250 underline decoration-indigo-500/40 font-black">1 Sitio Web activo</strong> completo.
            </span>
          </p>
          <div className="flex gap-6 text-xs text-zinc-450 dark:text-zinc-505 font-bold uppercase tracking-wider mx-auto md:mx-0">
            <span className="flex items-center gap-1.5"><Shield size={12} className="text-brand-success" /> SSL Gratis</span>
            <span className="flex items-center gap-1.5"><Database size={12} className="text-indigo-500" /> PostgreSQL</span>
            <span className="flex items-center gap-1.5"><Cpu size={12} className="text-purple-500" /> Medusa.js v2</span>
          </div>
        </div>
      </section>

      {/* Trust Metrics Section with Number Ticker */}
      <section className="py-20 px-6 max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {[
            { value: 12480, suffix: '+', label: 'Sitios Web Generados' },
            { value: 99.98, suffix: '%', label: 'Uptime del Servidor' },
            { value: 0.15, suffix: 's', label: 'Latencia Promedio' },
            { value: 100, suffix: '%', label: 'Aislamiento de Clientes' }
          ].map((metric, i) => (
            <div key={i} className="text-center p-6 bg-card/40 border border-zinc-200/50 dark:border-zinc-800/40 rounded-3xl backdrop-blur-lg">
              <div className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-2 text-gradient">
                <NumberTicker value={metric.value} decimalPlaces={metric.value % 1 !== 0 ? 2 : 0} />
                <span>{metric.suffix}</span>
              </div>
              <span className="text-[11px] sm:text-xs text-zinc-450 dark:text-zinc-400 font-black uppercase tracking-wider block">
                {metric.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100/50 dark:border-purple-900/20 text-purple-650 dark:text-purple-400 text-[10px] font-black uppercase tracking-wider mb-4"
          >
            <span>Arquitectura Premium</span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 max-w-2xl mx-auto">
            Construcción profesional sin límites
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto text-sm">
            Estructuras dedicadas y preparadas para soportar altos volúmenes de usuarios, leads y transacciones comerciales en tiempo récord.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="p-8 bg-card/65 dark:bg-zinc-900/60 border border-zinc-250 dark:border-zinc-800/80 rounded-3xl shadow-sm hover:shadow-md flex flex-col justify-between backdrop-blur-xl relative"
          >
            <div>
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-brand rounded-2xl flex items-center justify-center mb-6 border border-indigo-100/40 dark:border-indigo-900/30">
                <Zap className="w-6.5 h-6.5" />
              </div>
              <h3 className="text-lg font-bold mb-3">Créditos de IA Flexibles</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-medium">
                Nuestros planes Pro e Ecommerce cuentan con créditos de cambios por IA completamente <strong className="text-indigo-600 dark:text-brand">ilimitados</strong>. Modifica colores, añade bloques de reservas o re-compila el esquema web cuantas veces lo desees.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/20 text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1">
              <span>Máxima Iteración</span> <ArrowUpRight size={12} />
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="p-8 bg-card/65 dark:bg-zinc-900/60 border border-zinc-250 dark:border-zinc-800/80 rounded-3xl shadow-sm hover:shadow-md flex flex-col justify-between backdrop-blur-xl relative"
          >
            <div>
              <div className="w-14 h-14 bg-purple-50 dark:bg-purple-950/50 text-purple-650 dark:text-brand-accent rounded-2xl flex items-center justify-center mb-6 border border-purple-100/40 dark:border-purple-900/30">
                <Code className="w-6.5 h-6.5" />
              </div>
              <h3 className="text-lg font-bold mb-3">Headless Ecommerce Con Medusa</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-medium">
                Especialmente dedicado para tiendas online de alto rendimiento. Creamos un catálogo Headless hiper-veloz montado sobre Medusa.js v2, conectando pasarelas y control de inventario seguro de forma nativa.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/20 text-[10px] font-black uppercase tracking-widest text-purple-500 flex items-center gap-1">
              <span>Soporte VIP Integrado</span> <ArrowUpRight size={12} />
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="p-8 bg-card/65 dark:bg-zinc-900/60 border border-zinc-250 dark:border-zinc-800/80 rounded-3xl shadow-sm hover:shadow-md flex flex-col justify-between backdrop-blur-xl relative"
          >
            <div>
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-650 dark:text-brand-success rounded-2xl flex items-center justify-center mb-6 border border-emerald-100/40 dark:border-emerald-900/30">
                <Database className="w-6.5 h-6.5" />
              </div>
              <h3 className="text-lg font-bold mb-3">Aislamiento Total PostgreSQL</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-medium">
                No compartes recursos con nadie. Cada web generada por la IA corre bajo su propio esquema independiente PostgreSQL. Tus leads, clientes y compras están a salvo de cualquier interferencia externa.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/20 text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
              <span>Esquema Aislado Real</span> <ArrowUpRight size={12} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/20 text-emerald-650 dark:text-brand-success text-[10px] font-black uppercase tracking-wider mb-4"
          >
            <span>Precios Transparentes</span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 max-w-2xl mx-auto">
            Elige el motor de tu sitio web
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto text-sm font-medium">
            Todos los planes incluyen 1 sitio web activo e interactivo con su propia base de datos PostgreSQL. Cancela cuando quieras sin contratos ni letra pequeña.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 220 }}
              className={`p-8.5 rounded-[2.2rem] border flex flex-col justify-between relative bg-card shadow-lg transition-all duration-300 overflow-hidden ${
                plan.popular
                  ? 'border-indigo-500 dark:border-brand shadow-indigo-500/5 dark:shadow-brand/5 ring-2 ring-indigo-500/20 dark:ring-brand/20'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              {plan.popular && (
                <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-brand dark:to-brand-2 text-white text-[9px] font-black tracking-widest shadow-md z-10 flex items-center gap-1 uppercase">
                  <Star size={9.5} fill="currentColor" /> MÁS POPULAR
                </span>
              )}

              <div>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-505 px-3 py-1 rounded-lg font-black uppercase tracking-widest mb-4 inline-block">
                  {plan.tier} PLAN
                </span>
                <h3 className="text-2xl font-black mb-3">{plan.name}</h3>
                <p className="text-zinc-505 dark:text-zinc-455 text-xs mb-6 h-10 leading-relaxed font-medium">
                  {plan.description}
                </p>
                
                <div className="flex items-baseline mb-8">
                  <span className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">{plan.price}</span>
                  <span className="text-zinc-450 dark:text-zinc-505 text-xs font-semibold ml-1.5">{plan.period}</span>
                </div>

                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex gap-3 items-start text-xs font-semibold text-zinc-650 dark:text-zinc-350">
                      <div className="w-4.5 h-4.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-brand flex items-center justify-center shrink-0 border border-indigo-500/10 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => onNavigate('register')}
                className={`w-full py-4.5 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-[0.98] ${
                  plan.popular
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-brand dark:to-brand-2 text-white hover:opacity-95 shadow-md shadow-indigo-500/10 dark:shadow-brand/10'
                    : 'bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-955 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow'
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Elegant FAQ Accordion Section */}
      <section className="py-24 px-6 max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/20 text-indigo-650 dark:text-brand text-[10px] font-black uppercase tracking-wider mb-4"
          >
            <span>Dudas y Preguntas</span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            Preguntas Frecuentes
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-md mx-auto">
            ¿Tienes alguna consulta rápida sobre el funcionamiento de Avialo Builder? Estamos aquí para responderte.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index} 
                className="bg-card/45 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left outline-none cursor-pointer"
                >
                  <span className="text-sm font-bold text-zinc-850 dark:text-zinc-205">{faq.q}</span>
                  <ChevronDown 
                    size={16} 
                    className={cn(
                      "text-zinc-400 dark:text-zinc-505 transition-transform duration-300 shrink-0 ml-4", 
                      isOpen && "rotate-180 text-indigo-500 dark:text-brand"
                    )} 
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 pt-0 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final Premium CTA Section */}
      <section className="py-24 px-6 max-w-5xl mx-auto relative z-10 mb-8">
        <div className="relative rounded-[2.5rem] bg-gradient-to-br from-zinc-900 to-zinc-950 dark:from-zinc-900/80 dark:to-zinc-950/60 p-10 md:p-16 border border-zinc-800 overflow-hidden text-center shadow-2xl">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-30">
            <DotPattern width={12} height={12} className="fill-zinc-650" />
          </div>
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-500/10 dark:bg-brand/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-purple-500/10 dark:bg-brand-2/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin duration-[4s]" />
              <span>Despliegues Automáticos</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              ¿Listo para ver tu negocio digital en minutos?
            </h2>

            <p className="text-zinc-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
              Únete a miles de fundadores, agencias y creadores de contenido que están iterando a la velocidad del pensamiento. Crea tu cuenta hoy.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <ShimmerButton
                onClick={() => onNavigate('register')}
                className="px-8 py-4.5 text-xs font-black tracking-widest uppercase shadow-xl transition-all active:scale-[0.98]"
                borderRadius="1rem"
                shimmerColor="#ffffff"
                background="linear-gradient(135deg, var(--brand), var(--brand-2))"
              >
                <span>Crear mi cuenta de usuario</span>
                <ArrowRight className="w-4 h-4" />
              </ShimmerButton>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-zinc-200/50 dark:border-zinc-850/50 bg-zinc-100/30 dark:bg-zinc-950/80 px-6 text-center relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-4 text-left">
            <div className="flex items-center gap-2">
              <Logo className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
              <span className="font-black tracking-tight text-base text-zinc-900 dark:text-white">
                Avialo Builder<span className="text-brand">.</span>
              </span>
            </div>
            <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-800 hidden md:block" />
            <span className="text-xs text-zinc-450 dark:text-zinc-500 font-semibold">
              Despliegue y diseño full-stack autónomo premium.
            </span>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-500 font-medium">
            &copy; {new Date().getFullYear()} Avialo S.L. Todos los derechos reservados. 1 Sitio web por cuenta.
          </p>
        </div>
      </footer>
    </div>
  );
}
