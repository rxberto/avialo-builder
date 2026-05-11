import { motion } from 'framer-motion';
import { Server, Globe, ShieldCheck, Mail, Database, Zap, Layers, Palette, Layout, Rocket, CheckCircle2, Box } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function StepSummary({ datos }) {
  const getArchitectureDetails = (type) => {
    switch (type) {
      case 'ecommerce':
        return {
          title: 'Tienda Headless',
          sub: 'Medusa.js v2 + Next.js 15',
          icon: Database,
          accent: "emerald"
        };
      case 'dinamica':
        return {
          title: 'Web Pro Dinámica',
          sub: 'Vite + React App Engine',
          icon: Layers,
          accent: "blue"
        };
      case 'corporativa':
      default:
        return {
          title: 'Landing Ultra-ligera',
          sub: 'Static Site Architecture',
          icon: Zap,
          accent: "zinc"
        };
    }
  };

  const arch = getArchitectureDetails(datos.webType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      <div className="text-center flex flex-col items-center space-y-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center text-white dark:text-zinc-900 shadow-md shadow-black/10 mb-2">
          <Rocket size={20} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Arquitectura Preparada</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-lg">
          Confirma la hoja de ruta generada para tu proyecto antes de pulsar "Construir Web".
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Left Col: Business Context */}
        <div className="md:col-span-5 flex flex-col gap-5">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950">
            <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xs font-bold tracking-wider uppercase text-zinc-500">Empresa & Estrategia</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{datos.businessName || 'Tu Empresa'}</p>
                <Badge variant="outline" className="mt-1 font-medium text-[10px] dark:bg-zinc-900 dark:text-zinc-400">
                  {datos.sector === 'Otro' ? datos.sectorOtro : datos.sector}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Objetivo Core</p>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 capitalize">{datos.mainGoal}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Tono Copy</p>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 capitalize">{datos.toneOfVoice}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950">
            <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xs font-bold tracking-wider uppercase text-zinc-500 flex items-center gap-2">
                <Palette size={13} /> Estética UI
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Personalidad</span>
                <Badge variant="secondary" className="capitalize text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-900">{datos.mood}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Color Paleta</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-800" style={{backgroundColor: datos.primaryColor}} />
                  <div className="w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-800" style={{backgroundColor: datos.accentColor}} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Interacción</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 capitalize">{datos.animationLevel}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: System Layout */}
        <div className="md:col-span-7 space-y-5">
          
          {/* Tech Stack Banner */}
          <Card className={cn(
            "overflow-hidden relative shadow-md border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          )}>
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none dark:opacity-20">
              <arch.icon size={140} strokeWidth={1.5} />
            </div>
            <CardContent className="p-6 relative z-10 flex flex-col md:flex-row gap-6 items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  <Server size={12} /> Configuración Motor
                </div>
                
                <div>
                  <h3 className="text-xl font-bold tracking-tight mb-1">{arch.title}</h3>
                  <p className="text-sm text-zinc-400 dark:text-zinc-600 font-medium">{arch.sub}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  <Badge variant="outline" className="text-[9px] font-bold border-zinc-700 text-zinc-400 bg-zinc-800 dark:bg-white dark:border-zinc-200 dark:text-zinc-600 gap-1 uppercase py-0.5">
                    <Globe size={10} /> Host
                  </Badge>
                  <Badge variant="outline" className="text-[9px] font-bold border-zinc-700 text-zinc-400 bg-zinc-800 dark:bg-white dark:border-zinc-200 dark:text-zinc-600 gap-1 uppercase py-0.5">
                    <ShieldCheck size={10} /> SSL
                  </Badge>
                </div>
              </div>

              {datos.enabledFeatures?.length > 0 && (
                <div className="bg-zinc-800/50 dark:bg-zinc-200/50 rounded-xl p-3.5 min-w-[140px] border border-white/5 dark:border-black/5 backdrop-blur-sm w-full md:w-auto">
                  <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Box size={11} /> Componentes
                  </div>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto scrollbar-hide">
                    {datos.enabledFeatures.map(f => (
                      <div key={f} className="flex items-center gap-2 text-[10px] font-medium text-zinc-300 dark:text-zinc-700">
                        <CheckCircle2 size={10} className="text-zinc-400 dark:text-zinc-500" />
                        <span className="capitalize truncate">{f.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Final Site Structure */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-4 flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                <Layout size={13} /> Estructura Final Sitemap
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Secciones Menú</Label>
                  <ul className="space-y-2">
                    {datos.pages.map((p, i) => (
                      <li key={i} className="text-xs font-medium text-zinc-800 dark:text-zinc-300 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 border-l border-zinc-100 dark:border-zinc-800 pl-6">
                  <Label className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Diseño Portada</Label>
                  <ul className="space-y-2">
                    {datos.homeSections.map((s, i) => (
                      <li key={i} className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </motion.div>
  );
}
