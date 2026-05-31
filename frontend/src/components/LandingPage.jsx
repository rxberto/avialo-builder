import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, Check, Sparkles, Globe, Calendar, Database, Terminal,
  ChevronDown, Star, Utensils, Stethoscope, Store, Shield, Cpu,
  Zap, CreditCard, Folder, File, Minus, Plus, Lock, MousePointerClick
} from 'lucide-react';
import { ShimmerButton } from './ui/shimmer-button';
import { BorderBeam } from './ui/border-beam';
import { DotPattern } from './ui/dot-pattern';
import { NumberTicker } from './ui/number-ticker';
import { cn } from '@/lib/utils';

/* ============================================================
   Primitivas de movimiento reutilizables
   (un único lenguaje de animación en toda la página)
   ============================================================ */

// Curva suave compartida con el CSS (--ease-out-expo)
const EASE = [0.16, 1, 0.3, 1];

// Revela su contenido al entrar en viewport, con respeto a reduced-motion
function Reveal({ children, className, delay = 0, y = 18, once = true }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? {} : { opacity: 1, y: 0 }}
      viewport={{ once, margin: '-80px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

// Etiqueta superior discreta (eyebrow) — uso medido del uppercase
function Eyebrow({ children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand',
        className
      )}
    >
      <span className="h-1 w-1 rounded-full bg-brand/50" />
      {children}
    </span>
  );
}

// Overlay de grano SVG — textura de papel sutil en toda la página
function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[500] select-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        opacity: 0.03,
      }}
    />
  );
}

