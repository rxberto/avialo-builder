import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Type, Moon, Sun, Sparkles, CheckCircle2, Wand2, Settings2, Image as ImageIcon, Zap, MousePointerClick } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ── Design constants ────────────────────────────────────────────────────────
const TYPOGRAPHIES = [
  { id: 'inter',    name: 'Inter',      sub: 'Limpia, neutra (Tech)',      family: '"Inter", sans-serif' },
  { id: 'poppins',  name: 'Poppins',    sub: 'Redondeada, cercana',        family: '"Poppins", sans-serif' },
  { id: 'outfit',   name: 'Outfit',     sub: 'Geométrica, startup',        family: '"Outfit", sans-serif' },
  { id: 'lora',     name: 'Lora',       sub: 'Editorial, clásica',         family: '"Lora", serif' },
  { id: 'playfair', name: 'Playfair',   sub: 'Elegante, premium',          family: '"Playfair Display", serif' },
  { id: 'space',    name: 'Space Grotesk', sub: 'Técnica, vanguardista',   family: '"Space Grotesk", sans-serif' },
];

const RADIUS_OPTIONS = [
  { id: 'sharp',   name: 'Recto',   cls: 'rounded-none' },
  { id: 'rounded', name: 'Suave',   cls: 'rounded-md' },
  { id: 'pill',    name: 'Cápsula', cls: 'rounded-full' },
];

const PRESET_PRIMARIES = [
  { hex: '#000000', name: 'Negro' },
  { hex: '#2563eb', name: 'Azul' },
  { hex: '#16a34a', name: 'Verde' },
];

const PRESET_ACCENTS = [
  { hex: '#ffffff', name: 'Blanco' },
  { hex: '#f59e0b', name: 'Ámbar' },
  { hex: '#dc2626', name: 'Rojo' },
];

const MOODS = [
  { id: 'modern',    label: 'Moderno',   emoji: '🚀', desc: 'Limpio y tecnológico' },
  { id: 'luxurious', label: 'Premium',   emoji: '✨', desc: 'Elegante y exclusivo' },
  { id: 'playful',   label: 'Cercano',   emoji: '👋', desc: 'Cálido y amigable' },
  { id: 'minimal',   label: 'Mínimo',    emoji: '🧘', desc: 'Puro y directo' },
  { id: 'bold',      label: 'Atrevido',  emoji: '⚡', desc: 'Impacto visual' },
];

const ANIMATION_LEVELS = [
  { id: 'static',  label: 'Estático', desc: 'Limpio y muy rápido' },
  { id: 'subtle',  label: 'Sutil',    desc: 'Micro-interacciones suaves' },
  { id: 'dynamic', label: 'Dinámico', desc: 'Scroll y hovers animados' },
];

const IMAGE_TREATMENTS = [
  { id: 'realistic',    label: 'Fotografía Real',  desc: 'Imágenes de producto' },
  { id: 'illustrations',label: 'Vectorial',        desc: 'Ilustraciones limpias' },
  { id: '3d',           label: 'Render 3D',        desc: 'High-tech aesthetic' },
];

function ColorSwatch({ hex, name, selected, onClick }) {
  const isWhite = hex.toLowerCase() === '#ffffff';
  return (
    <button
      type="button"
      title={name}
      onClick={onClick}
      className={cn(
        "w-8 h-8 rounded-full border relative flex items-center justify-center transition-transform hover:scale-110",
        isWhite ? "border-zinc-200 dark:border-zinc-800" : "border-transparent"
      )}
      style={{ backgroundColor: hex }}
    >
      {selected && (
        <CheckCircle2 
          size={14} 
          className={cn(
            "drop-shadow-sm",
            isWhite ? "text-zinc-900" : "text-white"
          )} 
        />
      )}
    </button>
  );
}

