import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X, Loader2, Building2, Search as SeoIcon, Mail, Save, CheckCircle2, AlertCircle, Info
} from 'lucide-react';
import { getSiteConfig, updateSiteConfig, getJob } from '../lib/api';
import { cn } from '../lib/utils';

const TABS = [
  { id: 'datos', label: 'Datos', Icon: Building2 },
  { id: 'seo', label: 'SEO', Icon: SeoIcon },
  { id: 'forms', label: 'Formulario', Icon: Mail },
];

/* Campo de texto reutilizable, estilo IDE */
function Field({ label, value, onChange, placeholder, hint, type = 'text', max, textarea }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={max}
          rows={3}
          className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-[13px] outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 resize-none"
        />
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={max}
          className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-[13px] outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60"
        />
      )}
      {hint && <p className="text-[10.5px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

export default function SettingsModal({ jobId, onClose, onReloadPreview }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);
  const [tab, setTab] = useState('datos');
  const [phase, setPhase] = useState('idle'); // idle | applying | done | failed

  useEffect(() => {
    (async () => {
      try {
        const { config } = await getSiteConfig(jobId);
        setConfig(config);
      } catch (e) {
        setError(e.message || 'No se pudo cargar la configuración.');
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  // Helpers de actualización inmutable
  const set = (key, val) => setConfig(c => ({ ...c, [key]: val }));
  const setNested = (group, key, val) => setConfig(c => ({ ...c, [group]: { ...c[group], [key]: val } }));

  const handleSave = async () => {
    if (!config) return;
    setPhase('applying');
    setError('');
    // Enviamos solo los campos editables (whitelist también en el backend).
    const patch = {
      name: config.name,
      contact: config.contact,
      social: config.social,
      seo: config.seo,
      forms: config.forms,
    };
    try {
      await updateSiteConfig(jobId, patch);
      // Sondear el estado del job hasta que termine de recompilar.
      const deadline = Date.now() + 4 * 60 * 1000;
      let done = false;
      while (!done && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 2500));
        let job;
        try { job = await getJob(jobId); } catch { continue; }
        if (job.status === 'deployed') { done = true; setPhase('done'); onReloadPreview?.(); }
        else if (job.status === 'failed') { done = true; setPhase('failed'); }
      }
      if (!done) { setPhase('done'); onReloadPreview?.(); } // timeout suave: asumimos aplicado
    } catch (e) {
      setError(e.message || 'No se pudo guardar.');
      setPhase('idle');
    }
  };

  const applying = phase === 'applying';

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={() => !applying && onClose()}
    >
      <motion.div
        className="w-full max-w-[620px] max-h-[88vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center">
              <Building2 size={13} className="text-white" />
            </span>
            <span className="font-bold text-sm">Configuración de tu web</span>
          </div>
          <button onClick={() => !applying && onClose()} disabled={applying}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40">
            <X size={15} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
            <Loader2 size={16} className="animate-spin text-violet-500" /> Cargando configuración…
          </div>
        ) : error && !config ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} disabled={applying}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors disabled:opacity-50',
                    tab === t.id ? 'border-violet-500 text-violet-500 bg-violet-500/5' : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}>
                  <t.Icon size={12} /> {t.label}
                </button>
              ))}
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {tab === 'datos' && (
                <>
                  <Field label="Nombre del negocio" value={config.name} onChange={v => set('name', v)} max={120} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Teléfono" value={config.contact.phone} onChange={v => setNested('contact', 'phone', v)} max={60} />
                    <Field label="Email de contacto" value={config.contact.email} onChange={v => setNested('contact', 'email', v)} type="email" max={160} />
                  </div>
                  <Field label="Dirección" value={config.contact.address} onChange={v => setNested('contact', 'address', v)} max={300} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Instagram" value={config.social.instagram} onChange={v => setNested('social', 'instagram', v)} placeholder="https://instagram.com/…" />
                    <Field label="Facebook" value={config.social.facebook} onChange={v => setNested('social', 'facebook', v)} placeholder="https://facebook.com/…" />
                    <Field label="LinkedIn" value={config.social.linkedin} onChange={v => setNested('social', 'linkedin', v)} placeholder="https://linkedin.com/…" />
                  </div>
                  <p className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                    <Info size={13} className="shrink-0 mt-0.5" /> Estos datos aparecen en el pie de página, contacto y avisos legales de tu web.
                  </p>
                </>
              )}

              {tab === 'seo' && (
                <>
                  <Field label="Título SEO" value={config.seo.title} onChange={v => setNested('seo', 'title', v)} max={120}
                    placeholder={`${config.name} | ${config.sector}`}
                    hint="Lo que aparece en la pestaña del navegador y en Google. Si lo dejas vacío, lo generamos automáticamente." />
                  <Field label="Descripción SEO" value={config.seo.description} onChange={v => setNested('seo', 'description', v)} max={320} textarea
                    placeholder="Descripción breve de tu negocio para Google (150-160 caracteres)."
                    hint="Aparece bajo el título en los resultados de Google." />
                </>
              )}

              {tab === 'forms' && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">¿A dónde llegan los mensajes del formulario?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setNested('forms', 'provider', 'none')}
                        className={cn('p-3 rounded-xl border text-left transition-all',
                          config.forms.provider === 'none' ? 'border-violet-500 bg-violet-500/10' : 'border-border hover:border-violet-500/40')}>
                        <div className="text-[12px] font-bold">Demo</div>
                        <div className="text-[10px] text-muted-foreground">Solo muestra "enviado" (sin entrega real)</div>
                      </button>
                      <button type="button" onClick={() => setNested('forms', 'provider', 'formsubmit')}
                        className={cn('p-3 rounded-xl border text-left transition-all',
                          config.forms.provider === 'formsubmit' ? 'border-violet-500 bg-violet-500/10' : 'border-border hover:border-violet-500/40')}>
                        <div className="text-[12px] font-bold">A mi correo (FormSubmit)</div>
                        <div className="text-[10px] text-muted-foreground">Los mensajes llegan a tu email</div>
                      </button>
                    </div>
                  </div>
                  {config.forms.provider === 'formsubmit' && (
                    <>
                      <Field label="Tu email para recibir mensajes" value={config.forms.email} onChange={v => setNested('forms', 'email', v)} type="email" max={160}
                        placeholder="tucorreo@ejemplo.com" />
                      <p className="flex items-start gap-2 text-[11px] text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                        <Info size={13} className="shrink-0 mt-0.5 text-amber-500" /> La primera vez que alguien envíe el formulario, FormSubmit te mandará un email para confirmar tu dirección (solo una vez). No requiere ninguna clave.
                      </p>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Pie con guardar */}
            <div className="border-t border-border p-4 shrink-0 flex items-center justify-between gap-3 bg-muted/10">
              <div className="text-[11px] min-h-[18px]">
                {phase === 'applying' && <span className="flex items-center gap-1.5 text-amber-500 font-semibold"><Loader2 size={12} className="animate-spin" /> Aplicando cambios… (~1 min)</span>}
                {phase === 'done' && <span className="flex items-center gap-1.5 text-emerald-500 font-semibold"><CheckCircle2 size={12} /> ¡Cambios aplicados!</span>}
                {phase === 'failed' && <span className="flex items-center gap-1.5 text-red-500 font-semibold"><AlertCircle size={12} /> No se pudo recompilar.</span>}
                {error && phase === 'idle' && <span className="flex items-center gap-1.5 text-red-500 font-semibold"><AlertCircle size={12} /> {error}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => !applying && onClose()} disabled={applying}
                  className="px-4 py-2 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground hover:bg-muted/60 disabled:opacity-40">
                  {phase === 'done' ? 'Cerrar' : 'Cancelar'}
                </button>
                <button onClick={handleSave} disabled={applying}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5">
                  {applying ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Guardar y aplicar
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
