import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Check, Sparkles, Code, Globe, MessageSquare, 
  Smartphone, Zap, Shield, Play, ArrowUpRight, Cpu, 
  Database, ShoppingBag, Eye, RefreshCw, HelpCircle, 
  ChevronDown, Calendar, CreditCard, Sun, Moon, Info, Star,
  Utensils, Stethoscope, Store, Building, Mail, Phone
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

  // 3D Tilting Card State for Mockup
  const [tiltStyle, setTiltStyle] = useState({ 
    transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)' 
  });

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

  // Dynamic 3D Hover rotation calculations with spring dampening
  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    
    // Calculate rotation angles (max 6 degrees tilt for sophisticated balance)
    const rotateX = -(y / (box.height / 2)) * 6;
    const rotateY = (x / (box.width / 2)) * 6;

    setTiltStyle({
      transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`,
      transition: 'transform 0.08s cubic-bezier(0.25, 1, 0.5, 1)'
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
    });
  };

  // Traditional Spanish Business (PYMEs) Configuration (Straight to the point)
  const pymes = {
    hosteleria: {
      id: 'hosteleria',
      icon: <Utensils className="w-4 h-4" />,
      label: 'Mesón Familiar',
      prompt: 'Tengo un mesón de toda la vida y quiero que los clientes reserven mesa los domingos por internet sin que me suene el móvil.',
      algorithmTitle: 'RESERVAS DE MESA AUTOMÁTICAS',
      algorithmDesc: 'Tus clientes reservan directamente en la web. El sistema calcula las mesas libres de forma automática y te llega un aviso directo.',
      beforeText: 'Teléfono colapsado los sábados, llamadas perdidas fuera de hora, reservas cruzadas en papel.',
      afterText: 'Tus mesas llenas de forma automática. Clientes contentos reservando a cualquier hora.'
    },
    salud: {
      id: 'salud',
      icon: <Stethoscope className="w-4 h-4" />,
      label: 'Clínica Dental / Fisio',
      prompt: 'Tengo una consulta y necesito que los pacientes reserven cita previa para primera visita de forma online.',
      algorithmTitle: 'CITA PREVIA ONLINE',
      algorithmDesc: 'Tus pacientes eligen el tratamiento, ven tus horas libres en tiempo real y reservan su cita al instante.',
      beforeText: 'Hojas de agenda tachadas, interrumpir tratamientos para coger llamadas, despistes de citas.',
      afterText: 'Tu agenda siempre organizada y visible. Menos llamadas molestas durante tus consultas.'
    },
    comercio: {
      id: 'comercio',
      icon: <Store className="w-4 h-4" />,
      label: 'Comercio / Tienda Local',
      prompt: 'Tengo una tienda de zapatos y quiero venderlos online a toda España de forma fácil y cobrar con tarjeta.',
      algorithmTitle: 'VENTAS A TODA ESPAÑA',
      algorithmDesc: 'Un catálogo visual súper rápido donde tus clientes añaden productos al carrito y pagan con tarjeta de crédito de forma segura.',
      beforeText: 'Solo vendes a los vecinos del barrio, ingresos limitados, inventario controlado a mano.',
      afterText: 'Tu tienda abierta 24/7 para toda España, cobros directos en tu banco sin complicaciones.'
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
    }, 280);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } }
  };

  // Straight to the point reviews
  const reviews = [
    {
      text: "Teníamos pánico a la informática. Avialo nos creó la web de reservas en un minuto. Ahora las mesas de los domingos se llenan solas. Impresionante.",
      author: "Carlos",
      business: "Mesón El Asturiano (Hostelería)",
      stars: 5
    },
    {
      text: "Mis clientes ahora reservan cita directamente desde su móvil. El teléfono de la consulta ha dejado de sonar a todas horas y puedo atender en paz.",
      author: "Dra. Marta",
      business: "Dentalia Clínica (Salud)",
      stars: 5
    },
    {
      text: "Vendíamos calzado solo en el barrio. Con el catálogo que nos hizo el algoritmo, ahora enviamos zapatos a toda España. Sencillo, rápido y rentable.",
      author: "Julio Soria",
      business: "Soria Cuero Artesano (Comercio)",
      stars: 5
    }
  ];

  const plans = [
    {
      name: 'Plan Basic',
      price: '29€',
      period: '/mes',
      description: 'Web corporativa sencilla. Ideal para dar a conocer tu negocio tradicional en internet.',
      features: [
        'Web Profesional Completa',
        'Hasta 20 cambios por IA al mes',
        'Dominio propio incluido (.es, .com)',
        'Formulario de contacto básico',
        'Soporte por email en español'
      ],
      cta: 'Empezar Plan Basic',
      tier: 'basic'
    },
    {
      name: 'Plan Pro',
      price: '59€',
      period: '/mes',
      description: 'Web con reservas online automatizadas. Ideal para clínicas, restaurantes y servicios.',
      features: [
        'Web con Reservas en Vivo',
        'Cambios por IA ILIMITADOS',
        'Calendario de Cita Previa integrado',
        'Panel de control de reservas',
        'Dominio propio e email comercial',
        'Soporte prioritario por teléfono'
      ],
      cta: 'Empezar Plan Pro',
      tier: 'pro'
    },
    {
      name: 'Plan Ecommerce',
      price: '119€',
      period: '/mes',
      description: 'Tienda online completa con pasarela de cobros. Ideal para vender en toda España.',
      features: [
        'Tienda Online Completa',
        'Cambios por IA ILIMITADOS',
        'Catálogo de productos interactivo',
        'Pasarela de cobros con Tarjeta / Stripe',
        'Gestión de stock automática',
        'Soporte VIP inmediato'
      ],
      cta: 'Empezar Plan Ecommerce',
      tier: 'ecommerce'
    }
  ];

  const faqs = [
    {
      q: '¿Cómo funciona exactamente?',
      a: 'Solo tienes que escribir cómo es tu negocio en español y qué necesitas (por ejemplo: "tengo un mesón y quiero que reserven mesa online"). Nuestro algoritmo propietario crea tu página web adaptada a tu negocio y la publica en internet en menos de 2 minutos.'
    },
    {
      q: '¿Qué necesito para empezar?',
      a: 'Absolutamente nada. No necesitas saber de ordenadores, ni de programación, ni contratar servidores. Nosotros nos encargamos de todo: dominio, alojamiento, web y sistema de reservas.'
    },
    {
      q: '¿Puedo cambiar las fotos o los textos después?',
      a: 'Sí, facilísimo. Solo tienes que hablar por el chat con nuestra IA (ejemplo: "cambia la foto de portada por un plato de pulpo" o "cambia el horario a las 14:00") y se actualiza al instante.'
    },
    {
      q: '¿Hay algún compromiso de permanencia?',
      a: 'Ninguno. Puedes darte de baja, subir o bajar de plan en cualquier momento con un solo clic desde tu panel, sin preguntas ni penalizaciones.'
    }
  ];

  return (
    // Bounded framed layout (recuadro Stripe style) with select-highlight fully enabled
    <div className="bg-background text-foreground min-h-screen relative border-x border-zinc-200/50 dark:border-zinc-850/60 max-w-[1400px] mx-auto shadow-2xl">
      
      {/* Dot pattern background */}
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

      {/* Spectacular IDE/Code Background Vector Illustration for Hero (No raw image dependencies) */}
      <div className="absolute top-12 inset-x-0 h-[620px] pointer-events-none overflow-hidden opacity-5 dark:opacity-10 z-0 flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 1200 800" fill="none" xmlns="http://www.w3.org/2000/svg" className="max-w-5xl">
          {/* Coding canvas frame */}
          <rect x="50" y="50" width="1100" height="700" rx="20" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8" />
          <line x1="50" y1="120" x2="1150" y2="120" stroke="currentColor" strokeWidth="1.5" />
          <line x1="300" y1="120" x2="300" y2="750" stroke="currentColor" strokeWidth="1.5" />
          {/* Mock code lines */}
          <rect x="80" y="150" width="150" height="12" rx="4" fill="currentColor" opacity="0.6" />
          <rect x="80" y="180" width="100" height="12" rx="4" fill="currentColor" opacity="0.4" />
          <rect x="80" y="210" width="120" height="12" rx="4" fill="currentColor" opacity="0.4" />
          <rect x="340" y="150" width="220" height="16" rx="6" fill="currentColor" opacity="0.5" />
          <rect x="340" y="180" width="380" height="16" rx="6" fill="currentColor" opacity="0.3" />
          <rect x="380" y="210" width="280" height="14" rx="5" fill="currentColor" opacity="0.25" />
          <rect x="380" y="240" width="410" height="14" rx="5" fill="currentColor" opacity="0.3" />
          {/* Dynamic database nodes */}
          <circle cx="950" cy="220" r="40" stroke="currentColor" strokeWidth="2" />
          <path d="M925 210 C925 195, 975 195, 975 210 M925 220 C925 205, 975 205, 975 220 M925 230 C925 215, 975 215, 975 230" stroke="currentColor" strokeWidth="2" />
          <text x="905" y="285" fill="currentColor" fontSize="10" fontWeight="bold" opacity="0.7">POSTGRESQL</text>
          {/* Visual canvas grid */}
          <rect x="750" y="380" width="340" height="300" rx="16" stroke="currentColor" strokeWidth="2" />
          <circle cx="780" cy="405" r="5" fill="currentColor" opacity="0.5" />
          <circle cx="795" cy="405" r="5" fill="currentColor" opacity="0.5" />
          <circle cx="810" cy="405" r="5" fill="currentColor" opacity="0.5" />
          <rect x="775" y="440" width="220" height="12" rx="4" fill="currentColor" opacity="0.4" />
          <rect x="775" y="470" width="290" height="180" rx="12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
        </svg>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-10 md:pt-32 md:pb-12 flex flex-col items-center justify-center text-center px-6 max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center w-full"
        >
          {/* Spectacular Centralized, Ultra-Modern and Stable H1 */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black tracking-tight mb-8 leading-[1.05] max-w-5xl text-zinc-900 dark:text-white"
          >
            Tu negocio de toda la vida, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-brand dark:via-brand-accent dark:to-brand-2">
              digitalizado en 2 minutos.
            </span>
          </motion.h1>

          {/* Sincere, simple and clear subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg md:text-xl text-zinc-500 dark:text-zinc-400 mb-12 max-w-4xl font-medium leading-relaxed"
          >
            Creamos la página web profesional, el sistema de reservas y la tienda online para tu negocio local de forma automática. Sin tecnicismos raros, sin complicaciones y listo para recibir clientes de inmediato.
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
              <span>PROBAR MI NEGOCIO GRATIS</span>
              <ArrowRight className="w-4 h-4" />
            </ShimmerButton>

            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-8 py-4.5 rounded-2xl bg-white hover:bg-zinc-50 dark:bg-zinc-900/60 dark:hover:bg-zinc-850/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 font-bold transition-all duration-300 text-xs active:scale-[0.98] shadow-sm"
            >
              Ver Planes y Precios
            </a>
          </motion.div>

          {/* Plain simple trust values */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-3.5 max-w-4xl mx-auto mb-16 px-4 text-xs font-bold text-zinc-650 dark:text-zinc-350 uppercase tracking-wider"
          >
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Web autogestionada</span>
            <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-800 hidden sm:block" />
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Sin comisiones por reservas</span>
            <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-800 hidden sm:block" />
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Dominio propio incluido</span>
          </motion.div>
        </motion.div>
      </section>

      {/* Redesigned Showcase: Clean, Solid borders. Glassmorphism only inside the mockup cards */}
      <section id="algoritmo" className="py-8 px-6 max-w-6xl mx-auto relative z-10 mb-24 scroll-mt-20">
        <div className="text-center mb-10">
          <span className="text-[10px] bg-indigo-500/10 text-indigo-650 dark:bg-brand/10 dark:text-brand px-3.5 py-1.5 rounded-full font-black uppercase tracking-widest inline-block mb-3">
            Algoritmo Avialo en Acción
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
            Mira cómo transformamos tu negocio físico
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm max-w-lg mx-auto">
            Elige una pestaña de negocio tradicional. Pasa el ratón por encima del panel para experimentar el **efecto de rotación 3D en tiempo real**.
          </p>
        </div>

        {/* Clean, Non-glassmorphic solid container for the simulator box (Vercel-style grey canvas) */}
        <div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={tiltStyle}
          className="rounded-[2rem] border border-zinc-200 dark:border-zinc-900 overflow-hidden shadow-2xl bg-zinc-50 dark:bg-zinc-950 transition-shadow duration-300 hover:shadow-[0_40px_100px_rgba(0,0,0,0.18)] dark:hover:shadow-[0_40px_100px_rgba(124,58,237,0.12)] cursor-pointer relative"
        >
          <BorderBeam size={350} duration={14} borderWidth={1.5} colorFrom="var(--brand)" colorTo="var(--brand-accent)" />

          {/* Interactive tabs with Emil Kowalski sliding capsule layout animation */}
          <div className="flex flex-wrap md:flex-nowrap border-b border-zinc-200 dark:border-zinc-850 bg-zinc-100/50 dark:bg-zinc-950 p-2 gap-2 relative z-20">
            {Object.keys(pymes).map((key) => (
              <button
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePymeChange(key);
                }}
                className="relative flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-colors duration-250 cursor-pointer select-none z-10 outline-none"
              >
                {activePyme === key && (
                  <motion.div
                    layoutId="activePymeTabCapsule"
                    className="absolute inset-0 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-xl shadow-sm z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 26 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {pymes[key].icon}
                  <span>{pymes[key].label}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="p-6 md:p-10 min-h-[460px] flex flex-col lg:flex-row gap-10 relative z-10">
            
            {/* Left Column: Glassmorphic explanation block */}
            <div className="flex-1 flex flex-col justify-between text-left space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePyme}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-lg font-black uppercase tracking-widest inline-block">
                      {pymes[activePyme].algorithmTitle}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 leading-tight">
                      Así digitalizamos tu negocio de toda la vida:
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-405 text-xs sm:text-sm leading-relaxed font-medium">
                      {pymes[activePyme].algorithmDesc}
                    </p>
                  </div>

                  {/* Glassmorphic prompt simulation block */}
                  <div className="p-4 glass rounded-2xl border border-zinc-200/40 dark:border-zinc-850/60 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-955 flex items-center justify-center font-bold text-[9px] uppercase shrink-0 mt-0.5 shadow">
                      PY
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-450 dark:text-zinc-505 font-black uppercase tracking-wider block">Tu idea simple en español:</span>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 italic font-semibold">
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
                      <p className="text-[11px] text-zinc-850 dark:text-zinc-300 leading-relaxed font-semibold">
                        {pymes[activePyme].afterText}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* General pitch button to proceed */}
              <div className="pt-6 border-t border-zinc-200/50 dark:border-zinc-850/50">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('register');
                  }}
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-650 dark:text-brand hover:translate-x-1.5 transition-all outline-none"
                >
                  <span>Probar esta solución gratis</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Right Column: Visual Preview Canvas (Solid background frame) */}
            <div className="flex-1 bg-zinc-100 dark:bg-zinc-900/40 rounded-2xl p-4 md:p-6 border border-zinc-200/50 dark:border-zinc-850/50 flex items-center justify-center min-h-[340px]">
              <div 
                className="w-full h-full bg-white dark:bg-zinc-950 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-850 flex flex-col overflow-hidden max-w-md mx-auto"
                onClick={(e) => e.stopPropagation()}
              >
                
                {/* Visual Header */}
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850/50 px-4.5 py-3.5 bg-zinc-50/50 dark:bg-zinc-900">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block animate-pulse" />
                    <span className="text-[10px] font-black text-zinc-550 dark:text-zinc-400 tracking-wider">
                      {activePyme === 'hosteleria' && 'meson-asturiano.com'}
                      {activePyme === 'salud' && 'dentalia-consulta.es'}
                      {activePyme === 'comercio' && 'zapatos-artesanales.es'}
                    </span>
                  </div>
                  <span className="text-[8px] bg-indigo-500/10 text-indigo-650 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                    TU NUEVA WEB
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
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider animate-pulse">Generando web...</span>
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
                                Recetas familiares tradicionales. Elige una hora los domingos y reserva tu mesa online en un clic.
                              </p>
                            </div>

                            {/* Glassmorphic Reservas Widget (Glassmorphism only inside the mockup) */}
                            <div className="glass border border-indigo-200/40 dark:border-indigo-900/30 rounded-2xl p-4 bg-indigo-50/10 dark:bg-indigo-950/5 shadow-inner">
                              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 block mb-2">
                                📅 RESERVA TU MESA ONLINE
                              </span>

                              {!tableBooked ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {['13:30h', '14:30h', '15:30h'].map((time) => (
                                      <button
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className={cn(
                                          "py-2 rounded-xl text-[10px] font-bold border transition-all text-center duration-150 ease-out active:scale-[0.96]",
                                          selectedTime === time
                                            ? "bg-indigo-500 dark:bg-brand text-white border-transparent shadow-sm"
                                            : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-350 border-zinc-200 dark:border-zinc-800"
                                        )}
                                      >
                                        {time}
                                      </button>
                                    ))}
                                  </div>
                                  
                                  {/* Guest selector */}
                                  <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl p-2 text-[10px] font-bold">
                                    <span className="text-zinc-550">Comensales:</span>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => setTableCount(c => Math.max(1, c - 1))}
                                        className="w-5 h-5 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center border text-zinc-650 dark:text-zinc-300"
                                      >
                                        -
                                      </button>
                                      <span>{tableCount}</span>
                                      <button 
                                        onClick={() => setTableCount(c => c + 1)}
                                        className="w-5 h-5 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center border text-zinc-650 dark:text-zinc-300"
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
                                    Confirmar Mesa ({tableCount} pers.)
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
                                    <span className="text-[8.5px] text-zinc-400 dark:text-zinc-550 block mt-1">
                                      Tu reserva para {tableCount} personas a las {selectedTime} se ha confirmado. ¡Te esperamos!
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => { setTableBooked(false); setSelectedTime(null); }}
                                    className="text-[9px] text-indigo-500 dark:text-brand hover:underline font-bold"
                                  >
                                    Cambiar reserva
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
                              <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 block">🦷 Dentalia Clínica</span>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-455 leading-relaxed font-medium">
                                Tu clínica dental de confianza. Selecciona el servicio y reserva tu cita previa al instante.
                              </p>
                            </div>

                            {/* Glassmorphic Citas Widget (Glassmorphism only inside the mockup) */}
                            <div className="glass border border-purple-200/40 dark:border-purple-900/30 rounded-2xl p-4 bg-purple-50/10 dark:bg-purple-950/5 shadow-inner">
                              <span className="text-[9px] font-black uppercase tracking-wider text-purple-650 dark:text-brand-accent block mb-2">
                                👨‍⚕️ RESERVAR CITA PREVIA
                              </span>

                              {!clinicBooked ? (
                                <div className="space-y-3">
                                  <div className="space-y-1.5">
                                    {['🦷 Primera Revisión Gratis', '🧼 Limpieza Bucal Completa'].map((service, i) => (
                                      <button
                                        key={i}
                                        onClick={() => setSelectedService(service)}
                                        className={cn(
                                          "w-full text-left p-2.5 rounded-xl border transition-all text-[9.5px] font-bold flex justify-between items-center duration-150 active:scale-[0.98]",
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
                                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-955 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-45"
                                  >
                                    Confirmar Hora de Cita
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
                                    <span className="text-[10px] font-black uppercase tracking-wider block text-zinc-850 dark:text-zinc-250">¡Cita Confirmada!</span>
                                    <span className="text-[8.5px] text-zinc-400 dark:text-zinc-550 block mt-1 leading-normal">
                                      Tu cita para <strong>{selectedService}</strong> se ha guardado correctamente.
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => { setClinicBooked(false); setSelectedService(null); }}
                                    className="text-[9px] text-purple-600 dark:text-brand hover:underline font-bold"
                                  >
                                    Reservar otra cita
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
                              <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 block">👟 Zapatos Artesanales Soria</span>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-450 leading-relaxed font-medium">
                                Calzado hecho a mano con cuero natural. Calidad tradicional directa a tu casa.
                              </p>
                            </div>

                            {/* Glassmorphic Store Widget (Glassmorphism only inside the mockup) */}
                            <div className="glass border border-amber-250/30 dark:border-amber-900/30 rounded-2xl p-4 bg-amber-50/10 dark:bg-zinc-900/10 shadow-inner">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-[9px] font-black uppercase tracking-wider text-amber-650 dark:text-amber-400">
                                  📦 MODELO CLÁSICO ARTESANO
                                </span>
                                <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">89,00 €</span>
                              </div>

                              {!purchaseSuccess ? (
                                <div className="space-y-3">
                                  <div className="p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[8.5px] text-zinc-450 font-bold uppercase tracking-wider text-center">
                                    💳 Cobro con tarjeta seguro
                                  </div>
                                  <button
                                    onClick={() => setPurchaseSuccess(true)}
                                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-955 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 active:scale-[0.97]"
                                  >
                                    Comprar Ahora
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
                                    <span className="text-[10px] font-black uppercase tracking-wider block text-zinc-850 dark:text-zinc-250">¡Pago Recibido!</span>
                                    <span className="text-[8.5px] text-zinc-400 dark:text-zinc-550 block mt-1">
                                      Tu pedido se ha procesado con éxito. Te llegará un aviso con el envío.
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => setPurchaseSuccess(false)}
                                    className="text-[9px] text-zinc-550 hover:underline font-bold"
                                  >
                                    Volver a la tienda
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

      {/* Product Details Section (Cómo te podemos ayudar - detailed info for curious visitors) */}
      <section id="como-ayudamos" className="py-24 px-6 max-w-6xl mx-auto relative z-10 border-t border-zinc-200/50 dark:border-zinc-850/50 scroll-mt-20">
        <div className="text-center mb-16">
          <span className="text-[10px] bg-indigo-500/10 text-indigo-650 dark:bg-brand/10 dark:text-brand px-3.5 py-1.5 rounded-full font-black uppercase tracking-widest inline-block mb-3">
            ¿Cómo te ayudamos?
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            Digitalización sencilla paso a paso
          </h2>
          <p className="text-zinc-500 dark:text-zinc-405 text-xs sm:text-sm max-w-xl mx-auto">
            Hemos diseñado nuestro algoritmo propio para que no tengas que preocuparte de tecnicismos complejos. Vamos al grano.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <motion.div 
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="p-8 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-850/60 rounded-[2rem] text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-660 dark:text-brand flex items-center justify-center font-bold text-sm mb-6 border border-indigo-500/10">
              1
            </div>
            <h3 className="text-base font-black uppercase tracking-wider mb-3 text-zinc-900 dark:text-white">Describes tu idea</h3>
            <p className="text-zinc-500 dark:text-zinc-405 text-xs leading-relaxed font-medium">
              Escribe cómo es tu negocio tradicional usando tus propias palabras (por ejemplo: "tengo un mesón y quiero reservas de mesa los domingos"). Sin saber programar y sin tecnicismos raros.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="p-8 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-850/60 rounded-[2rem] text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-650 dark:text-brand-accent flex items-center justify-center font-bold text-sm mb-6 border border-purple-500/10">
              2
            </div>
            <h3 className="text-base font-black uppercase tracking-wider mb-3 text-zinc-900 dark:text-white">El algoritmo actúa</h3>
            <p className="text-zinc-500 dark:text-zinc-405 text-xs leading-relaxed font-medium">
              Nuestro algoritmo propio procesa el requerimiento, genera el código limpio, activa un sistema de reservas o catálogo comercial en una base de datos segura y despliega tu página en internet.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="p-8 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-850/60 rounded-[2rem] text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm mb-6 border border-emerald-500/10">
              3
            </div>
            <h3 className="text-base font-black uppercase tracking-wider mb-3 text-zinc-900 dark:text-white">Listo en 2 minutos</h3>
            <p className="text-zinc-500 dark:text-zinc-405 text-xs leading-relaxed font-medium">
              Tu web se publica automáticamente con dominio profesional incluido. Si necesitas cambiar algún plato, foto, horario o texto, solo tienes que pedírselo a la IA por el chat de tu panel.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Spectacular Real SME Owner Testimonials (Punchy, real-sounding reviews) */}
      <section id="testimonios" className="py-20 px-6 max-w-6xl mx-auto relative z-10 border-t border-zinc-200/50 dark:border-zinc-850/50 scroll-mt-20">
        <div className="text-center mb-16">
          <span className="text-[10px] bg-purple-500/10 text-purple-650 dark:bg-brand/10 dark:text-brand px-3.5 py-1.5 rounded-full font-black uppercase tracking-widest inline-block mb-3">
            Opiniones Reales
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
            Negocios que ya se han digitalizado
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm max-w-lg mx-auto">
            Hablamos con pequeños empresarios españoles de toda la vida que han dado el salto digital con Avialo.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {reviews.map((rev, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -6, scale: 1.015 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="p-8 bg-card/45 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/80 rounded-[2rem] flex flex-col justify-between text-left backdrop-blur-lg shadow-sm"
            >
              <div className="space-y-4">
                <div className="flex gap-1">
                  {[...Array(rev.stars)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold italic">
                  "{rev.text}"
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-brand flex items-center justify-center text-white font-black text-xs">
                  {rev.author[0]}
                </div>
                <div>
                  <span className="text-xs font-black text-zinc-900 dark:text-white block">{rev.author}</span>
                  <span className="text-[10px] text-zinc-450 dark:text-zinc-505 font-bold uppercase tracking-wider block">{rev.business}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing Section (Clean balance. NO highlighted popular banner, all animate on hover with high-fidelity Emil spring specs) */}
      <section id="pricing" className="py-24 px-6 max-w-6xl mx-auto relative z-10 border-t border-zinc-200/50 dark:border-zinc-850/50 scroll-mt-20">
        <div className="text-center mb-20">
          <span className="text-[10px] bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/20 text-emerald-650 dark:text-brand-success px-3.5 py-1.5 rounded-full font-black uppercase tracking-wider mb-4 inline-block">
            Precios Claros y Transparentes
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 max-w-2xl mx-auto">
            Elige el plan ideal para tu negocio
          </h2>
          <p className="text-zinc-550 dark:text-zinc-400 max-w-xl mx-auto text-sm font-medium">
            Todos los planes incluyen el diseño de la web y el alojamiento en internet. Cancela cuando quieras sin cuotas ocultas.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="p-8.5 rounded-[2.2rem] border flex flex-col justify-between relative bg-card shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-zinc-200 dark:border-zinc-850 hover:border-zinc-350 dark:hover:border-zinc-700"
            >
              <div>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-505 px-3 py-1 rounded-lg font-black uppercase tracking-widest mb-4 inline-block">
                  {plan.tier}
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
                className="w-full py-4.5 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-150 active:scale-[0.97] bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-955 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow"
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
            <span>Dudas Frecuentes</span>
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
              ¿Listo para dar el salto digital con tu negocio?
            </h2>

            <p className="text-zinc-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
              Únete a cientos de autónomos y pymes que ya consiguen clientes por internet gracias a nuestro algoritmo. Prueba gratis.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <ShimmerButton
                onClick={() => onNavigate('register')}
                className="px-8 py-4.5 text-xs font-black tracking-widest uppercase shadow-xl transition-all active:scale-[0.98]"
                borderRadius="1rem"
                shimmerColor="#ffffff"
                background="linear-gradient(135deg, var(--brand), var(--brand-2))"
              >
                <span>Digitalizar Mi Negocio Gratis</span>
                <ArrowRight className="w-4 h-4" />
              </ShimmerButton>
            </div>
          </div>
        </div>
      </section>

      {/* Spectacular Extensive Footer (Fully compliant with Avialo branding terms) */}
      <footer className="py-20 border-t border-zinc-200/50 dark:border-zinc-850/50 bg-zinc-50/40 dark:bg-zinc-950/90 px-8 relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10 text-left mb-16">
          
          {/* Main Info Column */}
          <div className="md:col-span-2 space-y-5">
            <div className="flex items-center gap-2">
              <Logo className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
              <span className="font-black text-lg text-zinc-900 dark:text-white">
                Avialo Builder<span className="text-brand">.</span>
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Transformación digital autónoma y de alto rendimiento para pequeños y medianos negocios tradicionales españoles de toda la vida.
            </p>
            <div className="pt-1.5 space-y-2 text-[11px] text-zinc-450 dark:text-zinc-500 font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Building size={14} className="text-indigo-500 shrink-0" />
                <span>Creado por Avialo Soluciones S.L.</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-purple-500 shrink-0" />
                <span>Avialo Builder es un producto de <a href="https://avialo.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">avialo.app</a></span>
              </div>
              <div className="flex items-center gap-2">
                <Info size={14} className="text-emerald-500 shrink-0" />
                <span>Este servicio está creado por <a href="https://avialo.es" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Avialo.es</a></span>
              </div>
            </div>
          </div>

          {/* Product links */}
          <div className="space-y-4">
            <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest block">Producto</span>
            <ul className="space-y-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <li><a href="#algoritmo" className="hover:text-foreground transition-colors">Algoritmo Autónomo</a></li>
              <li><a href="#como-ayudamos" className="hover:text-foreground transition-colors">Reservas de Mesa</a></li>
              <li><a href="#como-ayudamos" className="hover:text-foreground transition-colors">Citas Previas</a></li>
              <li><a href="#como-ayudamos" className="hover:text-foreground transition-colors">Tiendas Headless</a></li>
            </ul>
          </div>

          {/* Support links */}
          <div className="space-y-4">
            <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest block">Soporte</span>
            <ul className="space-y-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <li><a href="#faq" className="hover:text-foreground transition-colors">Centro de Ayuda</a></li>
              <li><span className="flex items-center gap-1.5"><Mail size={12} /> info@avialo.es</span></li>
              <li><span className="flex items-center gap-1.5"><Phone size={12} /> +34 900 avialo</span></li>
            </ul>
          </div>

          {/* Company links */}
          <div className="space-y-4">
            <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest block">Legal</span>
            <ul className="space-y-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <li><a href="#" className="hover:text-foreground transition-colors">Aviso Legal</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Política de Privacidad</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Términos del Servicio</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Política de Cookies</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-6xl mx-auto pt-8 border-t border-zinc-200/50 dark:border-zinc-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-500 font-bold uppercase tracking-wider">
            &copy; {new Date().getFullYear()} Avialo Soluciones S.L. Todos los derechos reservados.
          </p>
          <div className="text-[11px] text-zinc-450 dark:text-zinc-500 font-bold flex gap-4 uppercase tracking-wider">
            <span>Socio tecnológico de la PYME española</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
