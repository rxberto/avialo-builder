import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, ArrowLeft, Check, Cpu, RefreshCw, HelpCircle, Activity, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function IAInfoPage({ onNavigate }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 min-h-screen relative overflow-hidden antialiased py-16 px-6 sm:px-12 md:px-24">
      
      {/* Premium background blobs */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 translate-x-1/2 w-[500px] h-[250px] bg-brand/10 dark:bg-brand/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 space-y-12">
        
        {/* Back navigation */}
        <button 
          onClick={() => onNavigate('')}
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer outline-none"
        >
          <ArrowLeft size={14} />
          Volver a la Portada
        </button>

        {/* Header Section */}
        <div className="space-y-4 text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-black uppercase tracking-wider select-none">
            <Sparkles size={11} className="animate-pulse" />
            <span>Infraestructura Avialo IA</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-zinc-900 dark:text-white">
            ¿Qué son los Créditos de IA?
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base max-w-2xl leading-relaxed font-medium">
            Para nosotros en Avialo, los créditos de IA no son solo una métrica de consumo; representan la energía operativa y de cómputo dedicada a expandir, optimizar y perfeccionar tu negocio en internet en tiempo real.
          </p>
        </div>

        {/* Core Philosophy Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Cpu className="w-5 h-5 text-indigo-500" />,
              title: "Cómputo Dedicado",
              desc: "Cada crédito activa LLMs avanzados de razonamiento estructurado para generar y modificar código Next.js y PostgreSQL aislado."
            },
            {
              icon: <Zap className="w-5 h-5 text-amber-500" />,
              title: "Consumo Justo",
              desc: "Solo consumes energía cuando decides transformar tu web. Sin cuotas de mantenimiento de IA ocultas."
            },
            {
              icon: <RefreshCw className="w-5 h-5 text-emerald-500" />,
              title: "Reinicio Mensual",
              desc: "Tus créditos se reabastecen automáticamente al 100% cada mes según tu plan de facturación activo."
            }
          ].map((item, idx) => (
            <Card key={idx} className="glass bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-2xl flex flex-col justify-between text-left shadow-sm">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
                  {item.icon}
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{item.title}</h3>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">{item.desc}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Consumption Table (Strict control) */}
        <Card className="glass bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl overflow-hidden text-left shadow-sm">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Tabla de Equivalencias de Consumo</h2>
              <p className="text-[11px] text-zinc-500 mt-1 leading-normal font-medium">Conoce exactamente cómo se aplican los créditos cuando actúas en tu panel.</p>
            </div>
            
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800 bg-zinc-50/50 dark:bg-black/10 text-xs">
              {[
                { action: "Generación Completa de Sitio Web", cost: "10 Créditos", details: "Aprovisionamiento de base de datos PostgreSQL, contenedor Docker, enrutamiento SSL y scaffolding inicial de Next.js.", highlight: true },
                { action: "Modificación de Sección o Texto con IA", cost: "1 Crédito", details: "Actualizaciones semánticas rápidas, cambios de imágenes, corrección de copies o reajustes estéticos puntuales en vivo.", highlight: false },
                { action: "Soporte de Consultas e IDE Sandbox", cost: "0 Créditos", details: "Las interacciones y chat de ayuda con el Agente de IA dentro de tu editor de código privado son ilimitadas y gratuitas.", highlight: false }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-3 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/10 transition-colors">
                  <div className="space-y-1">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      {item.action}
                      {item.highlight && <Badge className="bg-brand/10 text-brand border border-brand/20 text-[7px] font-bold py-0 px-1">INICIO</Badge>}
                    </span>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal max-w-lg font-medium">{item.details}</p>
                  </div>
                  <Badge className="bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 font-extrabold text-[10px] py-1 px-3 shrink-0">
                    {item.cost}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="p-8 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 text-center space-y-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">¿Listo para expandir tu negocio?</h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto font-medium">
            Todos nuestros planes se aprovisionan de inmediato en la nube con su saldo correspondiente de créditos de IA cargado.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button 
              onClick={() => onNavigate('register')}
              className="bg-brand hover:bg-brand/90 text-white font-bold text-xs rounded-xl py-4 h-9 shadow-md shadow-brand/10 cursor-pointer"
            >
              Crear Cuenta Ahora
            </Button>
            <Button 
              onClick={() => onNavigate('')}
              variant="outline"
              className="text-xs border-zinc-200 dark:border-zinc-800 hover:bg-muted/80 rounded-xl py-4 h-9 font-semibold cursor-pointer"
            >
              Ver Planes de Precios
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
