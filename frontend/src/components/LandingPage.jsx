import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Check, Sparkles, Code, Globe, MessageSquare, 
  Smartphone, Zap, Shield, Play, ArrowUpRight, Cpu, 
  Database, ShoppingBag, Eye, RefreshCw, HelpCircle, 
  ChevronDown, Calendar, CreditCard, Sun, Moon, Info, Star,
  Utensils, Stethoscope, Store
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
  // Selector for the SME (PYME) Traditional Business Showcase
  const [activePyme, setActivePyme] = useState('hosteleria');
  const [isAnimating, setIsAnimating] = useState(false);

  // Simulated appointment for Restaurant / Hostelería
  const [tableCount, setTableCount] = useState(2);
  const [tableBooked, setTableBooked] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);

  // Simulated appointment for Clinic / Salud
  const [selectedService, setSelectedService] = useState(null);
  const [clinicBooked, setClinicBooked] = useState(false);

  // Simulated shopping for Local Store / Comercio
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  // Traditional Spanish Business (PYMEs) Configuration
  const pymes = {
    hosteleria: {
      id: 'hosteleria',
      icon: <Utensils className="w-4 h-4" />,
      label: '🥘 Mesón Familiar (Hostelería)',
      prompt: 'Tengo un restaurante familiar de comida tradicional asturiana. Quiero que mis clientes puedan reservar mesa online los domingos de forma automática.',
      algorithmTitle: 'Algoritmo de Hostelería Activo',
      algorithmDesc: 'Nuestro algoritmo aprovisiona un calendario de reservas sincronizado con tu base de datos PostgreSQL, liberando tu teléfono de reservas manuales.',
      beforeText: 'Reservas por teléfono los fines de semana, pérdida de clientes que llaman fuera de hora, hojas de papel desorganizadas.',
      afterText: 'Base de datos en la nube. Reservas automáticas 24/7 sin comisiones de plataformas externas.'
    },
    salud: {
      id: 'salud',
      icon: <Stethoscope className="w-4 h-4" />,
      label: '🦷 Clínica Dental (Salud/Fisio)',
      prompt: 'Dirijo una pequeña clínica dental de barrio. Necesito que los pacientes reserven cita previa para primera consulta gratuita e implantes.',
      algorithmTitle: 'Esquema Médico Aislado',
      algorithmDesc: 'Estructura una base de datos segura bajo el estricto cumplimiento de privacidad de datos, integrando leads y citas en tiempo real.',
      beforeText: 'Agendas en papel, llamadas constantes durante tratamientos, recordatorios manuales por WhatsApp.',
      afterText: 'Ficha médica digital y citas auto-gestionadas sincronizadas con la disponibilidad del doctor.'
    },
    comercio: {
      id: 'comercio',
      icon: <Store className="w-4 h-4" />,
      label: '👟 Zapatería Local (Comercio)',
      prompt: 'Tengo una zapatería local de toda la vida y quiero vender mis modelos hechos a mano en toda España con pasarela de cobros.',
      algorithmTitle: 'Motor eCommerce Headless',
      algorithmDesc: 'Genera un catálogo headless ultra veloz conectado con Stripe. Control de inventario y stock automatizado en PostgreSQL.',
      beforeText: 'Solo ventas físicas locales, stock controlado a ojo, sin presencia en internet.',
      afterText: 'Tienda online de alto rendimiento con catálogo y pasarela de cobro Stripe activa para vender en todo el país.'
    }
  };

  const handlePymeChange = (key) => {
    if (key === activePyme) return;
    setIsAnimating(true);
    setTableBooked(false);
    setSelectedTime(null);
    setSelectedService(null);
    setClinicBooked(false);
    setPurchaseSuccess(false);

    setTimeout(() => {
      setActivePyme(key);
      setIsAnimating(false);
    }, 400);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 }
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

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-12 md:pt-36 md:pb-16 flex flex-col items-center justify-center text-center px-6 max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center w-full"
        >
          {/* Spectacular Animated Glow Pill Badge */}
          <motion.div variants={itemVariants} className="mb-8">
            <AnimatedGradientText className="px-5 py-2">
              <Sparkles className="w-4 h-4 mr-2 text-indigo-500 dark:text-brand animate-spin duration-[4s]" />
              <span className="text-xs font-semibold tracking-wide bg-gradient-to-r from-zinc-850 to-zinc-650 dark:from-zinc-100 dark:to-zinc-350 bg-clip-text text-transparent">
                La Transformación Digital de tu PYME
              </span>
              <ArrowRight className="w-3.5 h-3.5 ml-2 text-indigo-500 dark:text-brand" />
            </AnimatedGradientText>
          </motion.div>

          {/* High-Impact Centered, Ultra-Modern and Stable H1 */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black tracking-tight mb-8 leading-[1.05] max-w-5xl text-zinc-900 dark:text-white"
          >
            Digitaliza tu negocio <br className="hidden sm:inline" />
            de toda la vida con nuestro{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-brand dark:via-brand-accent dark:to-brand-2">
              algoritmo propio.
            </span>
          </motion.h1>

          {/* Simple, Explanatory Spanish Subtitle dedicated to local PYMEs */}
          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg md:text-xl text-zinc-500 dark:text-zinc-400 mb-12 max-w-4xl font-medium leading-relaxed"
          >
            Ayudamos a pequeñas y medianas empresas españolas (clínicas, restaurantes, comercios locales, servicios) a dar el salto al mundo digital de forma inmediata. Describe tu negocio en español y nuestro algoritmo generará una web premium con bases de datos PostgreSQL y reservas automatizadas.
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
              <span>EMPEZAR AHORA CON MI PYME</span>
              <ArrowRight className="w-4 h-4" />
            </ShimmerButton>

            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-8 py-4.5 rounded-2xl bg-white hover:bg-zinc-50 dark:bg-zinc-900/60 dark:hover:bg-zinc-850/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 font-bold transition-all duration-300 text-xs active:scale-[0.98] shadow-sm"
            >
              Ver Planes desde 29€
            </a>
          </motion.div>

          {/* Centralized trust row about isolation and zero programming needed */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-3.5 max-w-4xl mx-auto mb-16 px-4"
          >
            <div className="flex items-center gap-2 px-4.5 py-2 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/80 rounded-full shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                🚀 Sin saber programar
              </span>
            </div>
            <div className="flex items-center gap-2 px-4.5 py-2 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/80 rounded-full shadow-sm">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                🗄️ PostgreSQL Privado Aislado
              </span>
            </div>
            <div className="flex items-center gap-2 px-4.5 py-2 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/80 rounded-full shadow-sm">
              <Zap className="w-3.5 h-3.5 text-yellow-500 animate-bounce" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                ⚡ Algoritmo Propietario v2
              </span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Redesigned Glassmorphic PYME Transformation Showcase */}
      <section className="py-8 px-6 max-w-6xl mx-auto relative z-10 mb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
            Elige un tipo de negocio y mira la transformación
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm max-w-lg mx-auto">
            Haz clic en las pestañas para ver cómo nuestro algoritmo procesa los requerimientos de una PYME española tradicional y despliega una solución moderna en minutos.
          </p>
        </div>

        {/* Glassmorphic Showcase Tabs Wrapper */}
        <div className="glass rounded-[2rem] border border-zinc-250 dark:border-zinc-800/70 overflow-hidden shadow-2xl bg-card/45 backdrop-blur-xl relative">
          <BorderBeam size={350} duration={14} borderWidth={1.5} colorFrom="var(--brand)" colorTo="var(--brand-accent)" />

          {/* Tabs bar */}
          <div className="flex flex-wrap md:flex-nowrap border-b border-zinc-200 dark:border-zinc-850 bg-zinc-100/50 dark:bg-zinc-950/80 p-2 gap-2">
            {Object.keys(pymes).map((key) => (
              <button
                key={key}
                onClick={() => handlePymeChange(key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                  activePyme === key
                    ? "bg-white dark:bg-zinc-900 text-indigo-650 dark:text-brand shadow border border-zinc-200/60 dark:border-zinc-800"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-750 dark:hover:text-zinc-200"
                )}
              >
                {pymes[key].icon}
                <span>{pymes[key].label}</span>
              </button>
            ))}
          </div>

          <div className="p-6 md:p-10 min-h-[460px] flex flex-col lg:flex-row gap-10">
            
            {/* Left Transformation Explanation card (Zero Tech Jargon) */}
            <div className="flex-1 flex flex-col justify-between text-left space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePyme}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:bg-brand/10 dark:text-brand border border-indigo-500/10 dark:border-brand/20 px-3 py-1 rounded-lg font-black uppercase tracking-widest inline-block">
                      {pymes[activePyme].algorithmTitle}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50">
                      ¿Cómo digitalizamos este negocio?
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-405 text-xs sm:text-sm leading-relaxed font-medium">
                      {pymes[activePyme].algorithmDesc}
                    </p>
                  </div>

                  {/* Prompt simulation */}
                  <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/50 dark:border-zinc-850 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px] uppercase shrink-0 mt-0.5 shadow-sm">
                      PY
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Requerimiento del propietario:</span>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 italic font-medium">
                        "{pymes[activePyme].prompt}"
                      </p>
                    </div>
                  </div>

                  {/* Before vs After comparison */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl border border-red-500/10 bg-red-500/5 text-left">
                      <span className="text-[10px] text-red-500 font-black uppercase tracking-wider block mb-1">❌ Antes (Tradicional):</span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-450 leading-relaxed font-medium">
                        {pymes[activePyme].beforeText}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 text-left">
                      <span className="text-[10px] text-emerald-500 font-black uppercase tracking-wider block mb-1">🎉 Después (Con Avialo):</span>
                      <p className="text-[11px] text-zinc-800 dark:text-zinc-350 leading-relaxed font-semibold">
                        {pymes[activePyme].afterText}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* General pitch button to proceed */}
              <div className="pt-6 border-t border-zinc-200/50 dark:border-zinc-850">
                <button
                  onClick={() => onNavigate('register')}
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-brand hover:translate-x-1 transition-all outline-none"
                >
                  <span>Crear mi web con este algoritmo</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Right side Visual Preview Canvas (Ultra clean, interactive) */}
            <div className="flex-1 bg-zinc-100/50 dark:bg-zinc-900/10 rounded-2xl p-4 md:p-6 border border-zinc-200/60 dark:border-zinc-850 flex items-center justify-center min-h-[340px]">
              <div className="w-full h-full bg-white dark:bg-zinc-950 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-850 flex flex-col overflow-hidden max-w-md mx-auto">
                
                {/* Visual Header */}
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850/50 px-4.5 py-3.5 bg-zinc-50/50 dark:bg-zinc-900">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block animate-pulse animate-pulse-glow" />
                    <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 tracking-wider">
                      {activePyme === 'hosteleria' && 'meson-familiar.com'}
                      {activePyme === 'salud' && 'clinica-dentaria.es'}
                      {activePyme === 'comercio' && 'artesanos-barrio.app'}
                    </span>
                  </div>
                  <span className="text-[8px] bg-indigo-500/10 text-indigo-650 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                    PROPIEDAD DE TU PYME
                  </span>
                </div>

                {/* Simulated Content Screen */}
                <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto space-y-4 text-xs text-left">
                  <AnimatePresence mode="wait">
                    {isAnimating ? (
                      <motion.div
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center py-10"
                      >
                        <RefreshCw className="w-8 h-8 text-indigo-500 dark:text-brand animate-spin mb-3" />
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider animate-pulse">Cargando visualización...</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={activePyme}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        className="flex-1 flex flex-col justify-between"
                      >
                        {/* Preset 1: Restaurant Booking Preview */}
                        {activePyme === 'hosteleria' && (
                          <div className="space-y-4 flex-grow flex flex-col justify-between">
                            <div className="space-y-2">
                              <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 block">🥘 Mesón Asturiano Tradicional</span>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-450 leading-relaxed font-medium">
                                Recetas tradicionales de sidrería, fabada e ingredientes frescos importados de Asturias. Reserva tu mesa para el domingo.
                              </p>
                            </div>

                            {/* Reservas Widget */}
                            <div className="border border-indigo-200/50 dark:border-indigo-900/30 rounded-2xl p-4 bg-indigo-50/15 dark:bg-indigo-950/10 shadow-inner">
                              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 block mb-2">
                                📅 RESERVAR MESA EN DOMINGO
                              </span>

                              {!tableBooked ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {['13:30h', '14:30h', '15:30h'].map((time) => (
                                      <button
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className={cn(
                                          "py-2 rounded-xl text-[10px] font-bold border transition-all text-center",
                                          selectedTime === time
                                            ? "bg-indigo-500 dark:bg-brand text-white border-transparent shadow-sm"
                                            : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-350 border-zinc-200 dark:border-zinc-800"
                                        )}
                                      >
                                        {time}
                                      </button>
                                    ))}
                                  </div>
                                  
                                  {/* Guest count selector */}
                                  <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl p-2 text-[10px] font-bold">
                                    <span className="text-zinc-500">Comensales:</span>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => setTableCount(c => Math.max(1, c - 1))}
                                        className="w-5 h-5 bg-zinc-100 rounded flex items-center justify-center border text-zinc-650"
                                      >
                                        -
                                      </button>
                                      <span>{tableCount}</span>
                                      <button 
                                        onClick={() => setTableCount(c => c + 1)}
                                        className="w-5 h-5 bg-zinc-100 rounded flex items-center justify-center border text-zinc-650"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  <button
                                    disabled={!selectedTime}
                                    onClick={() => setTableBooked(true)}
                                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-45"
                                  >
                                    Reservar Mesa al Instante
                                  </button>
                                </div>
                              ) : (
                                <motion.div 
                                  initial={{ scale: 0.96 }}
                                  animate={{ scale: 1 }}
                                  className="text-center py-4 space-y-2.5 text-emerald-500 font-bold"
                                >
                                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-500/20">
                                    <Check size={16} />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider block text-zinc-850 dark:text-zinc-250">¡Mesa Reservada!</span>
                                    <span className="text-[8px] text-zinc-400 dark:text-zinc-500 block mt-1">
                                      Confirmada para {tableCount} personas el domingo a las {selectedTime} en PostgreSQL.
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => { setTableBooked(false); setSelectedTime(null); }}
                                    className="text-[9px] text-indigo-500 dark:text-brand hover:underline font-bold"
                                  >
                                    Hacer otra reserva
                                  </button>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Preset 2: Clinic Schedule Preview */}
                        {activePyme === 'salud' && (
                          <div className="space-y-4 flex-grow flex flex-col justify-between">
                            <div className="space-y-2">
                              <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 block">🦷 Clínica Dental Dentalia</span>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-455 leading-relaxed font-medium">
                                Soluciones dentales, implantes y estética médica con tecnología avanzada.
                              </p>
                            </div>

                            {/* Citas Widget */}
                            <div className="border border-purple-200/50 dark:border-purple-900/30 rounded-2xl p-4 bg-purple-50/15 dark:bg-purple-950/10 shadow-inner">
                              <span className="text-[9px] font-black uppercase tracking-wider text-purple-650 dark:text-brand-accent block mb-2">
                                👨‍⚕️ CITA PREVIA GRATUITA
                              </span>

                              {!clinicBooked ? (
                                <div className="space-y-3">
                                  <div className="space-y-1.5">
                                    {['🦷 Primera Consulta + Diagnóstico (Gratis)', '🧼 Limpieza Dental Avanzada (35€)'].map((service, i) => (
                                      <button
                                        key={i}
                                        onClick={() => setSelectedService(service)}
                                        className={cn(
                                          "w-full text-left p-2.5 rounded-xl border transition-all text-[9.5px] font-bold flex justify-between items-center",
                                          selectedService === service
                                            ? "bg-purple-600 text-white border-transparent shadow-sm"
                                            : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-350 border-zinc-200 dark:border-zinc-800"
                                        )}
                                      >
                                        <span className="truncate pr-3">{service}</span>
                                        {selectedService === service && <Check size={10} />}
                                      </button>
                                    ))}
                                  </div>

                                  <button
                                    disabled={!selectedService}
                                    onClick={() => setClinicBooked(true)}
                                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-45"
                                  >
                                    Confirmar Cita Previa
                                  </button>
                                </div>
                              ) : (
                                <motion.div 
                                  initial={{ scale: 0.96 }}
                                  animate={{ scale: 1 }}
                                  className="text-center py-4 space-y-2.5 text-emerald-500 font-bold"
                                >
                                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-500/20">
                                    <Check size={16} />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider block text-zinc-850 dark:text-zinc-250">¡Cita Programada!</span>
                                    <span className="text-[8px] text-zinc-400 dark:text-zinc-550 block mt-1 leading-normal">
                                      Hemos guardado tu cita de <strong>{selectedService}</strong> en la base de datos PostgreSQL aislada del doctor.
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => { setClinicBooked(false); setSelectedService(null); }}
                                    className="text-[9px] text-purple-600 dark:text-brand hover:underline font-bold"
                                  >
                                    Volver
                                  </button>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Preset 3: Local Store Purchase Preview */}
                        {activePyme === 'comercio' && (
                          <div className="space-y-4 flex-grow flex flex-col justify-between">
                            <div className="space-y-2">
                              <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 block">👟 Zapatería Artesanal Soria</span>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-450 leading-relaxed font-medium">
                                Calzado hecho a mano con cuero natural. Calidad tradicional exportada a toda España.
                              </p>
                            </div>

                            {/* Store Widget */}
                            <div className="border border-amber-250/50 dark:border-amber-900/30 rounded-2xl p-4 bg-amber-50/15 dark:bg-zinc-900/50 shadow-inner">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-[9px] font-black uppercase tracking-wider text-amber-650 dark:text-amber-400">
                                  📦 MODELO SENDERISMO PREMIUM
                                </span>
                                <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">89,00 €</span>
                              </div>

                              {!purchaseSuccess ? (
                                <div className="space-y-3">
                                  <div className="p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider text-center">
                                    🛒 Pasarela Stripe Activa
                                  </div>
                                  <button
                                    onClick={() => setPurchaseSuccess(true)}
                                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                  >
                                    Comprar Calzado (Stripe)
                                  </button>
                                </div>
                              ) : (
                                <motion.div 
                                  initial={{ scale: 0.96 }}
                                  animate={{ scale: 1 }}
                                  className="text-center py-4 space-y-2.5 text-emerald-500 font-bold"
                                >
                                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-500/20">
                                    <Check size={16} />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider block text-zinc-850 dark:text-zinc-250">¡Pago Confirmado!</span>
                                    <span className="text-[8px] text-zinc-450 dark:text-zinc-550 block mt-1">
                                      Cobro procesado por Stripe. Inventario actualizado en PostgreSQL (Tenant Stock -1).
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => setPurchaseSuccess(false)}
                                    className="text-[9px] text-zinc-500 hover:underline font-bold"
                                  >
                                    Simular otra compra
                                  </button>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>

          </div>
        </div>
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
          <p className="text-zinc-505 dark:text-zinc-400 max-w-xl mx-auto text-sm font-medium">
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
                <p className="text-zinc-550 dark:text-zinc-455 text-xs mb-6 h-10 leading-relaxed font-medium">
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
