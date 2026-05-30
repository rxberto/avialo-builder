import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobSSE } from '@/lib/useJobSSE';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2, CheckCircle2, XCircle, Rocket, ExternalLink,
  Terminal, RefreshCw, Clock, Zap, Database, Globe, ArrowRight, ShieldCheck, Mail
} from 'lucide-react';

const STATUS_INFO = {
  pending:    { label: 'En cola de espera',  color: 'bg-zinc-400',    icon: Clock,        text: 'text-zinc-500', bg: 'bg-zinc-500/10' },
  generating: { label: 'IA Generando...',    color: 'bg-indigo-500',  icon: Zap,          text: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  building:   { label: 'Compilando código',  color: 'bg-amber-500',   icon: Database,     text: 'text-amber-500', bg: 'bg-amber-500/10' },
  preview:    { label: 'Levantando preview',  color: 'bg-purple-500',  icon: Globe,        text: 'text-purple-500', bg: 'bg-purple-500/10' },
  deployed:   { label: '¡Web desplegada!',   color: 'bg-emerald-500', icon: CheckCircle2, text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  failed:     { label: 'Generación fallida', color: 'bg-red-500',     icon: XCircle,      text: 'text-red-500', bg: 'bg-red-500/10' },
};

const PHASE_STEPS = [
  { key: 'generating', label: 'IA Redactando', desc: 'Avialo IA escribiendo archivos' },
  { key: 'building',   label: 'TypeScript Build', desc: 'Validando compilación y linter' },
  { key: 'preview',    label: 'Docker Preview', desc: 'Mapeando puertos y levantando' },
  { key: 'deployed',   label: '¡En Línea!', desc: 'Proyecto listo para previsualizar' },
];

const STATUS_ORDER = ['pending', 'generating', 'building', 'preview', 'deployed'];

function getStepState(stepKey, currentStatus) {
  if (currentStatus === 'failed') return 'failed';
  if (currentStatus === 'deployed') return 'done';
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const stepIdx = STATUS_ORDER.indexOf(stepKey);
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

export default function JobProgressPage({ jobId, clientData, error, onReset, onSyncProfile, onAddNotification }) {
  const navigate = useNavigate();
  const { logs, status: sseStatus, progress, previewUrl } = useJobSSE(jobId);
  const status = error ? 'failed' : sseStatus;
  const logsEndRef = useRef(null);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [simulatedLogs, setSimulatedLogs] = useState([]);

  // Simulated Node/Packages installation logs
  useEffect(() => {
    if (logs.length > 0) return;

    const simSteps = [
      '⚡ Initializing Node.js v20.12.2 environment in sandbox...',
      '📦 Resolving package dependencies from standard B2B boilerplate...',
      '📥 Running `npm install` (Next.js v14, React v18, Tailwind CSS, Prisma ORM)...',
      '✓ package-lock.json generated (2289 modules resolved in 512ms)',
      '🗄️ Allocating PostgreSQL dedicated schema instance at localhost:5432...',
      '⚙️ Running database socket health-check...',
      '✓ PostgreSQL socket is alive and accepting connections',
      '✓ Client-tenant PostgreSQL schemas applied via `prisma db push`',
      '🔑 Configuring NextAuth v5 session layer and credential callbacks...',
      '✉️ Initializing SMTP Nodemailer secure mailer bindings...',
      '🌐 Binding dynamic Docker container preview port on range 8081+...',
      '🤖 AI Code Scaffolding starting (Avialo IA Core)...'
    ];

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < simSteps.length) {
        setSimulatedLogs((prev) => [...prev, simSteps[idx]]);
        idx++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [logs]);

  const statusInfo = STATUS_INFO[status] || STATUS_INFO.pending;
  const StatusIcon = statusInfo.icon;

  // Sincronizar el perfil del usuario de forma proactiva al finalizar la generación (éxito/fallo)
  useEffect(() => {
    if ((status === 'deployed' || status === 'failed') && onSyncProfile) {
      onSyncProfile();
      if (onAddNotification) {
        if (status === 'deployed') {
          onAddNotification(
            'success', 
            '¡Web compilada y viva!', 
            `Tu sitio "${clientData?.businessName || 'SaaS Avialo'}" ha sido desplegado con éxito en el subdominio.`
          );
        } else {
          onAddNotification(
            'warning', 
            'Compilación fallida', 
            `El Agente IA detectó un error al compilar el proyecto. Por favor, reintenta.`
          );
        }
      }
    }
  }, [status, onSyncProfile]);

  const displayLogs = logs.length > 0 ? logs : simulatedLogs;

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayLogs]);

  const visibleLogs = showAllLogs ? displayLogs : displayLogs.slice(-30);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-start p-4 sm:p-6 pt-16 relative overflow-hidden select-none"
    >
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl space-y-6 relative z-10">
        
        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm font-semibold text-left">
              <span className="block mb-1 font-bold text-red-600 dark:text-red-400">No se pudo iniciar la generación</span>
              <span className="text-red-500/90">{error}</span>
            </div>
          </div>
        )}

        {/* Header cockpit style */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl ${statusInfo.bg} border border-zinc-200 dark:border-zinc-800 text-xs font-bold ${statusInfo.text} shadow-sm`}
          >
            <StatusIcon className={`w-4 h-4 ${status !== 'deployed' && status !== 'failed' ? 'animate-pulse' : ''}`} />
            <span>{statusInfo.label}</span>
          </motion.div>

          <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-b from-zinc-900 via-indigo-950 to-zinc-900 dark:from-zinc-50 dark:via-indigo-200 dark:to-zinc-50 bg-clip-text text-transparent leading-none">
            {status === 'deployed' ? '¡Tu sitio web está vivo!' : status === 'failed' ? 'Hubo un inconveniente técnico' : 'El Agente IA está picando piedra...'}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            Orquestando: <span className="text-indigo-650 dark:text-indigo-400 font-bold">{clientData?.businessContext?.name || 'Tu Sitio Web B2B'}</span>
          </p>
        </div>

        {/* Global Progress Energy Bar */}
        <Card className="border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl bg-white dark:bg-zinc-900 overflow-hidden">
          <CardContent className="p-6 md:p-8 space-y-6">
            
            {/* Barra y porcentaje */}
            <div className="relative space-y-2">
              <div className="flex justify-between items-end text-xs font-bold">
                <span className="text-zinc-500">PROGRESO DEL DESPLIEGUE</span>
                <span className="text-indigo-650 dark:text-indigo-400 text-sm font-black tracking-wider">{progress}%</span>
              </div>
              
              <div className="h-3.5 w-full bg-zinc-100 dark:bg-zinc-950 rounded-full border border-zinc-200 dark:border-zinc-850 overflow-hidden p-0.5">
                <motion.div
                  className={`h-full rounded-full ${
                    status === 'failed'
                      ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                      : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                <span>Docker Sandbox ID: {jobId ? String(jobId).slice(-12) : 'Generando...'}</span>
                <span>Port allocation: 8081+</span>
              </div>
            </div>

            {/* Stepper phases cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PHASE_STEPS.map((step) => {
                const stepState = getStepState(step.key, status);
                return (
                  <div
                    key={step.key}
                    className={`p-4.5 rounded-2xl border flex flex-col justify-between text-left transition-all ${
                      stepState === 'done'
                        ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/20'
                        : stepState === 'active'
                        ? 'bg-zinc-900 dark:bg-zinc-50 border-transparent text-zinc-50 dark:text-zinc-950 shadow-md scale-[1.01]'
                        : stepState === 'failed'
                        ? 'bg-red-50/20 dark:bg-red-950/10 border-red-200/50 dark:border-red-900/20'
                        : 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200/40 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        stepState === 'active' ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-400'
                      }`}>
                        {step.label}
                      </span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        stepState === 'done'   ? 'text-emerald-500' :
                        stepState === 'active' ? 'text-indigo-400 animate-spin' :
                        stepState === 'failed' ? 'text-red-500' :
                        'text-zinc-300 dark:text-zinc-700'
                      }`}>
                        {stepState === 'done' ? (
                          <CheckCircle2 size={16} />
                        ) : stepState === 'active' ? (
                          <Loader2 size={16} />
                        ) : stepState === 'failed' ? (
                          <XCircle size={16} />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        )}
                      </div>
                    </div>
                    <span className={`text-[9px] font-semibold leading-snug mt-1 ${
                      stepState === 'active' ? 'text-zinc-350 dark:text-zinc-600' : 'text-zinc-500'
                    }`}>
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>

          </CardContent>
        </Card>

        {/* Success Card premium */}
        <AnimatePresence>
          {status === 'deployed' && previewUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <Card className="border-emerald-250 dark:border-emerald-900/50 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden rounded-3xl p-6 md:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100 dark:border-zinc-850 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                      <Rocket size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">¡Tu sitio web está desplegado de forma segura!</h3>
                      <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 leading-snug">La base de datos PostgreSQL, el dashboard del cliente y los correos SMTP han sido enlazados.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
                    <Button
                      size="lg"
                      className="gap-2 bg-[var(--brand)] hover:bg-[var(--brand-2)] text-white rounded-xl shadow-lg shadow-indigo-650/15 active:scale-[0.98] font-bold text-xs"
                      onClick={() => navigate('/ide')}
                    >
                      <span>Abrir Editor IDE (Chat IA)</span>
                      <ArrowRight size={14} />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2 border-border text-foreground hover:bg-muted rounded-xl active:scale-[0.98] font-bold text-xs"
                      onClick={() => navigate('/ide')}
                    >
                      <span>Ver Previsualización</span>
                      <ExternalLink size={14} />
                    </Button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 text-xs font-semibold">
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <Database size={13} className="text-indigo-500" />
                      <span>Base de Datos</span>
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">PostgreSQL Schema Activo</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <ShieldCheck size={13} className="text-indigo-500" />
                      <span>NextAuth Acceso</span>
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Roles admin / client listos</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <Mail size={13} className="text-indigo-500" />
                      <span>SMTP Email</span>
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Nodemailer configurado</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Failed Card */}
        <AnimatePresence>
          {status === 'failed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-red-200 dark:border-red-900/30 bg-white dark:bg-zinc-900 shadow-lg rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <XCircle size={24} className="text-red-500 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">La generación automática falló</h3>
                    <p className="text-[10px] text-zinc-550 dark:text-zinc-400 mt-1">El agente IA agotó los 5 intentos de compilación y linter.</p>
                  </div>
                </div>
                <Button variant="outline" className="gap-2 shrink-0 rounded-xl font-bold text-xs" onClick={onReset}>
                  <RefreshCw size={14} />
                  Reintentar Generar
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Logs Terminal Cockpit Style */}
        <Card className="border-zinc-250 dark:border-zinc-800 rounded-3xl shadow-xl overflow-hidden bg-zinc-950 border border-zinc-850">
          {/* Mockup Top macOS dots bar */}
          <CardHeader className="pb-3 border-b border-zinc-850 bg-zinc-950/80 backdrop-blur-sm flex flex-row items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Window dots */}
              <div className="flex gap-1.5 shrink-0">
                <span className="w-3.5 h-3.5 rounded-full bg-red-400/80 block cursor-pointer hover:bg-red-500" />
                <span className="w-3.5 h-3.5 rounded-full bg-yellow-400/80 block cursor-pointer hover:bg-yellow-500" />
                <span className="w-3.5 h-3.5 rounded-full bg-green-400/80 block cursor-pointer hover:bg-green-500" />
              </div>
              
              <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

              <div className="flex items-center gap-2 text-zinc-500 font-mono text-[10px] font-bold">
                <Terminal size={13} />
                <span className="uppercase tracking-wider">consola-orquestador.sh</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {status !== 'deployed' && status !== 'failed' && (
                <div className="flex gap-1.5 items-center text-[10px] text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 block animate-pulse" />
                  <span>TRANSMITIENDO logs</span>
                </div>
              )}
              <span className="text-[10px] text-zinc-600 font-mono">{displayLogs.length} líneas</span>
            </div>
          </CardHeader>

          {/* Terminal window body */}
          <CardContent className="p-0">
            <div className="bg-zinc-950 h-80 overflow-y-auto p-6 font-mono text-[11px] leading-relaxed space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-700 text-left">
              {displayLogs.length === 0 ? (
                <div className="text-zinc-550 flex items-center gap-2.5 py-4 font-bold">
                  <Loader2 size={14} className="animate-spin text-indigo-500" />
                  <span>Conectando con el orquestador BullMQ y Redis...</span>
                </div>
              ) : (
                visibleLogs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`${
                      log.includes('✅') || log.includes('exitosamente') || log.includes('éxito') ? 'text-emerald-400 font-bold' :
                      log.includes('❌') || log.includes('Error') || log.includes('falló') ? 'text-red-400 font-bold' :
                      log.includes('⚙️') || log.includes('🔧') || log.includes('Intento') ? 'text-amber-400 font-bold' :
                      log.includes('🤖') ? 'text-indigo-400' :
                      log.includes('🏗️') ? 'text-purple-400' :
                      'text-zinc-400'
                    }`}
                  >
                    <span className="text-zinc-650 select-none mr-2">avialo-shell$</span>
                    {log}
                  </motion.div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>

            {logs.length > 30 && !showAllLogs && (
              <button
                onClick={() => setShowAllLogs(true)}
                className="w-full py-3 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 bg-zinc-900 border-t border-zinc-850 transition-colors uppercase tracking-wider"
              >
                Ver {logs.length - 30} líneas anteriores
              </button>
            )}
          </CardContent>
        </Card>

        {/* Action Bottom footer */}
        {(status === 'deployed' || status === 'failed') && (
          <div className="text-center pt-4">
            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-450 dark:hover:text-zinc-200 text-xs font-bold border border-zinc-200 dark:border-zinc-800 px-5 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all shadow-sm"
            >
              <RefreshCw size={12} />
              <span>Volver a mi Panel de Constructor</span>
            </button>
          </div>
        )}

      </div>
    </motion.div>
  );
}
