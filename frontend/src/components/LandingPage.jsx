import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Sparkles, Code, Globe, MessageSquare, Smartphone, Zap, Shield } from 'lucide-react';
import Logo from './ui/Logo';
import { DotPattern } from './ui/dot-pattern';
import { AnimatedShinyText } from './ui/animated-shiny-text';
import { cn } from '@/lib/utils';

export default function LandingPage({ onNavigate }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
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

  return (
    <div className="bg-background text-foreground overflow-x-hidden min-h-screen relative select-none">
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(800px_circle_at_center,white,transparent)]"
        )}
      />
      {/* Background Interactive Blobs */}
      <div className="absolute top-0 left-1/4 w-[40rem] h-[40rem] bg-indigo-500/5 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none animate-pulse duration-[6s]" />
      <div className="absolute top-1/3 right-1/4 w-[35rem] h-[35rem] bg-purple-500/5 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none animate-pulse duration-[8s]" />

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 flex flex-col items-center justify-center text-center px-4 max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 text-indigo-650 dark:text-indigo-400 text-[10px] font-bold mb-6 shadow-sm uppercase tracking-wider"
          >
            <Sparkles className="w-3.5 h-3.5 animate-spin duration-[3s]" />
            <span>Desarrollo Web Full-Stack Automatizado</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 bg-gradient-to-b from-zinc-900 via-indigo-950 to-zinc-900 dark:from-zinc-50 dark:via-indigo-200 dark:to-zinc-50 bg-clip-text text-transparent leading-[1.1] max-w-4xl"
          >
            Tu web full-stack, creada por IA y editable en vivo.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-sm md:text-lg text-zinc-500 dark:text-zinc-400 mb-10 max-w-2xl font-medium leading-relaxed"
          >
            Describe tu negocio en español. Nuestra IA diseña, genera código limpio, levanta bases de datos PostgreSQL y despliega en minutos. Luego, realiza cualquier cambio a través de chat con previsualización en vivo.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
            <button
              onClick={() => onNavigate('register')}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 font-bold shadow-lg hover:shadow-xl transition-all duration-200 text-xs group active:scale-[0.97]"
            >
              <span>Empezar con mi cuenta SaaS</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition-all duration-200 text-xs active:scale-[0.97]"
            >
              Ver Planes desde 29€
            </a>
          </motion.div>
        </motion.div>

        {/* Live IDE Simulator Interactive Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative max-w-5xl mx-auto mt-16 w-full rounded-3xl border border-border overflow-hidden shadow-2xl bg-card/60 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400/80 block cursor-pointer hover:bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/80 block cursor-pointer hover:bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-400/80 block cursor-pointer hover:bg-green-500" />
            </div>
            <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold bg-zinc-200/50 dark:bg-zinc-900/50 px-10 py-1 rounded-md">
              avialobuilder.com/editor-ide
            </div>
            <div className="w-12" />
          </div>

          <div className="aspect-[16/9] bg-zinc-50 dark:bg-zinc-950 flex relative overflow-hidden">
            {/* Left chat panel */}
            <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 p-5 flex flex-col justify-between bg-white dark:bg-zinc-900 text-left">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Logo className="w-5 h-5 text-indigo-500" />
                  <span className="text-xs font-black uppercase tracking-wider">Avialo Engine</span>
                </div>
                <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/20 rounded-xl text-xs leading-relaxed text-indigo-850 dark:text-indigo-300">
                  ¡Entendido! He re-compilado tu web corporativa. Añadí el sistema de reservas PostgreSQL en la base de datos de tu esquema aislado y la cita se confirma al instante.
                </div>
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  "Perfecto. Ahora pon un banner con descuento del 20% en la portada."
                </div>
              </div>
              <div>
                <input
                  type="text"
                  disabled
                  placeholder="Pídele cambios a la IA a través del chat..."
                  className="w-full bg-zinc-150 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Right preview panel */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-950">
              <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-850 flex flex-col p-5 text-left">
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850 pb-3.5 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 block animate-pulse" />
                    <span className="text-xs font-bold">clinica-dental.avialo.app</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-2 rounded bg-zinc-100 dark:bg-zinc-800" />
                    <span className="w-7 h-2 rounded bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </div>
                <div className="space-y-3 flex-1 flex flex-col justify-start">
                  <div className="h-6 w-3/4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/20 rounded-lg flex items-center px-3">
                    <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 uppercase">⭐ ¡Descuento 20% en tu primera reserva!</span>
                  </div>
                  <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-850 rounded" />
                  <div className="h-3 w-5/6 bg-zinc-150 dark:bg-zinc-850 rounded" />
                  
                  <div className="border border-dashed border-indigo-200 dark:border-indigo-900/30 rounded-xl p-4 mt-4 flex items-center justify-center flex-1 bg-indigo-50/10 dark:bg-indigo-950/5">
                    <span className="text-[10px] text-indigo-550 dark:text-indigo-400 font-bold uppercase tracking-wider">
                      Módulo de Citas y Calendario PostgreSQL Conectado
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Trust & Limits Info banner */}
      <section className="py-8 bg-zinc-100 dark:bg-zinc-900 border-t border-b border-zinc-200 dark:border-zinc-800 text-center px-4">
        <p className="text-xs text-zinc-500 font-bold">
          ⚠️ Nota importante: Cada cuenta/plan incluye exactamente <span className="text-indigo-600 dark:text-indigo-400">1 Sitio Web activo</span> completo con bases de datos.
        </p>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Construcción sin límites, en una sola cuenta
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto text-xs md:text-sm">
            Nuestros planes están estructurados para brindarte el máximo poder de iteración y personalización.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <motion.div
            whileHover={{ y: -5 }}
            className="p-6 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold mb-2">Créditos de IA Flexibles</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
              El plan Pro e Ecommerce cuentan con créditos de cambios por IA ilimitados para iterar en tu web cuantas veces quieras hasta lograr la perfección.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="p-6 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4">
              <Code className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold mb-2">Soporte Ecommerce Exclusivo</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
              El plan Ecommerce está dedicado estrictamente a e-commerce headless (Next.js + Medusa.js v2), garantizando pasarelas y catálogos estables e hiperrápidos.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="p-6 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold mb-2">Aislamiento PostgreSQL</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
              Cada web generada tiene su propio esquema PostgreSQL, aislando por completo bases de datos de reservas, leads y transacciones comerciales.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            Elige el motor de tu sitio web
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto text-xs md:text-sm">
            Todos los planes incluyen 1 sitio web completo. Cancela en cualquier momento desde tu panel.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              whileHover={{ scale: 1.01 }}
              className={`p-8 rounded-3xl border flex flex-col justify-between relative bg-card shadow-sm transition-all duration-300 overflow-hidden ${
                plan.popular
                  ? 'border-[var(--brand)] shadow-lg ring-1 ring-[var(--brand)]/20'
                  : 'border-border hover:border-foreground/20'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--brand)] text-white text-[10px] font-black tracking-wider shadow-md z-10">
                  MÁS POPULAR
                </span>
              )}

              <div>
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-6 h-10 leading-snug">
                  {plan.description}
                </p>
                <div className="flex items-baseline mb-8">
                  <span className="text-4xl md:text-5xl font-black tracking-tight">{plan.price}</span>
                  <span className="text-zinc-500 text-xs font-semibold ml-1">{plan.period}</span>
                </div>

                <ul className="space-y-3.5 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex gap-2.5 items-start text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      <Check className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => onNavigate('register')}
                className={`w-full py-4 px-4 rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.97] ${
                  plan.popular
                    ? 'bg-indigo-600 dark:bg-indigo-400 text-white dark:text-zinc-900 hover:bg-indigo-700 dark:hover:bg-indigo-300'
                    : 'bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-200/50 dark:border-zinc-850/50 bg-zinc-100/30 dark:bg-zinc-950 px-4 text-center">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Logo className="w-6 h-6 text-zinc-800 dark:text-zinc-200" />
            <span className="font-bold tracking-tight text-sm">Avialo Builder</span>
          </div>
          <p className="text-xs text-zinc-550">
            &copy; 2026 Avialo S.L. 1 Sitio web por cuenta. Estricta estética premium interactiva.
          </p>
        </div>
      </footer>
    </div>
  );
}
