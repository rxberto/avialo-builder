import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Zap, ShoppingCart, CheckCircle2, Sparkles } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Feature modules por tipo de web ────────────────────────────────────────
const TIPO_FEATURES = {
  corporativa: [
    { id: 'galeria',        label: 'Portafolio / Galería',   desc: 'Muestra tu mejor obra' },
    { id: 'testimonios',    label: 'Reseñas & Social Proof', desc: 'Genera confianza 24/7' },
    { id: 'newsletter',     label: 'Captación de Leads',     desc: 'Crece tu base de datos' },
    { id: 'presupuesto',    label: 'Solicitud de Presupuesto',desc: 'Captura leads directos' },
    { id: 'chat',           label: 'Chat Directo',           desc: 'Conexión instantánea' },
  ],
  dinamica: [
    { id: 'reservas',       label: 'Sistema de Reservas',    desc: 'Agenda inteligente' },
    { id: 'blog',           label: 'Centro de Contenidos',   desc: 'Posicionamiento SEO' },
    { id: 'intranet',       label: 'Área Privada Clientes',  desc: 'Acceso con login' },
    { id: 'notificaciones', label: 'Avisos Automáticos',    desc: 'Emails sin esfuerzo' },
    { id: 'ficha_google',   label: 'Google My Business',     desc: 'Gestión unificada' },
  ],
  ecommerce: [
    { id: 'catalogo',       label: 'Catálogo Dinámico',      desc: 'Autogestionable' },
    { id: 'pasarela',       label: 'Cobros Online',          desc: 'Stripe o PayPal' },
    { id: 'facturacion',    label: 'Facturas Automáticas',   desc: 'Control fiscal' },
    { id: 'envios',         label: 'Gestión de Envíos',      desc: 'Tracking integrado' },
    { id: 'fidelizacion',   label: 'Programa de Puntos',     desc: 'Recurrencia' },
  ],
};

const SECTOR_EXTRA_FEATURES = {
  'Restaurante / Bar': [
    { id: 'qr_menu',        label: '🍽️ Carta Digital QR',     desc: 'Auto-actualizable' },
    { id: 'pedidos_online', label: '📱 Pedidos Take Away',     desc: 'Venta sin comisiones' },
    { id: 'eventos_rest',   label: '🎉 Reserva de Grupos',     desc: 'Control aforo' },
  ],
  'Clínica / Salud': [
    { id: 'cita_previa',    label: '🩺 Cita Online 24/7',      desc: 'Sin llamadas' },
    { id: 'historial',      label: '📋 Historial Digital',     desc: 'Ficha paciente' },
    { id: 'recetas',        label: '💊 Recordatorios Cita',    desc: 'Reduce inasistencias' },
  ],
  'Peluquería / Estética': [
    { id: 'cita_peluq',     label: '✂️ Reservas Online',        desc: 'Fácil e intuitivo' },
    { id: 'antes_despues',  label: '📸 Antes / Después',        desc: 'Tus mejores trabajos' },
    { id: 'bonos',          label: '🎁 Venta de Bonos',         desc: 'Mejora liquidez' },
  ],
  'Academia / Formación': [
    { id: 'matricula',      label: '📝 Inscripción Web',        desc: 'Cobro automático' },
    { id: 'aula_virtual',   label: '🎓 Área E-learning',       desc: 'Plataforma propia' },
    { id: 'certificados',   label: '🏆 Diplomas Auto',          desc: 'Al completar' },
  ],
  'Inmobiliaria': [
    { id: 'buscador',       label: '🏠 Motor de Búsqueda',     desc: 'Filtros avanzados' },
    { id: 'tour_virtual',   label: '🥽 Visita Virtual 360°',    desc: 'Inmersivo' },
    { id: 'valoracion',     label: '💶 Tasación Online',       desc: 'Capta inmuebles' },
  ],
  'Tienda local': [
    { id: 'click_collect',  label: '🛍️ Click & Collect',       desc: 'Recogida tienda' },
    { id: 'loyalty',        label: '⭐ Tarjeta Digital',        desc: 'Retén clientes' },
    { id: 'whatsapp_shop',  label: '💬 Shop WhatsApp',         desc: 'Venta directa' },
  ],
  'Fontanería': [
    { id: 'urgencias',      label: '🚨 Urgencias 24h',          desc: 'Botón directo' },
    { id: 'presupuesto_f',  label: '🔧 Tique Trabajo',          desc: 'Gestión digital' },
  ],
  'Electricidad': [
    { id: 'urgencias_e',    label: '⚡ Emergencias Web',        desc: 'Aviso inmediato' },
    { id: 'presupuesto_e',  label: '🔌 Presupuesto Veloz',      desc: 'Captura ágil' },
  ],
  'Construcción / Reformas': [
    { id: 'portfolio',      label: '🏗️ Proyectos Realizados',   desc: 'Antes y después' },
    { id: 'simulador',      label: '📐 Calculador Costes',      desc: 'Estimación online' },
  ],
  'Asesoría / Gestoría': [
    { id: 'cliente_online', label: '📁 Cloud Documental',       desc: 'Ficheros seguros' },
    { id: 'cita_asesoria',  label: '📅 Citas Zoom/Meet',       desc: 'Integradas' },
    { id: 'alertas_fiscal', label: '🔔 Avisos Fiscales',       desc: 'Email automáticos' },
  ],
  'Taller mecánico': [
    { id: 'cita_taller',    label: '🔩 Recepción Activa',      desc: 'Entradas taller' },
    { id: 'presupuesto_t',  label: '🚗 Precio Express',        desc: 'Tarificador básico' },
    { id: 'seguimiento',    label: '📊 Status Vehículo',       desc: 'Web tracking' },
  ],
};