export default function LandingPage({ onNavigate }) {
  // Selector del escaparate de PYMEs tradicionales
  const [activePyme, setActivePyme] = useState('hosteleria');
  const [isAnimating, setIsAnimating] = useState(false);

  // Estado del demo de reservas (hostelería)
  const [tableCount, setTableCount] = useState(2);
  const [tableBooked, setTableBooked] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);

  // Estado del demo de citas (clínica)
  const [selectedService, setSelectedService] = useState(null);
  const [clinicBooked, setClinicBooked] = useState(false);

  // Estado del demo de compra (comercio)
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Acordeón de preguntas frecuentes
  const [openFaq, setOpenFaq] = useState(0);

  // Configuración de los negocios tradicionales (PYMEs)
  const pymes = {
    hosteleria: {
      id: 'hosteleria',
      icon: <Utensils className="h-4 w-4" />,
      label: 'Mesón Familiar',
      domain: 'meson-asturiano.com',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      prompt: 'Tengo un mesón tradicional y quiero recibir reservas de mesa los domingos por internet sin que me suene el móvil.',
      tag: 'Reservas automáticas',
      title: 'Recetas tradicionales de la casa',
      desc: 'Cocina gallega y carnes a la brasa. El sistema calcula las mesas libres en tiempo real y te avisa de cada reserva.',
      before: 'Teléfono colapsado los sábados, llamadas perdidas y reservas apuntadas a mano.',
      after: 'Tus mesas se llenan solas. Clientes reservando a cualquier hora, sin interrupciones.'
    },
    salud: {
      id: 'salud',
      icon: <Stethoscope className="h-4 w-4" />,
      label: 'Clínica / Fisio',
      domain: 'dentalia-consulta.es',
      image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80',
      prompt: 'Tengo una clínica de barrio y necesito que los pacientes reserven cita previa online de forma rápida.',
      tag: 'Cita previa online',
      title: 'Cuidado de la salud dental',
      desc: 'Los pacientes eligen tratamiento, ven tus horas libres y reservan al instante. Tu agenda siempre ordenada.',
      before: 'Agenda en papel, interrumpir tratamientos para coger el teléfono y despistes de citas.',
      after: 'Tu agenda visible y organizada. Menos llamadas durante las consultas.'
    },
    comercio: {
      id: 'comercio',
      icon: <Store className="h-4 w-4" />,
      label: 'Comercio local',
      domain: 'zapatos-artesanales.es',
      image: 'https://images.unsplash.com/photo-1449247709967-d4461a6a6103?auto=format&fit=crop&w=800&q=80',
      prompt: 'Tengo una tienda de zapatos y quiero venderlos online a toda España y cobrar con tarjeta.',
      tag: 'Cobros con tarjeta',
      title: 'Zapatos hechos a mano',
      desc: 'Un catálogo rápido donde tus clientes añaden al carrito y pagan con tarjeta de forma segura vía Stripe.',
      before: 'Solo vendes a los vecinos del barrio, con ingresos limitados.',
      after: 'Tu tienda abierta 24/7 para toda España, con cobros directos a tu banco.'
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
    }, 240);
  };

  const sectors = [
    'Mesones', 'Clínicas dentales', 'Fisioterapia', 'Peluquerías', 'Zapaterías',
    'Cafeterías', 'Talleres', 'Estética', 'Floristerías', 'Asesorías', 'Panaderías', 'Veterinarias'
  ];

  const metrics = [
    { value: 2, suffix: ' min', label: 'De idea a web publicada' },
    { value: 100, suffix: '%', label: 'Datos aislados por negocio' },
    { value: 0, prefix: '', suffix: '€', label: 'Comisiones por reserva' },
    { value: 24, suffix: '/7', label: 'Tu negocio siempre abierto' }
  ];

  const reviews = [
    {
      text: 'Teníamos pánico a la informática. Avialo nos hizo la web de reservas en un minuto y las mesas de los domingos se llenan solas.',
      author: 'Carlos',
      business: 'Mesón El Asturiano',
      sector: 'Hostelería',
      stars: 5
    },
    {
      text: 'Mis pacientes reservan cita desde el móvil. El teléfono de la consulta ha dejado de sonar a todas horas y puedo atender en paz.',
      author: 'Dra. Marta',
      business: 'Dentalia Clínica',
      sector: 'Salud',
      stars: 5
    },
    {
      text: 'Vendíamos calzado solo en el barrio. Con el catálogo que nos generó, ahora enviamos zapatos a toda España. Sencillo y rentable.',
      author: 'Julio Soria',
      business: 'Soria Cuero Artesano',
      sector: 'Comercio',
      stars: 5
    }
  ];

  const plans = [
    {
      name: 'Basic',
      price: '29€',
      period: '/mes',
      description: 'Web corporativa sencilla para dar a conocer tu negocio en internet.',
      features: [
        'Web profesional completa',
        '800 créditos de IA mensuales',
        'Dominio propio incluido (.es, .com)',
        'Formulario de contacto',
        'Soporte por email en español'
      ],
      cta: 'Empezar con Basic',
      tier: 'basic',
      featured: false
    },
    {
      name: 'Pro',
      price: '49€',
      period: '/mes',
      description: 'Web con reservas online automatizadas para clínicas, mesones y servicios.',
      features: [
        'Web con reservas en vivo',
        '1.500 créditos de IA mensuales',
        'Calendario de cita previa integrado',
        'Panel de control de reservas',
        'Soporte prioritario por teléfono'
      ],
      cta: 'Empezar con Pro',
      tier: 'pro',
      featured: true
    },
    {
      name: 'Ecommerce',
      price: '75€',
      period: '/mes',
      description: 'Tienda online completa con pasarela de cobros para vender en toda España.',
      features: [
        'Tienda online completa',
        '3.000 créditos de IA mensuales',
        'Catálogo de productos interactivo',
        'Cobros con tarjeta vía Stripe',
        'Soporte VIP inmediato'
      ],
      cta: 'Empezar con Ecommerce',
      tier: 'ecommerce',
      featured: false
    }
  ];

  const faqs = [
    {
      q: '¿Cómo funciona exactamente?',
      a: 'Solo escribes cómo es tu negocio en español y qué necesitas (por ejemplo: "tengo un mesón y quiero que reserven mesa online"). Nuestro algoritmo crea tu web adaptada y la publica en internet en menos de 2 minutos.'
    },
    {
      q: '¿Qué necesito para empezar?',
      a: 'Nada. No necesitas saber de ordenadores, programación ni contratar servidores. Nos encargamos de todo: dominio, alojamiento, web y sistema de reservas.'
    },
    {
      q: '¿Puedo cambiar las fotos o los textos después?',
      a: 'Sí, facilísimo. Hablas por el chat con la IA ("cambia la foto de portada por un plato de pulpo" o "cambia el horario a las 14:00") y se actualiza al instante.'
    },
    {
      q: '¿Hay permanencia?',
      a: 'Ninguna. Puedes darte de baja, subir o bajar de plan en cualquier momento con un clic desde tu panel, sin preguntas ni penalizaciones.'
    }
  ];

  const active = pymes[activePyme];

  return (
    <div className="relative w-full overflow-x-hidden bg-background text-foreground antialiased selection:bg-brand/20">
      <GrainOverlay />

      {/* ============================================================
          HÉROE — texto izquierda, capturas en cascada derecha
          ============================================================ */}
      <section className="relative isolate overflow-hidden px-6 pb-16 pt-24 sm:pt-28 lg:pt-32">

        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">

            {/* Columna izquierda — copy */}
            <div>
              <Reveal y={8}>
                <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
                  Algoritmo Avialo · genera tu web en español
                </span>
              </Reveal>

              <Reveal delay={0.06}>
                <h1 className="mt-5 font-display text-[2.8rem] font-semibold leading-[1.06] tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-[4rem]">
                  Tu negocio en internet,{' '}
                  <em className="not-italic text-brand">listo en 2 minutos.</em>
                </h1>
              </Reveal>

              <Reveal delay={0.12}>
                <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-[1.05rem]">
                  Describe tu PYME en español. Nuestro algoritmo genera tu web
                  profesional con reservas o cobros incluidos.
                  Sin plantillas, sin código.
                </p>
              </Reveal>

              <Reveal delay={0.18}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    onClick={() => onNavigate('register')}
                    className="group inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-midnight shadow-lg shadow-brand/25 transition-all duration-200 hover:bg-brand/90 hover:shadow-xl hover:shadow-brand/30 active:scale-[0.98]"
                  >
                    Probar gratis
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <a
                    href="#pricing"
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-accent/30 bg-brand-accent/10 px-6 py-3.5 text-sm font-semibold text-brand-accent transition-all duration-200 hover:bg-brand-accent/15 active:scale-[0.98]"
                  >
                    Ver precios
                  </a>
                </div>
              </Reveal>

              <Reveal delay={0.24}>
                <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
                  {['Web autogestionada', 'Sin comisiones por reservas', 'Dominio propio incluido'].map((t) => (
                    <li key={t} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Check className="h-3.5 w-3.5 shrink-0 text-brand-success" /> {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            {/* Columna derecha — capturas de pantalla en cascada */}
            <div className="relative mx-auto h-[280px] w-full max-w-[440px] sm:h-[340px] lg:mx-0 lg:h-[420px] lg:max-w-none">

              {/* Captura 3 — fondo, inclinada +3° */}
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}
                className="absolute right-0 top-0 w-[76%] rotate-[3deg] overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl shadow-black/40"
              >
                <div className="aspect-video w-full bg-[#141E33]">
                  <img src="/placeholder-3.webp" alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
              </motion.div>

              {/* Captura 2 — plano medio, inclinada -2° */}
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
                className="absolute left-0 top-[20%] w-[70%] -rotate-[2deg] overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl shadow-black/40"
              >
                <div className="aspect-video w-full bg-[#141E33]">
                  <img src="/placeholder-2.webp" alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
              </motion.div>

              {/* Captura 1 — primer plano, +1° */}
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
                className="absolute bottom-0 right-[6%] w-[80%] rotate-[1deg] overflow-hidden rounded-2xl border border-brand/15 bg-card shadow-2xl shadow-black/50 ring-1 ring-brand/10"
              >
                <div className="aspect-video w-full bg-[#141E33]">
                  <img src="/placeholder-1.webp" alt="Constructor Avialo en acción" className="h-full w-full object-cover" loading="lazy" />
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          TIRA DE SECTORES — marquee infinito
          ============================================================ */}
      <section className="border-y border-border/60 bg-muted/20 py-8">
        <p className="mb-5 text-center text-xs font-medium uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
          Pensado para los negocios de toda la vida
        </p>
        <div className="group/marquee mask-fade-x relative flex overflow-hidden">
          <div className="animate-marquee flex shrink-0 items-center gap-4 pr-4" style={{ '--marquee-duration': '42s' }}>
            {[...sectors, ...sectors].map((s, i) => (
              <span
                key={i}
                className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border/60 bg-card/60 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand/50" /> {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          ESCAPARATE INTERACTIVO — algoritmo en acción
          ============================================================ */}
      <section id="algoritmo" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <Eyebrow className="mb-4 justify-center">Algoritmo en acción</Eyebrow>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Elige un negocio. Mira cómo se digitaliza.
          </h2>
          <p className="text-pretty mx-auto mt-4 max-w-lg text-base text-zinc-500 dark:text-zinc-400">
            Cambia de pestaña para ver cómo el algoritmo entiende una idea simple en español y
            la convierte en una web real con reservas o cobros.
          </p>
        </Reveal>

        {/* Control segmentado con cápsula animada */}
        <div className="mx-auto mb-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-border/70 bg-muted/30 p-1.5 sm:flex-row">
          {Object.keys(pymes).map((key) => (
            <button
              key={key}
              onClick={() => handlePymeChange(key)}
              className="relative flex-1 rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-colors"
            >
              {activePyme === key && (
                <motion.span
                  layoutId="pymeCapsule"
                  className="absolute inset-0 rounded-xl border border-border/60 bg-card shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span
                className={cn(
                  'relative z-10 flex items-center justify-center gap-2 transition-colors',
                  activePyme === key ? 'text-foreground' : 'text-zinc-500 dark:text-zinc-400'
                )}
              >
                {pymes[key].icon}
                {pymes[key].label}
              </span>
            </button>
          ))}
        </div>

        {/* Panel del escaparate */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
          <BorderBeam size={420} duration={16} borderWidth={1.4} colorFrom="var(--brand)" colorTo="var(--brand-accent)" />
          <div className="grid gap-10 p-6 lg:grid-cols-2 lg:p-10">

            {/* Columna explicativa */}
            <div className="flex flex-col justify-between">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePyme}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="space-y-6"
                >
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand dark:text-brand-accent">
                    <Zap className="h-3.5 w-3.5" /> {active.tag}
                  </span>
                  <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                    Así digitalizamos tu negocio de siempre
                  </h3>

                  {/* Prompt del usuario */}
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-5">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Tu idea, en español
                    </span>
                    <p className="text-sm italic leading-relaxed text-zinc-600 dark:text-zinc-300">
                      “{active.prompt}”
                      <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-caret bg-brand align-middle" />
                    </p>
                  </div>

                  {/* Antes / Después */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-xl border border-border/60 p-4">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 dark:bg-zinc-800">
                        <Minus className="h-3 w-3" />
                      </span>
                      <div>
                        <span className="block text-xs font-semibold text-zinc-500">Antes</span>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{active.before}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-brand-success/20 bg-brand-success/5 p-4">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-success/15 text-brand-success">
                        <Check className="h-3 w-3" />
                      </span>
                      <div>
                        <span className="block text-xs font-semibold text-brand-success">Con Avialo</span>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{active.after}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <button
                onClick={() => onNavigate('register')}
                className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brand transition-all hover:gap-3 dark:text-brand-accent"
              >
                Probar esta solución gratis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Columna preview: mini-navegador del negocio activo */}
            <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
              <div className="flex items-center gap-2 border-b border-border/70 bg-card px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-success" />
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{active.domain}</span>
                <span className="ml-auto rounded bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand dark:text-brand-accent">
                  Tu nueva web
                </span>
              </div>

              <AnimatePresence mode="wait">
                {isAnimating ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-80 flex-col items-center justify-center gap-3"
                  >
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                    <span className="text-xs font-medium text-zinc-400">Generando web…</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key={activePyme}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <div className="relative h-36 w-full overflow-hidden">
                      <img src={active.image} alt={active.label} className="h-full w-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-3 left-4 text-sm font-semibold text-white">{active.title}</span>
                    </div>

                    <div className="space-y-4 p-5">
                      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{active.desc}</p>

                      {/* Widget contextual por sector */}
                      {activePyme === 'hosteleria' && (
                        <SectorWidget icon={<Calendar className="h-3.5 w-3.5" />} label="Reservar mesa">
                          {!tableBooked ? (
                            <div className="space-y-2.5">
                              <div className="grid grid-cols-3 gap-1.5">
                                {['13:30', '14:30', '15:30'].map((t) => (
                                  <PillButton key={t} active={selectedTime === t} onClick={() => setSelectedTime(t)}>{t}</PillButton>
                                ))}
                              </div>
                              <PrimaryWidgetButton disabled={!selectedTime} onClick={() => setTableBooked(true)}>
                                Confirmar mesa
                              </PrimaryWidgetButton>
                            </div>
                          ) : (
                            <WidgetSuccess title="Mesa reservada" onReset={() => { setTableBooked(false); setSelectedTime(null); }}>
                              Tu reserva para {tableCount} se ha confirmado a las {selectedTime}.
                            </WidgetSuccess>
                          )}
                        </SectorWidget>
                      )}

                      {activePyme === 'salud' && (
                        <SectorWidget icon={<Stethoscope className="h-3.5 w-3.5" />} label="Pedir cita">
                          {!clinicBooked ? (
                            <div className="space-y-2">
                              {['Primera revisión', 'Limpieza bucal completa'].map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setSelectedService(s)}
                                  className={cn(
                                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition-all active:scale-[0.98]',
                                    selectedService === s
                                      ? 'border-transparent bg-brand text-white shadow-md shadow-brand/30'
                                      : 'border-border bg-card text-zinc-600 hover:border-brand/40 dark:text-zinc-300'
                                  )}
                                >
                                  {s} {selectedService === s && <Check className="h-3.5 w-3.5" />}
                                </button>
                              ))}
                              <PrimaryWidgetButton disabled={!selectedService} onClick={() => setClinicBooked(true)}>
                                Confirmar cita
                              </PrimaryWidgetButton>
                            </div>
                          ) : (
                            <WidgetSuccess title="Cita confirmada" onReset={() => { setClinicBooked(false); setSelectedService(null); }}>
                              Tu cita para <strong>{selectedService}</strong> se ha guardado.
                            </WidgetSuccess>
                          )}
                        </SectorWidget>
                      )}

                      {activePyme === 'comercio' && (
                        <SectorWidget icon={<CreditCard className="h-3.5 w-3.5" />} label="Zapato clásico · 89€">
                          {!purchaseSuccess ? (
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-2 text-[11px] font-medium text-zinc-400">
                                <Lock className="h-3 w-3 text-brand-success" /> Pago seguro con Stripe
                              </div>
                              <PrimaryWidgetButton onClick={() => setPurchaseSuccess(true)}>
                                Comprar ahora
                              </PrimaryWidgetButton>
                            </div>
                          ) : (
                            <WidgetSuccess title="Pago recibido" onReset={() => setPurchaseSuccess(false)}>
                              Tu pedido se ha procesado. Te avisaremos del envío.
                            </WidgetSuccess>
                          )}
                        </SectorWidget>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CÓMO FUNCIONA — 3 pasos
          ============================================================ */}
      <section id="como-ayudamos" className="mx-auto max-w-6xl scroll-mt-24 border-t border-border/50 px-6 py-24">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <Eyebrow className="mb-4 justify-center">Cómo funciona</Eyebrow>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            De la idea a internet, en tres pasos
          </h2>
          <p className="text-pretty mx-auto mt-4 max-w-lg text-base text-zinc-500 dark:text-zinc-400">
            Sin tecnicismos. Tú describes; el algoritmo construye, despliega y te entrega la web.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            { n: '01', icon: <MousePointerClick className="h-5 w-5" />, t: 'Describes tu idea', d: 'Escribe cómo es tu negocio con tus palabras: "tengo un mesón y quiero reservas los domingos". Sin saber programar.' },
            { n: '02', icon: <Cpu className="h-5 w-5" />, t: 'El algoritmo actúa', d: 'Procesa tu petición, genera código limpio en React, crea una base de datos aislada y despliega tu web.' },
            { n: '03', icon: <Globe className="h-5 w-5" />, t: 'Listo en 2 minutos', d: 'Tu web se publica con dominio propio. ¿Quieres un cambio? Se lo pides a la IA por el chat de tu panel.' }
          ].map((step, i) => (
            <Reveal key={step.n} delay={i * 0.08}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5">
                <div className="mb-6 flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white dark:text-brand-accent">
                    {step.icon}
                  </span>
                  <span className="text-4xl font-semibold tracking-tight text-zinc-200 dark:text-zinc-800">{step.n}</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">{step.t}</h3>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{step.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================================
          BAJO EL CAPÓ — infraestructura real
          ============================================================ */}
      <section className="relative overflow-hidden border-y border-zinc-800 bg-zinc-950 py-24 text-white">
        <div className="bg-dots-fade absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2">
          <Reveal>
            <Eyebrow className="mb-4 text-brand-accent">Infraestructura real</Eyebrow>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Bajo el capó: código real y limpio
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-400">
              No son plantillas estáticas. El algoritmo genera bases de datos reales y código React.
              Cada negocio vive en su propio aislamiento cifrado.
            </p>
            <div className="mt-8 space-y-5">
              {[
                { t: 'Aislamiento PostgreSQL total', d: 'Tu base de datos es dedicada y única. Tus clientes, 100% aislados y seguros.' },
                { t: 'Cero dependencia', d: 'La web y los datos te pertenecen. Si algún día te vas, te entregamos todo el código.' }
              ].map((f) => (
                <div key={f.t} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-success/15 text-brand-success">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <span className="block text-sm font-semibold">{f.t}</span>
                    <span className="text-sm text-zinc-500">{f.d}</span>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* IDE con schema.prisma */}
          <Reveal delay={0.1}>
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0c10] font-mono text-sm shadow-2xl">
              <BorderBeam size={360} duration={14} borderWidth={1.2} colorFrom="var(--brand)" colorTo="rgba(139,92,246,0.4)" />
              <div className="flex items-center gap-3 border-b border-zinc-800 bg-[#070809] px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-zinc-700" />
                  <span className="h-3 w-3 rounded-full bg-zinc-700" />
                  <span className="h-3 w-3 rounded-full bg-zinc-700" />
                </div>
                <span className="text-xs text-zinc-500">db / schema.prisma</span>
              </div>
              <div className="flex">
                <div className="hidden w-40 shrink-0 space-y-3 border-r border-zinc-800/80 bg-[#070809] p-4 text-xs text-zinc-500 sm:block">
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-600">Explorador</span>
                  <div className="flex items-center gap-2"><Folder className="h-3.5 w-3.5 text-brand-accent" /> src</div>
                  <div className="flex items-center gap-2 pl-4"><File className="h-3 w-3 text-zinc-600" /> index.jsx</div>
                  <div className="flex items-center gap-2 rounded-md bg-zinc-800/60 px-1.5 py-1 pl-3 text-white"><Database className="h-3 w-3 text-amber-400" /> schema.prisma</div>
                  <div className="flex items-center gap-2 pl-4 text-zinc-600"><File className="h-3 w-3" /> config.json</div>
                </div>
                <div className="flex-1 space-y-1.5 overflow-x-auto p-5 text-[13px] leading-relaxed">
                  <div><span className="text-violet-400">model</span> <span className="text-amber-300">PymeBooking</span> <span className="text-zinc-500">{'{'}</span></div>
                  <div className="pl-4"><span className="text-sky-300">id</span>          <span className="text-emerald-300">String</span>   <span className="text-zinc-600">@id @default(uuid())</span></div>
                  <div className="pl-4"><span className="text-sky-300">comensales</span>  <span className="text-emerald-300">Int</span></div>
                  <div className="pl-4"><span className="text-sky-300">date</span>        <span className="text-emerald-300">DateTime</span></div>
                  <div className="pl-4"><span className="text-sky-300">dbIsolation</span> <span className="text-emerald-300">Boolean</span>  <span className="text-zinc-600">@default(true)</span></div>
                  <div className="pl-4"><span className="text-sky-300">sslEnabled</span>  <span className="text-emerald-300">Boolean</span>  <span className="text-zinc-600">@default(true)</span></div>
                  <div><span className="text-zinc-500">{'}'}</span></div>
                  <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand/5 p-4 text-xs text-brand-accent">
                    <Terminal className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <span className="block font-semibold">Avialo · compilado correctamente</span>
                      <span className="text-zinc-500">Schema aislado desplegado en Hetzner en 1.4s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          MÉTRICAS
          ============================================================ */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {metrics.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.08} className="text-center">
              <div className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-white">
                {m.prefix}
                <NumberTicker value={m.value} />
                {m.suffix}
              </div>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{m.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================================
          TESTIMONIOS
          ============================================================ */}
      <section id="testimonios" className="mx-auto max-w-6xl scroll-mt-24 border-t border-border/50 px-6 py-24">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <Eyebrow className="mb-4 justify-center">Opiniones reales</Eyebrow>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Negocios que ya dieron el salto
          </h2>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {reviews.map((rev, i) => (
            <Reveal key={rev.author} delay={i * 0.08}>
              <figure className="flex h-full flex-col justify-between rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5">
                <div>
                  <div className="mb-4 flex gap-0.5">
                    {[...Array(rev.stars)].map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <blockquote className="text-pretty text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                    “{rev.text}”
                  </blockquote>
                </div>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-sm font-semibold text-white">
                    {rev.author[0]}
                  </span>
                  <div>
                    <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{rev.author}</span>
                    <span className="block text-xs text-zinc-400">{rev.business} · {rev.sector}</span>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================================
          PRECIOS
          ============================================================ */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 border-t border-border/50 px-6 py-24">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <Eyebrow className="mb-4 justify-center">Precios transparentes</Eyebrow>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Elige el plan ideal para tu negocio
          </h2>
          <p className="text-pretty mx-auto mt-4 max-w-lg text-base text-zinc-500 dark:text-zinc-400">
            Todos incluyen diseño, alojamiento y dominio. Cancela cuando quieras, sin cuotas ocultas.
          </p>
        </Reveal>

        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.08}>
              <div
                className={cn(
                  'relative flex h-full flex-col overflow-hidden rounded-3xl border p-8 transition-all duration-300',
                  plan.featured
                    ? 'border-brand/40 bg-card shadow-2xl shadow-brand/10 lg:scale-[1.03]'
                    : 'border-border bg-card hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5'
                )}
              >
                {plan.featured && (
                  <>
                    <BorderBeam size={280} duration={12} borderWidth={1.4} colorFrom="var(--brand)" colorTo="var(--brand-accent)" />
                    <span className="absolute right-6 top-6 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand dark:text-brand-accent">
                      Recomendado
                    </span>
                  </>
                )}

                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{plan.name}</h3>
                <p className="mt-2 h-10 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{plan.description}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold tracking-tight text-zinc-900 dark:text-white">{plan.price}</span>
                  <span className="text-sm font-medium text-zinc-400">{plan.period}</span>
                </div>

                <ul className="mt-8 space-y-3.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand dark:text-brand-accent">
                        <Check className="h-3 w-3" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onNavigate('register')}
                  className={cn(
                    'mt-9 w-full rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-[0.98]',
                    plan.featured
                      ? 'bg-brand text-white shadow-lg shadow-brand/25 hover:bg-brand/90'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
                  )}
                >
                  {plan.cta}
                </button>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-zinc-500 dark:text-zinc-400">
          ¿Cómo se consumen los créditos de IA?{' '}
          <button onClick={() => onNavigate('creditos')} className="font-semibold text-brand underline-offset-4 hover:underline dark:text-brand-accent">
            Ver la información detallada
          </button>
          .
        </p>
      </section>

      {/* ============================================================
          FAQ
          ============================================================ */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <Reveal className="mb-14 text-center">
          <Eyebrow className="mb-4 justify-center">Dudas frecuentes</Eyebrow>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Preguntas frecuentes
          </h2>
        </Reveal>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <Reveal key={faq.q} delay={index * 0.05}>
                <div className={cn('overflow-hidden rounded-2xl border transition-colors', isOpen ? 'border-brand/30 bg-card' : 'border-border bg-card/50')}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left outline-none"
                  >
                    <span className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-100">{faq.q}</span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-300', isOpen && 'rotate-180 text-brand')} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          CTA FINAL
          ============================================================ */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-zinc-800 bg-zinc-950 px-8 py-16 text-center sm:px-16">
            <DotPattern width={16} height={16} className="absolute inset-0 fill-zinc-700/40 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000,transparent)]" />
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/20 blur-[90px]" />
            <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-2/20 blur-[90px]" />

            <div className="relative mx-auto max-w-xl space-y-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-900/60 px-4 py-1.5 text-xs font-medium text-zinc-300">
                <Sparkles className="h-3.5 w-3.5 text-brand-accent" /> Despliegues automáticos
              </span>
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                ¿Listo para dar el salto digital?
              </h2>
              <p className="text-pretty mx-auto max-w-md text-base text-zinc-400">
                Únete a cientos de autónomos y pymes que ya consiguen clientes por internet con el algoritmo Avialo. Prueba gratis.
              </p>
              <div className="flex justify-center pt-1">
                <ShimmerButton
                  onClick={() => onNavigate('register')}
                  className="px-8 py-4 text-sm font-semibold shadow-xl transition-transform active:scale-[0.98]"
                  borderRadius="0.85rem"
                  shimmerColor="#ffffff"
                  background="linear-gradient(135deg, var(--brand), var(--brand-2))"
                >
                  <span>Digitalizar mi negocio gratis</span>
                  <ArrowRight className="h-4 w-4" />
                </ShimmerButton>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="border-t border-border/60 bg-muted/20 px-8 py-16">
        <div className="mx-auto mb-14 grid max-w-7xl grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 space-y-4">
            <span className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
              Avialo<span className="text-brand">.</span>
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Transformación digital autónoma para los pequeños y medianos negocios tradicionales españoles.
            </p>
            <div className="flex flex-wrap gap-3 pt-2 text-xs font-medium text-zinc-400">
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-brand-success" /> SSL gratis</span>
              <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-brand" /> PostgreSQL</span>
              <span className="flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-brand-accent" /> Medusa.js v2</span>
            </div>
          </div>

          {[
            { title: 'Producto', links: ['Algoritmo autónomo', 'Reservas de mesa', 'Citas de clínica', 'Pasarelas de pago'], href: '#algoritmo' },
            { title: 'Contacto', links: ['Centro de ayuda', 'info@avialo.es', 'pymes@avialo.es'], href: '#' },
            { title: 'Legal', links: ['Aviso legal', 'Privacidad', 'Términos de uso', 'Cookies'], href: '#' }
          ].map((col) => (
            <div key={col.title} className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">{col.title}</span>
              <ul className="space-y-2.5 text-sm text-zinc-500 dark:text-zinc-400">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href={col.href} className="transition-colors hover:text-foreground">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-border/60 pt-8 text-xs text-zinc-400 sm:flex-row">
          <p>© {new Date().getFullYear()} Avialo Soluciones S.L. Todos los derechos reservados.</p>
          <p>Socio tecnológico de la PYME española</p>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
   Subcomponentes del escaparate (widgets contextuales)
   ============================================================ */

function SectorWidget({ icon, label, children }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className="mb-3 flex items-center gap-2 text-xs font-semibold text-brand dark:text-brand-accent">
        {icon} {label}
      </span>
      {children}
    </div>
  );
}

function PillButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg border py-2 text-xs font-semibold transition-all active:scale-95',
        active
          ? 'border-transparent bg-brand text-white shadow-md shadow-brand/30'
          : 'border-border bg-card text-zinc-600 hover:border-brand/40 dark:text-zinc-300'
      )}
    >
      {children}
    </button>
  );
}

function PrimaryWidgetButton({ disabled, onClick, children }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2.5 text-xs font-semibold text-white transition-all hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      {children}
    </button>
  );
}

function WidgetSuccess({ title, children, onReset }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-2 rounded-lg border border-brand-success/20 bg-brand-success/5 p-4 text-center"
    >
      <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand-success/15 text-brand-success">
        <Check className="h-4 w-4" />
      </span>
      <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">{title}</span>
      <span className="block text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">{children}</span>
      <button onClick={onReset} className="text-[11px] font-semibold text-brand hover:underline dark:text-brand-accent">
        Probar de nuevo
      </button>
    </motion.div>
  );
}
