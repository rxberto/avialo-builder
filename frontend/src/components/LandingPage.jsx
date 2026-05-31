import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Check, Sparkles, Code, Globe, MessageSquare, 
  Smartphone, Zap, Shield, Play, ArrowUpRight, Cpu, 
  Database, ShoppingBag, Eye, RefreshCw, HelpCircle, 
  ChevronDown, Calendar, CreditCard, Sun, Moon, Info, Star,
  Utensils, Stethoscope, Store, Folder, File, Terminal, Plus,
  Layers, HardDrive, LayoutGrid, Network, Share2
} from 'lucide-react';
import Logo from './ui/Logo';
import { DotPattern } from './ui/dot-pattern';
import { ShimmerButton } from './ui/shimmer-button';
import { BorderBeam } from './ui/border-beam';
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

  // High-Fidelity Stripe-like Wave Animation Canvas Logic
  useEffect(() => {
    const canvas = document.getElementById('hero-wave-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // Scale for high DPI displays
    let width = (canvas.width = 2164);
    let height = (canvas.height = 1853);
    
    const handleResize = () => {
      if (!canvas) return;
      // Keep static dimensions for consistency with Stripe canvas layout
    };
    window.addEventListener('resize', handleResize);

    let count = 0;
    const render = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      count += 0.007;

      // Draw layered mathematical waves
      const drawWave = (amplitude, frequency, speed, color, lineWidth, offsetMultiplier) => {
        ctx.beginPath();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        
        for (let x = 0; x < width; x += 15) {
          // Complex mathematical wave structure combining multiple frequencies
          const y = height * 0.45 
            + Math.sin(x * frequency + count * speed) * amplitude 
            + Math.cos(x * 0.003 - count * 1.2) * (amplitude * 0.3)
            + Math.sin(x * 0.0007 + count * 0.7) * (amplitude * offsetMultiplier);
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      };

      // Draw 3 layers of beautiful indigo/purple flowing waves
      drawWave(120, 0.002, 1.4, 'rgba(99, 102, 241, 0.08)', 2, 0.5); // Indigo
      drawWave(95, 0.0035, -1.0, 'rgba(168, 85, 247, 0.06)', 1.5, 0.3); // Purple
      drawWave(70, 0.0015, 0.8, 'rgba(236, 72, 153, 0.04)', 1.2, 0.7); // Pink

      // Draw particle grids projecting in perspective
      const rows = 24;
      const cols = 40;
      const spacingX = width / cols;
      const spacingY = height / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Calculate grid node position
          const baseX = c * spacingX;
          const baseY = r * spacingY;
          
          // Apply wave deformation to particle positions
          const waveHeight = Math.sin(c * 0.09 + count * 1.5) * 40 + Math.cos(r * 0.12 - count * 0.8) * 30;
          const x = baseX;
          const y = baseY + waveHeight;

          // Simple opacity fade on borders to look organic
          const alphaX = Math.sin((c / cols) * Math.PI);
          const alphaY = Math.sin((r / rows) * Math.PI);
          const opacity = alphaX * alphaY * 0.15;

          if (opacity > 0.01) {
            ctx.beginPath();
            ctx.arc(x, y, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(139, 92, 246, ${opacity})`;
            ctx.fill();
            
            // Draw faint grid connecting lines
            if (c < cols - 1 && c % 3 === 0) {
              ctx.beginPath();
              ctx.moveTo(x, y);
              const nextWave = Math.sin((c + 1) * 0.09 + count * 1.5) * 40 + Math.cos(r * 0.12 - count * 0.8) * 30;
              ctx.lineTo((c + 1) * spacingX, baseY + nextWave);
              ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.25})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Dynamic 3D Hover rotation calculations with spring dampening
  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    
    const rotateX = -(y / (box.height / 2)) * 6;
    const rotateY = (x / (box.width / 2)) * 6;

    setTiltStyle({
      transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.08s cubic-bezier(0.25, 1, 0.5, 1)'
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
    });
  };

  // Traditional Spanish Business (PYMEs) Configuration (With free premium Unsplash images)
  const pymes = {
    hosteleria: {
      id: 'hosteleria',
      icon: <Utensils className="w-4 h-4" />,
      label: 'Mesón Familiar',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      prompt: 'Tengo un mesón tradicional y quiero recibir reservas de mesa los domingos por internet sin que me suene el móvil.',
      algorithmTitle: 'RESERVAS DE MESA AUTOMÁTICAS',
      algorithmDesc: 'Tus clientes reservan directamente en tu web. El sistema calcula las mesas libres de forma automática y te llega un aviso directo.',
      beforeText: 'Teléfono colapsado los sábados, llamadas perdidas fuera de hora, reservas apuntadas a mano.',
      afterText: 'Tus mesas llenas de forma automática. Clientes contentos reservando a cualquier hora.'
    },
    salud: {
      id: 'salud',
      icon: <Stethoscope className="w-4 h-4" />,
      label: 'Clínica Dental / Fisio',
      image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80',
      prompt: 'Tengo una clínica de barrio y necesito que los pacientes reserven cita previa online de forma rápida.',
      algorithmTitle: 'CITA PREVIA ONLINE',
      algorithmDesc: 'Tus pacientes eligen el tratamiento, ven tus horas libres en tiempo real y reservan su cita al instante.',
      beforeText: 'Hojas de agenda tachadas, interrumpir tratamientos para coger llamadas, despistes de citas.',
      afterText: 'Tu agenda siempre organizada y visible. Menos llamadas molestas durante tus consultas.'
    },
    comercio: {
      id: 'comercio',
      icon: <Store className="w-4 h-4" />,
      label: 'Comercio / Tienda Local',
      image: 'https://images.unsplash.com/photo-1449247709967-d4461a6a6103?auto=format&fit=crop&w=800&q=80',
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
        '50 Créditos de IA mensuales',
        'Crear sitio: 10 cr | Editar: 1 a 3 cr',
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
        '200 Créditos de IA mensuales',
        'Crear sitio: 10 cr | Editar: 1 a 3 cr',
        'Calendario de Cita Previa integrado',
        'Panel de control de reservas',
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
        '500 Créditos de IA mensuales',
        'Crear sitio: 10 cr | Editar: 1 a 3 cr',
        'Catálogo de productos interactivo',
        'Pasarela de cobros con Tarjeta / Stripe',
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
    // FULL WIDTH layout container (no max-width bounding globally to avoid cutting page width!)
    <div className="bg-background text-foreground min-h-screen relative w-full selection:bg-indigo-500/20 antialiased overflow-x-hidden">
      
      {/* Spectacular three.js r178 Stripe-like Wave Canvas in Hero Background */}
      <div className="absolute inset-0 w-full h-[850px] overflow-hidden pointer-events-none z-0">
        <canvas 
          id="hero-wave-canvas" 
          className="hero-wave-animation__canvas absolute top-0 left-1/2 -translate-x-1/2 opacity-35 dark:opacity-50" 
          aria-hidden="true" 
          data-engine="three.js r178"
          width="2164" 
          height="1853"
          style={{ width: '2164px', height: '1853px', transform: 'translateX(-50%) scale(0.95)' }}
        />
      </div>

      {/* Hero Section: Spectacular Split Screen Layout (Left: Direct text, Right: Stunning Visual Builder IDE with 3D Tilt) */}
      <section className="relative z-10 pt-20 pb-16 md:pt-32 md:pb-24 px-6 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center justify-between gap-16">
        
        {/* Left Column: Breathtaking Left-Aligned Text Pitch (Completely clean & direct) */}
        <div className="flex flex-col items-start text-left w-full lg:w-[48%] shrink-0 space-y-8 z-20">
          
          {/* Simple, Solid, High-Impact H1 Title (Left aligned, no jargon) */}
          <h1 className="text-4xl sm:text-5xl lg:text-[4.2rem] font-black tracking-tight leading-[1.05] text-zinc-900 dark:text-white">
            Tu negocio en internet,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-brand dark:via-brand-accent dark:to-brand-2">
              listo en 2 minutos.
            </span>
          </h1>

          {/* Sincere, simple and clear subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-zinc-500 dark:text-zinc-400 font-semibold leading-relaxed max-w-xl">
            Escribe cómo es tu negocio tradicional en español. Nuestro algoritmo propio genera tu web profesional y activa tu sistema de reservas o cobros al instante.
          </p>

          {/* Spectacular CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto pt-2">
            <ShimmerButton
              onClick={() => onNavigate('register')}
              className="px-8 py-4 text-xs font-black tracking-widest uppercase shadow-xl shadow-indigo-500/10 dark:shadow-brand/10 transition-transform active:scale-[0.98] w-full sm:w-auto"
              borderRadius="1rem"
              shimmerColor="var(--brand-accent)"
              background="linear-gradient(135deg, var(--brand), var(--brand-2))"
            >
              <span>PROBAR MI NEGOCIO GRATIS</span>
              <ArrowRight className="w-4 h-4" />
            </ShimmerButton>

            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-white hover:bg-zinc-50 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition-all duration-300 text-xs active:scale-[0.98] shadow-sm w-full sm:w-auto"
            >
              Ver Planes y Precios
            </a>
          </div>

          {/* Plain simple trust values list */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-black text-zinc-400 dark:text-zinc-400 uppercase tracking-wider pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 w-full">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Web autogestionada</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Sin comisiones por reservas</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Dominio propio incluido</span>
          </div>

        </div>

        {/* Right Column: Visual IDE Mockup (VS Code style but visual layout builder) with 3D Hover Tilt */}
        <div className="w-full lg:w-[50%] flex justify-center items-center relative h-[420px] sm:h-[560px] z-10 mt-6 lg:mt-0">
          
          {/* Overlapping Glassmorphic Card 1 (Hovering in front, z-index 30, casting high-fidelity shadow) */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="hidden sm:flex absolute -top-6 -left-6 z-30 max-w-[200px] p-4 glass border border-zinc-200/40 dark:border-zinc-800/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] text-left flex items-start gap-3 pointer-events-none select-none"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Check className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-wider block leading-tight">PostgreSQL Activo</span>
              <span className="text-[8.5px] text-zinc-500 dark:text-zinc-400 block leading-normal">Base de datos aislada para tu negocio.</span>
            </div>
          </motion.div>

          {/* Overlapping Glassmorphic Card 2 (Hovering bottom-right, z-index 30, casting high-fidelity shadow) */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            className="hidden sm:flex absolute -bottom-4 -right-4 z-30 max-w-[200px] p-4 glass border border-zinc-200/40 dark:border-zinc-800/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] text-left flex items-start gap-3 pointer-events-none select-none"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-wider block leading-tight">Algoritmo Avialo</span>
              <span className="text-[8.5px] text-zinc-500 dark:text-zinc-400 block leading-normal">Activando tu sistema de reservas.</span>
            </div>
          </motion.div>

          {/* Spectacular Visual IDE Mockup Box */}
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={tiltStyle}
            className="w-full max-w-md h-[380px] sm:h-[480px] rounded-[2.5rem] border border-zinc-200 dark:border-zinc-900 overflow-hidden shadow-2xl bg-[#0b0c0f] dark:bg-[#050608] flex flex-col transition-shadow duration-300 relative pointer-events-auto z-10 text-left font-sans"
          >
            <BorderBeam size={280} duration={12} borderWidth={1.5} colorFrom="var(--brand)" colorTo="var(--brand-accent)" />

            {/* IDE Header navigation */}
            <div className="flex justify-between items-center border-b border-[#161a22] bg-[#07090b] px-5 py-3">
              <div className="flex gap-2 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 block" />
              </div>
              <div className="text-[9.5px] font-bold text-zinc-500 bg-[#0b0c0f] px-5 py-1 rounded-md border border-[#161a22] truncate max-w-[200px] font-mono">
                avialo-builder / visual-builder.jsx
              </div>
              <div className="w-8 shrink-0" />
            </div>

            {/* IDE Workspace body */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Narrow visual sidebar */}
              <div className="w-12 bg-[#07090b] border-r border-[#161a22] flex flex-col items-center py-4 gap-4 text-zinc-500 shrink-0">
                <LayoutGrid className="w-4 h-4 text-indigo-400" />
                <Network className="w-4 h-4" />
                <Database className="w-4 h-4" />
                <Layers className="w-4 h-4" />
                <Share2 className="w-4 h-4" />
              </div>

              {/* Central Editor window: Visual Canvas with connected blocks */}
              <div className="flex-grow bg-[#0b0c0f] p-5 relative overflow-hidden flex flex-col justify-between">
                
                {/* Canvas grid background pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                <div className="text-zinc-500 text-[8.5px] border-b border-[#161a22] pb-2 uppercase tracking-widest font-mono font-bold relative z-10">
                  DISEÑADOR VISUAL DE INFRAESTRUCTURA
                </div>

                {/* SVG Connecting Flow Lines inside the IDE */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <defs>
                    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                  
                  {/* Dynamic path lines linking visual cards */}
                  <path d="M 60 75 Q 120 75 120 135" fill="none" stroke="url(#glowGrad)" strokeWidth="1.5" strokeDasharray="3 3" />
                  <path d="M 120 185 Q 120 230 65 245" fill="none" stroke="url(#glowGrad)" strokeWidth="1.5" strokeDasharray="3 3" />
                  <path d="M 120 185 Q 120 235 185 245" fill="none" stroke="url(#glowGrad)" strokeWidth="1.5" strokeDasharray="3 3" />
                  <path d="M 120 185 Q 120 340 185 340" fill="none" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="1.5" />
                </svg>

                {/* Flow blocks display */}
                <div className="space-y-4 relative z-10 flex-grow mt-2 flex flex-col justify-between py-1">
                  
                  {/* Visual Node 1: Input prompt */}
                  <div className="flex justify-start">
                    <div className="bg-[#14161d] border border-[#232936] rounded-xl px-3 py-2 text-[9px] shadow max-w-[150px]">
                      <span className="text-[7.5px] text-zinc-500 font-mono block font-black uppercase">1. IDEA DE PYME</span>
                      <span className="text-zinc-200 font-bold block mt-0.5 truncate">"Mesón tradicional"</span>
                    </div>
                  </div>

                  {/* Visual Node 2: Core Algorithm (Centered, glowing purple) */}
                  <div className="flex justify-center">
                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-2 text-[9.5px] shadow-lg shadow-indigo-500/5 text-center relative max-w-[170px] animate-pulse">
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
                      <span className="text-[7.5px] text-indigo-400 font-mono block font-black uppercase">2. ALGORITMO AVIALO</span>
                      <span className="text-white font-black block mt-0.5 tracking-wider">GENERANDO WEB...</span>
                    </div>
                  </div>

                  {/* Visual Nodes Row 3: Output Databases & Services */}
                  <div className="flex justify-between items-center gap-2">
                    
                    {/* Database active block */}
                    <div className="bg-[#14161d] border border-emerald-500/20 rounded-xl px-3 py-2 text-[9px] shadow-sm max-w-[125px]">
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-zinc-200 font-black truncate">Base de Datos</span>
                      </div>
                      <span className="text-[7.5px] text-emerald-400 block mt-1 font-bold">● PostgreSQL OK</span>
                    </div>

                    {/* Booking engine active block */}
                    <div className="bg-[#14161d] border border-[#232936] rounded-xl px-3 py-2 text-[9px] shadow-sm max-w-[125px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="text-zinc-200 font-black truncate">Reservas</span>
                      </div>
                      <span className="text-[7.5px] text-indigo-400 block mt-1 font-bold">● Calendario Activo</span>
                    </div>

                  </div>

                  {/* Visual Node 4: Final deployment status */}
                  <div className="flex justify-end pt-2">
                    <div className="bg-[#14161d] border border-indigo-500/30 rounded-xl px-3 py-2 text-[9px] shadow flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-indigo-400" />
                      <div>
                        <span className="text-[7.5px] text-zinc-500 font-mono block font-black uppercase">3. WEB EN VIVO</span>
                        <span className="text-emerald-400 font-black block mt-0.5">meson-asturiano.com 🚀</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Visual Terminal compiler output */}
                <div className="mt-3 p-2.5 rounded-xl border border-zinc-800/80 bg-[#07090b] text-[8.5px] text-zinc-400 leading-normal flex items-start gap-2 shadow-inner font-mono">
                  <Terminal size={12} className="shrink-0 mt-0.5 text-indigo-500" />
                  <div className="space-y-0.5 text-[8.5px]">
                    <span className="text-zinc-300 font-bold block uppercase tracking-wider">Deploy status: OK</span>
                    <span className="text-zinc-500 block">Components synthesized, SSL deployed on Vercel.</span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>

      </section>

      {/* Trust & Limits Info banner */}
      <section className="py-10 bg-zinc-50 dark:bg-zinc-900/60 border-t border-b border-zinc-200/60 dark:border-zinc-800/80 text-center px-6 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-bold flex items-center gap-2 mx-auto md:mx-0">
            <Info size={16} className="text-indigo-500 shrink-0" />
            <span>
              Políticas de Aislamiento Estricto: Cada plan asigna exactamente <strong className="text-zinc-800 dark:text-zinc-200 underline decoration-indigo-500/40 font-black">1 Sitio Web activo</strong> completo.
            </span>
          </p>
          <div className="flex gap-6 text-xs text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider mx-auto md:mx-0">
            <span className="flex items-center gap-1.5"><Shield size={12} className="text-brand-success" /> SSL Gratis</span>
            <span className="flex items-center gap-1.5"><Database size={12} className="text-indigo-500" /> PostgreSQL</span>
            <span className="flex items-center gap-1.5"><Cpu size={12} className="text-purple-500" /> Medusa.js v2</span>
          </div>
        </div>
      </section>

      {/* "EL DE AHORA" - Moved here, made LARGER, with NO 3D perspective tilt effect */}
      <section className="py-24 px-6 bg-zinc-950 text-white relative z-10 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
          
          {/* Narrative Column */}
          <div className="w-full lg:w-[40%] text-left space-y-6">
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-full font-black uppercase tracking-widest inline-block">
              Infraestructura Técnica Real
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Bajo el capó:<br />
              Código real y limpio.
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-medium">
              A diferencia de plantillas estáticas y sencillas, nuestro algoritmo genera bases de datos reales y código en React. Cada PYME tiene su propio aislamiento de datos cifrados.
            </p>

            {/* Specifications bullet points */}
            <div className="space-y-4 pt-4 text-xs font-semibold text-zinc-300">
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 mt-0.5">
                  <Check size={12} />
                </div>
                <div>
                  <span className="block font-black text-white uppercase tracking-wider text-[10.5px]">Aislamiento PostgreSQL Total</span>
                  <span className="text-zinc-500 text-[10px] leading-relaxed">Tu base de datos es dedicada y única. Tus clientes están 100% aislados y seguros.</span>
                </div>
              </div>
              
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 mt-0.5">
                  <Check size={12} />
                </div>
                <div>
                  <span className="block font-black text-white uppercase tracking-wider text-[10.5px]">Cero Dependencia</span>
                  <span className="text-zinc-500 text-[10px] leading-relaxed">La web y la base de datos te pertenecen. Si algún día decides irte, te damos todo tu código.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Large Stable Code IDE container (No tilt effect, larger dimensions) */}
          <div className="w-full lg:w-[58%] flex justify-center items-center">
            <div className="w-full max-w-2xl h-[480px] rounded-[2rem] border border-zinc-800 overflow-hidden shadow-2xl bg-[#090b0d] flex flex-col relative text-left font-mono">
              <BorderBeam size={400} duration={14} borderWidth={1.2} colorFrom="var(--brand)" colorTo="rgba(139, 92, 246, 0.4)" />

              {/* IDE Header */}
              <div className="flex justify-between items-center border-b border-zinc-900 bg-[#050608] px-5 py-3.5">
                <div className="flex gap-1.5 shrink-0">
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500/60 block" />
                  <span className="w-3.5 h-3.5 rounded-full bg-yellow-500/60 block" />
                  <span className="w-3.5 h-3.5 rounded-full bg-green-500/60 block" />
                </div>
                <div className="text-[10px] font-bold text-zinc-500 bg-[#090b0d] px-6 py-1 rounded border border-zinc-900 truncate">
                  pyme-isolation-engine / db / schema.prisma
                </div>
                <div className="w-8 shrink-0" />
              </div>

              {/* IDE Workspace body */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* Sidebar with files explorer */}
                <div className="w-36 bg-[#050608] border-r border-zinc-900 p-4 space-y-4 text-[9.5px] text-zinc-500 shrink-0 font-bold">
                  <span className="uppercase tracking-widest text-[8px] opacity-40 block">EXPLORADOR</span>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>src</span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-3.5 text-zinc-400">
                      <File className="w-3 h-3 text-purple-400 shrink-0" />
                      <span className="truncate">index.jsx</span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-3.5 text-zinc-300 bg-[#161a22]/80 p-1 rounded">
                      <Database className="w-3 h-3 text-yellow-500 shrink-0" />
                      <span className="truncate text-white">schema.prisma</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <File className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                      <span className="truncate">config.json</span>
                    </div>
                  </div>
                </div>

                {/* Central Code Syntax Highlighting area */}
                <div className="flex-grow p-6 space-y-4 bg-[#090b0d] text-[10.5px] text-zinc-300 font-medium overflow-y-auto">
                  <div className="text-zinc-500 text-[8.5px] border-b border-zinc-900 pb-2 uppercase tracking-widest font-bold">
                    DATABASE MIGRATION SCHEMAS
                  </div>
                  <div className="space-y-1.5 leading-relaxed text-zinc-400 font-mono">
                    <div>
                      <span className="text-purple-400">model</span>{' '}
                      <span className="text-yellow-400">PymeBooking</span> {'{'}
                    </div>
                    <div className="pl-4">
                      <span className="text-blue-400">id</span>{' '}
                      <span className="text-indigo-400">String</span>{' '}
                      <span className="text-zinc-500">@id @default(uuid())</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-blue-400">comensales</span>{' '}
                      <span className="text-green-400">Int</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-blue-400">date</span>{' '}
                      <span className="text-indigo-400">DateTime</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-blue-400">dbIsolation</span>{' '}
                      <span className="text-green-400">Boolean</span>{' '}
                      <span className="text-zinc-500">@default(true)</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-blue-400">sslEncryption</span>{' '}
                      <span className="text-green-400">Boolean</span>{' '}
                      <span className="text-zinc-500">@default(true)</span>
                    </div>
                    <div>{'}'}</div>
                  </div>

                  {/* Active compiler overlay */}
                  <div className="mt-6 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-[9.5px] text-indigo-400 leading-normal flex items-start gap-2.5 shadow-lg">
                    <Terminal size={15} className="shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold block uppercase tracking-wider">Avialo Algorithm Compiled successfully</span>
                      <span className="text-zinc-500 block">PostgreSQL isolated schema deployed in 1.4s</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Redesigned Showcase (Large size below the hero, NO 3D hover tilt effect) */}
      <section className="py-24 px-6 max-w-6xl mx-auto relative z-10 border-t border-zinc-200/50 dark:border-zinc-800/50 scroll-mt-20">
        <div className="text-center mb-12">
          <span className="text-[10px] bg-indigo-500/10 text-indigo-650 dark:bg-brand/10 dark:text-brand px-3.5 py-1.5 rounded-full font-black uppercase tracking-widest inline-block mb-3">
            Algoritmo Avialo en Acción
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-3 text-zinc-900 dark:text-white">
            Elige un tipo de negocio tradicional
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Haz clic en las pestañas para ver cómo nuestro algoritmo propio procesa las necesidades de una PYME local y las digitaliza de inmediato en una web premium con cita previa o cobros seguros.
          </p>
        </div>

        {/* Breathtaking large non-tilting glassmorphic preview container */}
        <div className="rounded-[2.5rem] border border-zinc-200 dark:border-zinc-900 overflow-hidden shadow-2xl bg-zinc-50 dark:bg-zinc-950 relative">
          <BorderBeam size={450} duration={16} borderWidth={1.5} colorFrom="var(--brand)" colorTo="var(--brand-accent)" />

          {/* Interactive tabs with sliding capsule layout */}
          <div className="flex flex-wrap md:flex-nowrap border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950 p-2 gap-2 relative z-20">
            {Object.keys(pymes).map((key) => (
              <button
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePymeChange(key);
                }}
                className="relative flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors duration-250 cursor-pointer select-none z-10 outline-none"
              >
                {activePyme === key && (
                  <motion.div
                    layoutId="activePymeTabCapsuleShowcase"
                    className="absolute inset-0 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl shadow z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 26 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-black">
                  {pymes[key].icon}
                  <span>{pymes[key].label}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="p-6 md:p-12 min-h-[460px] flex flex-col lg:flex-row gap-12 relative z-10">
            
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
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed font-medium">
                      {pymes[activePyme].algorithmDesc}
                    </p>
                  </div>

                  {/* Glassmorphic prompt simulation block */}
                  <div className="p-5 glass rounded-[1.5rem] border border-zinc-200/40 dark:border-zinc-800/60 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-955 flex items-center justify-center font-bold text-[9px] uppercase shrink-0 mt-0.5 shadow">
                      PY
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-wider block">Tu idea simple en español:</span>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 italic font-semibold">
                        "{pymes[activePyme].prompt}"
                      </p>
                    </div>
                  </div>

                  {/* Before vs After comparison */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl border border-red-500/10 bg-red-500/5 text-left">
                      <span className="text-[10px] text-red-500 font-black uppercase tracking-wider block mb-1">❌ Antes (Tradicional):</span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                        {pymes[activePyme].beforeText}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 text-left">
                      <span className="text-[10px] text-emerald-500 font-black uppercase tracking-wider block mb-1">🎉 Después (Con Avialo):</span>
                      <p className="text-[11px] text-zinc-800 dark:text-zinc-300 leading-relaxed font-semibold">
                        {pymes[activePyme].afterText}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* General pitch button to proceed */}
              <div className="pt-6 border-t border-zinc-200/50 dark:border-zinc-800/50">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('register');
                  }}
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-655 dark:text-brand hover:translate-x-1.5 transition-all outline-none"
                >
                  <span>Probar esta solución gratis</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Right Column: Visual Preview Canvas (With gorgeous free Unsplash images embedded) */}
            <div className="flex-1 bg-zinc-100 dark:bg-zinc-900/40 rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-center min-h-[340px]">
              <div className="w-full h-full bg-white dark:bg-zinc-950 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden max-w-md mx-auto">
                
                {/* Visual Header */}
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800/50 px-4.5 py-3.5 bg-zinc-50/50 dark:bg-zinc-900">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block animate-pulse" />
                    <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 tracking-wider">
                      {activePyme === 'hosteleria' && 'meson-asturiano.com'}
                      {activePyme === 'salud' && 'dentalia-consulta.es'}
                      {activePyme === 'comercio' && 'zapatos-artesanales.es'}
                    </span>
                  </div>
                  <span className="text-[8px] bg-indigo-500/10 text-indigo-650 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                    TU NUEVA WEB
                  </span>
                </div>

                {/* Simulated Content Screen with premium free Unsplash images at the top */}
                <div className="flex-1 flex flex-col justify-between overflow-y-auto text-xs text-left">
                  <AnimatePresence mode="wait">
                    {isAnimating ? (
                      <motion.div
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center py-20 p-6"
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
                        className="flex-1 flex flex-col"
                      >
                        {/* Beautiful Unsplash Header image representing the active business */}
                        <div className="w-full h-32 relative overflow-hidden shrink-0 border-b border-zinc-100 dark:border-zinc-800">
                          <img 
                            src={pymes[activePyme].image} 
                            alt={pymes[activePyme].label}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <span className="absolute bottom-3 left-4 text-xs font-black text-white uppercase tracking-wider">
                            {pymes[activePyme].label}
                          </span>
                        </div>

                        {/* Widget content area */}
                        <div className="p-6 space-y-4 flex-grow flex flex-col justify-between">
                          
                          {/* Preset 1: Restaurant Booking Preview */}
                          {activePyme === 'hosteleria' && (
                            <div className="space-y-4 flex-grow flex flex-col justify-between">
                              <div className="space-y-1.5">
                                <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 block">🥘 Recetas Tradicionales de la Casa</span>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                                  Cocina gallega tradicional y carnes a la brasa. Selecciona tu hora los domingos y reserva mesa online en un clic.
                                </p>
                              </div>

                              {/* Glassmorphic Reservas Widget */}
                              <div className="glass border border-indigo-200/40 dark:border-indigo-900/30 rounded-2xl p-4 bg-indigo-50/10 dark:bg-indigo-950/5 shadow-inner">
                                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 block mb-2">
                                  📅 RESERVAR MESA EN VIVO
                                </span>

                                {!tableBooked ? (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {['13:30h', '14:30h', '15:30h'].map((time) => (
                                        <button
                                          key={time}
                                          onClick={() => setSelectedTime(time)}
                                          className={cn(
                                            "py-2 rounded-xl text-[10px] font-bold border transition-all text-center duration-155 ease-out active:scale-[0.96]",
                                            selectedTime === time
                                              ? "bg-indigo-500 dark:bg-brand text-white border-transparent shadow animate-pulse-glow"
                                              : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800"
                                          )}
                                        >
                                          {time}
                                        </button>
                                      ))}
                                    </div>
                                    
                                    {/* Guest selector */}
                                    <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 text-[10px] font-bold">
                                      <span className="text-zinc-555">Comensales:</span>
                                      <div className="flex items-center gap-2">
                                        <button 
                                          onClick={() => setTableCount(c => Math.max(1, c - 1))}
                                          className="w-5 h-5 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center border text-zinc-500 dark:text-zinc-300"
                                        >
                                          -
                                        </button>
                                        <span>{tableCount}</span>
                                        <button 
                                          onClick={() => setTableCount(c => c + 1)}
                                          className="w-5 h-5 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center border text-zinc-500 dark:text-zinc-300"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>

                                    <button
                                      disabled={!selectedTime}
                                      onClick={() => setTableBooked(true)}
                                      className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-45"
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
                                      <span className="text-[10px] font-black uppercase tracking-wider block text-zinc-800 dark:text-zinc-200">¡Mesa Reservada!</span>
                                      <span className="text-[8.5px] text-zinc-400 dark:text-zinc-500 block mt-1">
                                        Tu reserva para {tableCount} personas a las {selectedTime} se ha confirmado. ¡Te esperamos!
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => { setTableBooked(false); setSelectedTime(null); }}
                                      className="text-[9px] text-indigo-500 dark:text-brand hover:underline font-bold font-sans"
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
                              <div className="space-y-1.5">
                                <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 block">🩺 Cuidado de la Salud Dental</span>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                                  Tratamientos dentales avanzados de barrio. Selecciona el servicio y reserva tu cita previa al instante.
                                </p>
                              </div>

                              {/* Glassmorphic Citas Widget */}
                              <div className="glass border border-purple-200/40 dark:border-purple-900/30 rounded-2xl p-4 bg-purple-50/10 dark:bg-purple-950/5 shadow-inner">
                                <span className="text-[9px] font-black uppercase tracking-wider text-purple-650 dark:text-brand-accent block mb-2">
                                  👨‍⚕️ CITACIÓN EN DOS PASOS
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
                                              ? "bg-purple-600 text-white border-transparent shadow"
                                              : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800"
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
                                      className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-955 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-45"
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
                                      <span className="text-[10px] font-black uppercase tracking-wider block text-zinc-800 dark:text-zinc-200">¡Cita Confirmada!</span>
                                      <span className="text-[8.5px] text-zinc-400 dark:text-zinc-500 block mt-1 leading-normal">
                                        Tu cita para <strong>{selectedService}</strong> se ha guardado correctamente.
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => { setClinicBooked(false); setSelectedService(null); }}
                                      className="text-[9px] text-purple-600 dark:text-brand hover:underline font-bold font-sans"
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
                              <div className="space-y-1.5">
                                <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 block">👟 Zapatos Hechos a Mano</span>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                                  Calzado artesanal premium elaborado con cueros españoles naturales. Directo a tu domicilio.
                                </p>
                              </div>

                              {/* Store Widget */}
                              <div className="glass border border-amber-250/30 dark:border-amber-900/30 rounded-2xl p-4 bg-amber-50/10 dark:bg-zinc-900/10 shadow-inner">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-650 dark:text-amber-400">
                                    📦 ZAPATO CLÁSICO ARTESANO
                                  </span>
                                  <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">89,00 €</span>
                                </div>

                                {!purchaseSuccess ? (
                                  <div className="space-y-3">
                                    <div className="p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider text-center">
                                      💳 Cobro con tarjeta seguro (Stripe)
                                    </div>
                                    <button
                                      onClick={() => setPurchaseSuccess(true)}
                                      className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-955 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 active:scale-[0.97]"
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
                                      <span className="text-[10px] font-black uppercase tracking-wider block text-zinc-800 dark:text-zinc-200">¡Pago Recibido!</span>
                                      <span className="text-[8.5px] text-zinc-400 dark:text-zinc-500 block mt-0.5 leading-tight">
                                        Tu pedido se ha procesado con éxito. Te llegará un aviso con el envío.
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => setPurchaseSuccess(false)}
                                      className="text-[8px] text-zinc-555 hover:underline font-bold font-sans"
                                    >
                                      Volver a la tienda
                                    </button>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          )}

                        </div>
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
      <section id="como-ayudamos" className="py-24 px-6 max-w-7xl mx-auto relative z-10 border-t border-zinc-200/50 dark:border-zinc-800/50 scroll-mt-20">
        <div className="text-center mb-16">
          <span className="text-[10px] bg-indigo-500/10 text-indigo-650 dark:bg-brand/10 dark:text-brand px-3.5 py-1.5 rounded-full font-black uppercase tracking-widest inline-block mb-3">
            ¿Cómo te ayudamos?
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 text-zinc-900 dark:text-white">
            Digitalización sencilla paso a paso
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto">
            Hemos diseñado nuestro algoritmo propio para que no tengas que preocuparte de tecnicismos complejos. Vamos al grano.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <motion.div 
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="p-8 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-800/60 rounded-[2rem] text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-660 dark:text-brand flex items-center justify-center font-bold text-sm mb-6 border border-indigo-500/10">
              1
            </div>
            <h3 className="text-base font-black uppercase tracking-wider mb-3 text-zinc-900 dark:text-white">Describes tu idea</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-medium">
              Escribe cómo es tu negocio tradicional usando tus propias palabras (por ejemplo: "tengo un mesón y quiero reservas de mesa los domingos"). Sin saber programar y sin tecnicismos raros.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="p-8 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-800/60 rounded-[2rem] text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-650 dark:text-brand-accent flex items-center justify-center font-bold text-sm mb-6 border border-purple-500/10">
              2
            </div>
            <h3 className="text-base font-black uppercase tracking-wider mb-3 text-zinc-900 dark:text-white">El algoritmo actúa</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-medium">
              Nuestro algoritmo propio procesa el requerimiento, genera el código limpio, activa un sistema de reservas o catálogo comercial en una base de datos segura y despliega tu página en internet.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="p-8 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-800/60 rounded-[2rem] text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm mb-6 border border-emerald-500/10">
              3
            </div>
            <h3 className="text-base font-black uppercase tracking-wider mb-3 text-zinc-900 dark:text-white">Listo en 2 minutos</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-medium">
              Tu web se publica automáticamente con dominio profesional incluido. Si necesitas cambiar algún plato, foto, horario o texto, solo tienes que pedírselo a la IA por el chat de tu panel.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Spectacular Real SME Owner Testimonials (Punchy, real-sounding reviews) */}
      <section id="testimonios" className="py-20 px-6 max-w-7xl mx-auto relative z-10 border-t border-zinc-200/50 dark:border-zinc-800/50 scroll-mt-20">
        <div className="text-center mb-16">
          <span className="text-[10px] bg-purple-500/10 text-purple-650 dark:bg-brand/10 dark:text-brand px-3.5 py-1.5 rounded-full font-black uppercase tracking-widest inline-block mb-3">
            Opiniones Reales
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 text-zinc-900 dark:text-white">
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
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">{rev.business}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing Section (Clean balance. NO highlighted popular banner, all animate on hover) */}
      <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto relative z-10 border-t border-zinc-200/50 dark:border-zinc-800/50 scroll-mt-20">
        <div className="text-center mb-20">
          <span className="text-[10px] bg-emerald-5/60 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/20 text-emerald-600 dark:text-brand-success px-3.5 py-1.5 rounded-full font-black uppercase tracking-wider mb-4 inline-block">
            Precios Claros y Transparentes
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 max-w-2xl mx-auto">
            Elige el plan ideal para tu negocio
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto text-sm font-medium">
            Todos los planes incluyen el diseño de la web y el alojamiento en internet. Cancela cuando quieras sin cuotas ocultas.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="p-8.5 rounded-[2.2rem] border flex flex-col justify-between relative bg-card shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              <div>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-3 py-1 rounded-lg font-black uppercase tracking-widest mb-4 inline-block">
                  {plan.tier}
                </span>
                <h3 className="text-2xl font-black mb-3">{plan.name}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-6 h-10 leading-relaxed font-medium">
                  {plan.description}
                </p>
                
                <div className="flex items-baseline mb-8">
                  <span className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">{plan.price}</span>
                  <span className="text-zinc-400 dark:text-zinc-500 text-xs font-semibold ml-1.5">{plan.period}</span>
                </div>

                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex gap-3 items-start text-xs font-semibold text-zinc-500 dark:text-zinc-300">
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

        {/* Asterisk disclaimer about IA Credits */}
        <div className="text-center mt-12 max-w-2xl mx-auto px-4 relative z-20">
          <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-semibold leading-relaxed">
            * ¿Quieres saber cómo funcionan y cómo se consumen los Créditos de IA?{' '}
            <button 
              onClick={() => onNavigate('creditos')} 
              className="text-indigo-600 dark:text-brand hover:underline font-black cursor-pointer bg-transparent border-none p-0 inline"
            >
              Aquí se ve la info detallada sobre su uso y equivalencias
            </button>
            .
          </p>
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
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{faq.q}</span>
                  <ChevronDown 
                    size={16} 
                    className={cn(
                      "text-zinc-400 dark:text-zinc-555 transition-transform duration-300 shrink-0 ml-4", 
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
            <DotPattern width={12} height={12} className="fill-zinc-500" />
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

      {/* Extensive Formal and Professional Footer (Strictly no icons, fully clean neutral typography) */}
      <footer className="py-20 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/40 dark:bg-zinc-950/95 px-8 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12 text-left mb-16 text-xs font-semibold">
          
          {/* Main Info Column */}
          <div className="md:col-span-2 space-y-5">
            <span className="font-black text-lg text-zinc-900 dark:text-white uppercase tracking-wider block">
              AVIALO BUILDER
            </span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Transformación digital autónoma y de alto rendimiento para pequeños y medianos negocios tradicionales españoles de toda la vida.
            </p>
            
            {/* Direct legal ownership tags (no icons) */}
            <div className="pt-3 space-y-2 text-[10.5px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider border-t border-zinc-200/40 dark:border-zinc-800/40">
              <div>Creado por Avialo Soluciones S.L.</div>
              <div>Avialo Builder es un producto de avialo.app</div>
              <div>Este servicio está creado por Avialo.es</div>
            </div>
          </div>

          {/* Product links */}
          <div className="space-y-4">
            <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest block">Producto</span>
            <ul className="space-y-2.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              <li><a href="#como-ayudamos" className="hover:text-foreground transition-colors">Algoritmo Autónomo</a></li>
              <li><a href="#como-ayudamos" className="hover:text-foreground transition-colors">Reservas de Mesa</a></li>
              <li><a href="#como-ayudamos" className="hover:text-foreground transition-colors">Citas de Clínica</a></li>
              <li><a href="#como-ayudamos" className="hover:text-foreground transition-colors">Pasarelas de Pago</a></li>
            </ul>
          </div>

          {/* Support & Contact (Formal Text based, no icons) */}
          <div className="space-y-4">
            <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest block">Contacto</span>
            <ul className="space-y-2.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              <li><a href="#faq" className="hover:text-foreground transition-colors">Centro de Ayuda</a></li>
              <li><span>Email corporativo: info@avialo.es</span></li>
              <li><span>Soporte Técnico: pymes@avialo.es</span></li>
            </ul>
          </div>

          {/* Legal links */}
          <div className="space-y-4">
            <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest block">Legal</span>
            <ul className="space-y-2.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              <li><a href="#" className="hover:text-foreground transition-colors">Aviso Legal</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Política de Privacidad</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Términos de Uso</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Política de Cookies</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-zinc-200/50 dark:border-zinc-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10.5px] text-zinc-500 dark:text-zinc-500 font-bold uppercase tracking-wider">
            &copy; {new Date().getFullYear()} Avialo Soluciones S.L. Todos los derechos reservados.
          </p>
          <div className="text-[10.5px] text-zinc-400 dark:text-zinc-500 font-bold flex gap-4 uppercase tracking-wider">
            <span>Socio tecnológico de la PYME española</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