const TIPOS_WEB = [
  {
    id: 'corporativa',
    titulo: 'Presencia Corporativa',
    desc: 'Base sólida para tu marca. Atrae confianza e informa de tus servicios.',
    icono: Building2,
  },
  {
    id: 'dinamica',
    titulo: 'Gestión & Automatización',
    desc: 'Herramientas que ahorran tiempo: reservas, intranet y gestión activa.',
    icono: Zap,
  },
  {
    id: 'ecommerce',
    titulo: 'Tienda Online',
    desc: 'Ventas digitales completas. Gestiona productos, stock y pasarela de pago.',
    icono: ShoppingCart,
  },
];

const RECOMMENDED_TYPES = {
  'Restaurante / Bar': 'dinamica',
  'Clínica / Salud': 'dinamica',
  'Tienda local': 'ecommerce',
  'Fontanería': 'corporativa',
  'Electricidad': 'corporativa',
  'Construcción / Reformas': 'corporativa',
  'Asesoría / Gestoría': 'dinamica',
  'Inmobiliaria': 'dinamica',
  'Taller mecánico': 'dinamica',
  'Academia / Formación': 'dinamica',
  'Peluquería / Estética': 'dinamica',
};

export default function StepWebType({ datos, updateData }) {
  const recommendedId = RECOMMENDED_TYPES[datos.sector];
  const selectedTypeObj = TIPOS_WEB.find(t => t.id === datos.webType);

  const handleSelectType = (id) => {
    updateData('webType', id);
    if ((datos.enabledFeatures || []).length === 0) {
      const first = TIPO_FEATURES[id]?.[0]?.id;
      if (first) updateData('enabledFeatures', [first]);
    }
  };

  const toggleFeature = (featId) => {
    const current = datos.enabledFeatures || [];
    updateData('enabledFeatures',
      current.includes(featId)
        ? current.filter(i => i !== featId)
        : [...current, featId]
    );
  };

  const sectorExtras = SECTOR_EXTRA_FEATURES[datos.sector] || [];
  const baseFeatures = TIPO_FEATURES[datos.webType] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Elige el motor de tu web</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xl">
          Define el core tecnológico de tu sitio. Todas incluyen diseño responsive y optimización SEO.
        </p>
        <div className="pt-2">
          <Badge variant="secondary" className="rounded-md py-1 px-2.5 font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 w-fit mx-auto md:mx-0 border-none">
            <CheckCircle2 size={13} /> Estructura básica (Inicio, Servicios, Contacto) siempre incluida
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIPOS_WEB.map(tipo => {
          const isSelected = datos.webType === tipo.id;
          const isRecommended = recommendedId === tipo.id;
          const Icon = tipo.icono;

          return (
            <button
              key={tipo.id}
              type="button"
              onClick={() => handleSelectType(tipo.id)}
              className={cn(
                "relative text-left flex flex-col p-5 rounded-2xl border-2 transition-all duration-300 outline-none group overflow-hidden",
                isSelected 
                  ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 shadow-md"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-sm"
              )}
            >
              {isRecommended && !isSelected && (
                <div className="absolute top-0 right-0">
                  <div className="bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 text-[10px] font-bold uppercase px-2 py-1 rounded-bl-lg flex items-center gap-1">
                    <Sparkles size={9} fill="currentColor" /> Sugerido
                  </div>
                </div>
              )}

              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors",
                isSelected 
                  ? "bg-zinc-50/10 dark:bg-zinc-900/10" 
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200"
              )}>
                <Icon size={22} />
              </div>
              <h3 className="font-semibold text-[15px] tracking-tight mb-1.5 leading-tight">{tipo.titulo}</h3>
              <p className={cn(
                "text-xs leading-relaxed font-normal",
                isSelected ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-500 dark:text-zinc-400"
              )}>
                {tipo.desc}
              </p>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {selectedTypeObj && (
          <motion.div
            key={datos.webType}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-6 rounded-2xl">
                
                <div className="mb-5">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Zap size={13} className="fill-current" /> Módulos y herramientas
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Elige las funcionalidades que la IA debe implementar.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {baseFeatures.map(feat => {
                    const on = (datos.enabledFeatures || []).includes(feat.id);
                    return (
                      <button
                        key={feat.id}
                        type="button"
                        onClick={() => toggleFeature(feat.id)}
                        className={cn(
                          "group relative text-left p-3 rounded-xl border transition-all flex items-start gap-3 outline-none",
                          on 
                            ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm" 
                            : "bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900"
                        )}
                      >
                        <div className={cn(
                          "mt-0.5 w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-all",
                          on 
                            ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100" 
                            : "bg-transparent border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-400"
                        )}>
                          {on && <div className="w-1.5 h-1.5 bg-zinc-50 dark:bg-zinc-900 rounded-sm" />}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{feat.label}</div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-0.5">{feat.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {sectorExtras.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Sparkles size={13} /> Módulos sectoriales
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sectorExtras.map(feat => {
                        const on = (datos.enabledFeatures || []).includes(feat.id);
                        return (
                          <button
                            key={feat.id}
                            type="button"
                            onClick={() => toggleFeature(feat.id)}
                            className={cn(
                              "group relative text-left p-3 rounded-xl border transition-all flex items-start gap-3 outline-none",
                              on 
                                ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm" 
                                : "bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900"
                            )}
                          >
                            <div className={cn(
                              "mt-0.5 w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-all",
                              on 
                                ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100" 
                                : "bg-transparent border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-400"
                            )}>
                              {on && <div className="w-1.5 h-1.5 bg-zinc-50 dark:bg-zinc-900 rounded-sm" />}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{feat.label}</div>
                              <div className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-0.5">{feat.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