export default function StepBranding({ datos = {}, updateData }) {
  const primaryRef = useRef(null);
  const accentRef  = useRef(null);

  // ── Safe Fallbacks to Protect Rendering ─────────────────────────────────────
  const dMode    = datos.designMode || 'auto';
  const dPrompt  = datos.aiPrompt || "";
  const dMood    = datos.mood || 'modern';
  const dTheme   = datos.colorTheme || 'light';
  const dPrimary = datos.primaryColor || '#1a56db';
  const dAccent  = datos.accentColor || '#f59e0b';
  const dTypo    = datos.typography || 'inter';
  const dAnim    = datos.animationLevel || 'subtle';
  const dImg     = datos.imageTreatment || 'realistic';
  const dUi      = datos.uiStyle || 'rounded';

  useEffect(() => {
    if (!document.getElementById('branding-fonts')) {
      const link = document.createElement('link');
      link.id = 'branding-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Lora:ital,wght@0,400;0,700&family=Playfair+Display:wght@400;700;900&family=Poppins:wght@400;600;800&family=Outfit:wght@400;600;800&family=Space+Grotesk:wght@400;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const isAuto = dMode === 'auto';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Identidad Visual</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xl">
          Controla la estética de tu plataforma o deja que nuestro motor de diseño genere una propuesta.
        </p>
      </div>

      <div className="w-full flex justify-center md:justify-start">
        <Tabs 
          value={dMode} 
          onValueChange={(val) => updateData('designMode', val)} 
          className="w-full max-w-sm"
        >
          <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
            <TabsTrigger value="auto" className="rounded-lg gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
              <Sparkles size={14} className="fill-current" />
              Copiloto IA
            </TabsTrigger>
            <TabsTrigger value="manual" className="rounded-lg gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
              <Settings2 size={14} />
              Modo Manual
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <AnimatePresence mode="wait">
        {isAuto ? (
          <motion.div
            key="auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 gap-6 max-w-2xl mx-auto w-full"
          >
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/[0.02] to-transparent pointer-events-none" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Wand2 size={15} /> Idea Visual
                </CardTitle>
                <CardDescription className="text-xs">
                  Describe cómo te gustaría que se vea la web. Menciona colores o estilos de referencia.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={dPrompt}
                  onChange={(e) => updateData('aiPrompt', e.target.value)}
                  placeholder="Ej: Quiero un diseño muy minimalista con toques dorados que respire lujo y modernidad..."
                  className="min-h-[120px] resize-none focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50"
                />
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block text-center">
                Personalidad de marca (Vibe)
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {MOODS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => updateData('mood', m.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border transition-all outline-none",
                      dMood === m.id
                        ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600"
                    )}
                  >
                    <span className="text-2xl mb-2">{m.emoji}</span>
                    <span className="text-xs font-bold">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30 shadow-sm">
              <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
                <div className="flex-shrink-0 text-zinc-400">
                  <Sparkles size={18} />
                </div>
                <div className="flex-1 w-full">
                  <Input
                    placeholder="Anotación extra para la IA sobre el diseño... (Opcional)"
                    value={dPrompt}
                    onChange={(e) => updateData('aiPrompt', e.target.value)}
                    className="h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Basic Branding System */}
              <div className="space-y-6">
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                      <MousePointerClick size={14} /> Paleta y Estructura
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    {/* Theme Selector */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-zinc-500">Esquema</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => updateData('colorTheme', 'light')}
                          className={cn(
                            "flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-lg border transition-all",
                            dTheme === 'light' 
                              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm" 
                              : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <Sun size={14} /> Claro
                        </button>
                        <button
                          type="button"
                          onClick={() => updateData('colorTheme', 'dark')}
                          className={cn(
                            "flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-lg border transition-all",
                            dTheme === 'dark' 
                              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm" 
                              : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <Moon size={14} /> Oscuro
                        </button>
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-zinc-500">Primario</Label>
                        <div className="flex items-center gap-2">
                          {PRESET_PRIMARIES.map(c => (
                            <ColorSwatch 
                              key={c.hex} 
                              hex={c.hex} 
                              name={c.name} 
                              selected={dPrimary === c.hex} 
                              onClick={() => updateData('primaryColor', c.hex)} 
                            />
                          ))}
                          <div 
                            className="w-8 h-8 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 relative overflow-hidden hover:border-zinc-900 dark:hover:border-zinc-100 cursor-pointer"
                            onClick={() => primaryRef.current?.click()}
                            style={!PRESET_PRIMARIES.some(p=>p.hex===dPrimary) ? {backgroundColor: dPrimary, borderStyle: 'solid'} : {}}
                          >
                            <input 
                              ref={primaryRef} 
                              type="color" 
                              value={dPrimary} 
                              onChange={e => updateData('primaryColor', e.target.value)} 
                              className="absolute opacity-0 w-full h-full cursor-pointer" 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-zinc-500">Acento</Label>
                        <div className="flex items-center gap-2">
                          {PRESET_ACCENTS.map(c => (
                            <ColorSwatch 
                              key={c.hex} 
                              hex={c.hex} 
                              name={c.name} 
                              selected={dAccent === c.hex} 
                              onClick={() => updateData('accentColor', c.hex)} 
                            />
                          ))}
                          <div 
                            className="w-8 h-8 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 relative overflow-hidden hover:border-zinc-900 dark:hover:border-zinc-100 cursor-pointer"
                            onClick={() => accentRef.current?.click()}
                            style={!PRESET_ACCENTS.some(p=>p.hex===dAccent) ? {backgroundColor: dAccent, borderStyle: 'solid'} : {}}
                          >
                            <input 
                              ref={accentRef} 
                              type="color" 
                              value={dAccent} 
                              onChange={e => updateData('accentColor', e.target.value)} 
                              className="absolute opacity-0 w-full h-full cursor-pointer" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Typographies */}
                    <div className="space-y-3">
                      <Label className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Type size={13} /> Tipografía Principal</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {TYPOGRAPHIES.map(t => {
                          const isSel = dTypo === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => updateData('typography', t.id)}
                              className={cn(
                                "p-3 rounded-xl border text-left transition-all outline-none",
                                isSel 
                                  ? "border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 shadow-sm" 
                                  : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900"
                              )}
                            >
                              <div style={{ fontFamily: t.family }} className={cn("text-sm font-bold", isSel ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-300")}>
                                Aa - {t.name}
                              </div>
                              <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{t.sub}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Fine Tuning & FX */}
              <div className="space-y-6">
                {/* Animation Card */}
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-bold uppercase tracking-wide flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <Zap size={13} /> Animación
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {ANIMATION_LEVELS.map(a => {
                      const isSel = dAnim === a.id;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => updateData('animationLevel', a.id)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                            isSel 
                              ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" 
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700"
                          )}
                        >
                          <div>
                            <div className="text-xs font-bold">{a.label}</div>
                            <div className={cn("text-[10px]", isSel ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500")}>{a.desc}</div>
                          </div>
                          {isSel && <CheckCircle2 size={14} />}
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Media Card */}
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-bold uppercase tracking-wide flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <ImageIcon size={13} /> Estilo Visual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-2">
                    {IMAGE_TREATMENTS.map(img => {
                      const isSel = dImg === img.id;
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => updateData('imageTreatment', img.id)}
                          className={cn(
                            "p-3 rounded-xl border transition-all text-center outline-none",
                            isSel 
                              ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" 
                              : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900"
                          )}
                        >
                          <div className="text-[11px] font-bold">{img.label}</div>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Radius UX Card */}
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                      Curvatura (Borders)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-3">
                    {RADIUS_OPTIONS.map(r => {
                      const isSel = dUi === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => updateData('uiStyle', r.id)}
                          className={cn(
                            "flex-1 p-2 rounded-lg border flex flex-col items-center gap-2 transition-all",
                            isSel
                              ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900 shadow-sm"
                              : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          )}
                        >
                          <div className={cn("w-10 h-4 bg-zinc-900 dark:bg-zinc-100", r.cls)} />
                          <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">{r.name}</span>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
