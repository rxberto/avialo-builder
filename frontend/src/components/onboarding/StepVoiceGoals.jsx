import { motion } from 'framer-motion';
import { Target, Users, Megaphone, HeartHandshake, Briefcase, Zap, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const OBJETIVOS = [
  { id: 'ventas', label: 'Vender online', desc: 'Venta de productos o servicios directamente.', icon: Target },
  { id: 'leads', label: 'Captar clientes', desc: 'Conseguir contactos, emails o presupuestos.', icon: Users },
  { id: 'reservas', label: 'Gestionar reservas', desc: 'Citas previas, mesas o consultorías.', icon: Zap },
  { id: 'portfolio', label: 'Mostrar autoridad', desc: 'Exhibir trabajos, proyectos o currículum.', icon: Star },
];

const TONOS = [
  { id: 'cercano', label: 'Cercano (Tú)', desc: 'Amigable y directo, ideal para retail o B2C.', icon: HeartHandshake },
  { id: 'formal', label: 'Formal (Usted)', desc: 'Profesional y distante, transmite autoridad.', icon: Briefcase },
  { id: 'moderno', label: 'Dinámico & Tech', desc: 'Vanguardista, rompedor, ideal para startups.', icon: Megaphone },
];

const AUDIENCIAS = [
  { id: 'familias', label: 'Familias / Particulares' },
  { id: 'jovenes', label: 'Jóvenes / Gen Z' },
  { id: 'empresas', label: 'Empresas (B2B)' },
  { id: 'premium', label: 'Público Premium / Lujo' },
  { id: 'general', label: 'Público General' },
];

export default function StepVoiceGoals({ datos, updateData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 pb-2"
    >
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Estrategia y Comunicación</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-2xl">
          Nuestra IA necesita entender qué quieres conseguir y a quién te diriges para crear un mensaje persuasivo que conecte.
        </p>
      </div>

      <div className="space-y-6">
        
        {/* Objetivo Principal */}
        <Card className="border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/30 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wide flex items-center gap-2">
              <Target size={15} className="text-zinc-600 dark:text-zinc-400" /> ¿Cuál es el objetivo principal?
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {OBJETIVOS.map(obj => {
              const Icon = obj.icon;
              const isSelected = datos.mainGoal === obj.id;
              return (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => updateData('mainGoal', obj.id)}
                  className={cn(
                    "group flex items-start gap-3.5 p-4 rounded-xl border-2 text-left transition-all duration-200 outline-none",
                    isSelected 
                      ? "border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 shadow-sm shadow-zinc-200/50 dark:shadow-black/20" 
                      : "border-zinc-100 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/40 hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div className={cn(
                    "mt-0.5 p-2 rounded-lg transition-colors",
                    isSelected 
                      ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900" 
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
                  )}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{obj.label}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">{obj.desc}</div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tono de Voz */}
          <Card className="border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/30 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                <Megaphone size={15} className="text-zinc-600 dark:text-zinc-400" /> Tono de comunicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {TONOS.map(tono => {
                const Icon = tono.icon;
                const isSelected = datos.toneOfVoice === tono.id;
                return (
                  <button
                    key={tono.id}
                    type="button"
                    onClick={() => updateData('toneOfVoice', tono.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all outline-none",
                      isSelected 
                        ? "border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 shadow-sm" 
                        : "border-zinc-100 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/40 hover:bg-white hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <Icon size={16} className={cn(isSelected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400")} />
                    <div>
                      <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{tono.label}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{tono.desc}</div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Audiencia */}
          <Card className="border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/30 shadow-sm flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                <Users size={15} className="text-zinc-600 dark:text-zinc-400" /> Público Objetivo
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex flex-wrap gap-2 content-start flex-1">
                {AUDIENCIAS.map(aud => {
                  const isSelected = datos.targetAudience === aud.id;
                  return (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => updateData('targetAudience', aud.id)}
                      className={cn(
                        "px-3.5 py-2 rounded-full text-xs font-medium border transition-all duration-200",
                        isSelected 
                          ? "bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm" 
                          : "bg-white dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      )}
                    >
                      {aud.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
                <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed italic">
                  La IA adaptará el vocabulario basándose en este perfil para maximizar tu tasa de conversión.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </motion.div>
  );
}
