import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobSSE } from '../lib/useJobSSE';
import {
  Globe, Terminal, Database, RefreshCw, Send,
  ArrowLeft, ExternalLink, Sparkles, Plus, Trash2,
  Code, FileCode, Folder, Loader2, FileText,
  ChevronDown, ChevronUp, Sun, Moon, Zap, X,
  Settings2, Monitor, Smartphone, Tablet, Lock,
  Copy, Activity, Server, Clock, CheckCheck, Search, ImagePlus
} from 'lucide-react';
import { getSandboxFiles, getSandboxFileContent, editJob, getJob, uploadJobImage } from '../lib/api';
import { downscaleImage } from '../lib/image';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '../lib/utils';

/* ─────────────────────────────────────────────
   Icono por tipo de archivo (extensión → color VS Code)
───────────────────────────────────────────── */
function getFileIconConfig(name, isDir) {
  if (isDir) return { Icon: Folder, color: 'text-violet-400' };
  const ext = name.split('.').pop()?.toLowerCase();
  const map = {
    jsx:    { Icon: Code,     color: 'text-cyan-400'    },
    tsx:    { Icon: Code,     color: 'text-blue-400'    },
    js:     { Icon: Code,     color: 'text-yellow-400'  },
    ts:     { Icon: Code,     color: 'text-blue-500'    },
    css:    { Icon: FileCode, color: 'text-sky-400'     },
    scss:   { Icon: FileCode, color: 'text-pink-400'    },
    json:   { Icon: FileText, color: 'text-amber-400'   },
    prisma: { Icon: Database, color: 'text-emerald-400' },
    env:    { Icon: Lock,     color: 'text-red-400'     },
    md:     { Icon: FileText, color: 'text-zinc-400'    },
    html:   { Icon: Code,     color: 'text-orange-400'  },
  };
  return map[ext] || { Icon: FileText, color: 'text-zinc-500' };
}

function FileIcon({ name, size = 13 }) {
  const { Icon, color } = getFileIconConfig(name, false);
  return <Icon size={size} className={cn(color, 'shrink-0')} />;
}

/* ─────────────────────────────────────────────
   Badge de estado del build
───────────────────────────────────────────── */
function StatusBadge({ status, progress }) {
  if (status === 'deployed') return (
    <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse" />
      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">En línea</span>
    </div>
  );
  if (status === 'failed') return (
    <div className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      <span className="text-[11px] font-semibold text-red-500">Error</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
        Compilando{progress > 0 ? ` ${progress}%` : '…'}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Mensajes del chat — estilo Claude.ai
───────────────────────────────────────────── */
function AIMessage({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex gap-3"
    >
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <Sparkles size={12} color="#fff" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-[10px] font-extrabold text-violet-500 uppercase tracking-wider mb-1.5">
          Avialo AI
        </span>
        {message.isGenerating ? (
          <div className="flex items-center gap-1 py-1">
            {[0, 120, 240].map(d => (
              <span key={d} className="w-1.5 h-1.5 rounded-full bg-violet-400/70 animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-foreground leading-[1.7] whitespace-pre-line">{message.text}</p>
        )}
        <time className="block mt-1.5 text-[10px] text-muted-foreground/50">{message.timestamp}</time>
      </div>
    </motion.div>
  );
}

function UserMessage({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex justify-end"
    >
      <div className="max-w-[85%] space-y-1">
        <div className="bg-violet-600 text-white px-4 py-2.5 rounded-2xl rounded-br-none shadow-sm">
          <p className="text-[13px] leading-[1.7] whitespace-pre-line">{message.text}</p>
        </div>
        <time className="block text-right text-[10px] text-muted-foreground/50 pr-1">{message.timestamp}</time>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Datos de BD inicial (simulados)
───────────────────────────────────────────── */
const INITIAL_DB = {
  corporativa: {
    tables: ['reservas', 'contactos', 'servicios'],
    data: {
      reservas: [
        { id: 1, fecha: '2026-05-28', hora: '10:00', cliente: 'Roberto Gómez', servicio: 'Asesoría Fiscal B2B', estado: 'Confirmado' },
        { id: 2, fecha: '2026-05-29', hora: '16:30', cliente: 'María Cifuentes', servicio: 'Auditoría Anual', estado: 'Pendiente' },
      ],
      contactos: [
        { id: 1, fecha: '2026-05-25', nombre: 'Eduardo Martínez', email: 'eduardo@constructores.com', asunto: 'Presupuesto Auditoría', leido: 'No' },
        { id: 2, fecha: '2026-05-24', nombre: 'Sofía Larrea', email: 'slarrea@techb2b.es', asunto: 'Consulta tarifas', leido: 'Sí' },
      ],
      servicios: [
        { id: 1, nombre: 'Asesoría Fiscal B2B', precio: '149€/mes', duracion: '60 min', activo: 'Sí' },
        { id: 2, nombre: 'Auditoría Financiera Anual', precio: '899€/pago', duracion: '120 min', activo: 'Sí' },
      ],
    },
  },
  ecommerce: {
    tables: ['productos', 'pedidos', 'clientes'],
    data: {
      productos: [
        { id: 1, nombre: 'Café Blend 250g', precio: '12.90€', stock: 45, categoria: 'Café Grano', visible: 'Sí' },
        { id: 2, nombre: 'Taza Avialo', precio: '15.00€', stock: 18, categoria: 'Accesorios', visible: 'Sí' },
      ],
      pedidos: [
        { id: 101, fecha: '2026-05-25', cliente: 'Lucas Ortega', total: '25.80€', estado: 'Entregado' },
        { id: 102, fecha: '2026-05-25', cliente: 'Beatriz Hernanz', total: '104.00€', estado: 'Procesando' },
      ],
      clientes: [
        { id: 1, nombre: 'Lucas Ortega', email: 'lucas@catering.com', compras: 3, totalGastado: '112.50€' },
        { id: 2, nombre: 'Beatriz Hernanz', email: 'b.hernanz@innovab2b.com', compras: 1, totalGastado: '104.00€' },
      ],
    },
  },
};

/* ─────────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────────── */
export default function IDEPage({ jobId, user, onReset, onSyncProfile, onUpdateUser, darkMode, toggleTheme }) {
  const { logs, status, progress, previewUrl } = useJobSSE(jobId);

  /* Tutorial colapsable */
  const [showTutorial, setShowTutorial] = useState(() => localStorage.getItem('avialo_hide_ide_tutorial') !== 'true');
  const handleHideTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('avialo_hide_ide_tutorial', 'true');
  };

  /* Créditos */
  const userCredits = user?.aiCredits ?? 0;
  const maxCredits = {
    none: 50, basic: 800, corporativa: 800, pro: 1500, dinamica: 1500, ecommerce: 3000
  }[user?.plan] || 50;

  /* Redimensionado de paneles */
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [chatWidth, setChatWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);

  const startSidebarResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const doResize = (mv) => setSidebarWidth(Math.max(220, Math.min(480, startWidth + mv.clientX - startX)));
    const stop = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stop);
    };
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stop);
  };

  const startChatResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = chatWidth;
    const doResize = (mv) => setChatWidth(Math.max(300, Math.min(800, startWidth + mv.clientX - startX)));
    const stop = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stop);
    };
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stop);
  };

  /* Panel avanzado */
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('files');

  /* Explorador de archivos */
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [fileSearch, setFileSearch] = useState('');

  /* Terminal */
  const [showTerminal, setShowTerminal] = useState(false);
  const logsEndRef = useRef(null);

  /* Chat */
  const [promptText, setPromptText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachedImages, setAttachedImages] = useState([]); // [{ dataUrl, name }]
  const [attachError, setAttachError] = useState('');
  const imageInputRef = useRef(null);
  const [chatMessages, setChatMessages] = useState([{
    id: 'welcome',
    sender: 'ai',
    text: '¡Hola! Soy tu asistente de diseño IA. Dime qué cambios quieres hacer en tu web: colores, textos, secciones, botones… ¡lo que necesites!',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }]);
  const chatEndRef = useRef(null);

  /* Base de datos */
  const dbCat = user?.siteType === 'ecommerce' ? 'ecommerce' : 'corporativa';
  const dbConfig = INITIAL_DB[dbCat];
  const [selectedTable, setSelectedTable] = useState(dbConfig.tables[0]);
  const [dbData, setDbData] = useState(dbConfig.data);
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [newRowData, setNewRowData] = useState({});
  const activeRows = dbData[selectedTable] || [];
  const headers = activeRows.length > 0 ? Object.keys(activeRows[0]) : [];

  /* Viewport del preview */
  const [previewViewport, setPreviewViewport] = useState('desktop');
  const iframeRef = useRef(null);

  /* Copiar URL */
  const [copiedUrl, setCopiedUrl] = useState(false);
  const copyUrl = () => {
    navigator.clipboard.writeText(user?.siteDomain || previewUrl || '').then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1600);
    });
  };

  /* Carga de archivos del sandbox */
  const loadFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await getSandboxFiles(jobId);
      setFiles(res.files || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFiles(false);
    }
  };
  useEffect(() => { if (jobId) loadFiles(); }, [jobId]);

  /* Seleccionar archivo */
  const handleSelectFile = async (path) => {
    setSelectedFile(path);
    setLoadingContent(true);
    try {
      const res = await getSandboxFileContent(jobId, path);
      setFileContent(res.content || '');
    } catch {
      setFileContent('// No se pudo cargar el archivo.');
    } finally {
      setLoadingContent(false);
    }
  };

  /* Auto-scroll */
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => { if (showTerminal) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs, showTerminal]);

  /* Enviar mensaje al agente */
  /* Recarga el iframe del preview (con cache-bust). Reintenta un par de veces porque el
     contenedor recién reiniciado tarda unos segundos en aceptar conexiones. */
  const reloadPreview = () => {
    const doReload = () => {
      if (!iframeRef.current) return;
      const base = (previewUrl || iframeRef.current.src || '').split('#')[0].split('?')[0];
      if (base) iframeRef.current.src = `${base}?t=${Date.now()}`;
    };
    setTimeout(doReload, 1500);
    setTimeout(doReload, 5000);
  };

  /* Adjuntar imágenes al chat (se reducen en el cliente antes de subir) */
  const handleAttach = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setAttachError('');
    const room = 6 - attachedImages.length;
    if (room <= 0) { setAttachError('Máximo 6 imágenes por mensaje.'); return; }
    try {
      const added = [];
      for (const file of files.slice(0, room)) {
        const dataUrl = await downscaleImage(file);
        added.push({ dataUrl, name: file.name });
      }
      setAttachedImages(prev => [...prev, ...added]);
    } catch (err) {
      setAttachError(err.message || 'No se pudo cargar la imagen.');
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = promptText.trim();
    const imagesToUpload = attachedImages;
    if ((!text && imagesToUpload.length === 0) || isSending) return;
    setPromptText('');
    setAttachedImages([]);
    setAttachError('');
    setIsSending(true);
    const aiId = `ai-${Date.now()}`;

    const displayText = text || `He subido ${imagesToUpload.length} imagen(es) para la web.`;
    setChatMessages(prev => [...prev,
      { id: `u-${Date.now()}`, sender: 'user', text: imagesToUpload.length ? `${displayText}  📎 ${imagesToUpload.length} imagen(es)` : displayText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      { id: aiId, sender: 'ai', text: 'Analizando tu proyecto y aplicando los cambios…', isGenerating: true, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setShowTerminal(true);

    /* Descuento visual instantáneo */
    if (onUpdateUser && user) {
      onUpdateUser({ ...user, aiCredits: Math.max(0, (user.aiCredits ?? 0) - 1) });
    }

    const finish = (msg) => {
      setIsSending(false);
      setChatMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: msg, isGenerating: false } : m));
      if (onSyncProfile) onSyncProfile();
    };

    try {
      // Subir primero las imágenes adjuntas y construir el prompt con sus rutas públicas.
      let finalPrompt = text;
      if (imagesToUpload.length) {
        const urls = [];
        for (const img of imagesToUpload) {
          const { url } = await uploadJobImage(jobId, img.dataUrl);
          urls.push(url);
        }
        const imgInstruction = `He subido estas imágenes (rutas públicas ya disponibles en la web; úsalas con <img src="RUTA" className="object-cover" /> y alt descriptivo): ${urls.join(', ')}.`;
        finalPrompt = text
          ? `${imgInstruction}\n\nInstrucción: ${text}`
          : `${imgInstruction} Colócalas de forma destacada donde mejor encajen (hero, galería o secciones), sustituyendo imágenes genéricas si procede.`;
      }

      await editJob(jobId, finalPrompt);

      // Sondeo propio del estado del job hasta que termine (robusto, no depende del SSE).
      // El endpoint de edición pone el estado en 'generating' de forma síncrona antes de
      // responder, así que aquí ya veremos generating/building → deployed/failed.
      const deadline = Date.now() + 8 * 60 * 1000; // 8 min de techo
      let done = false;
      while (!done && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 2500));
        let job;
        try { job = await getJob(jobId); } catch { continue; }
        if (job.status === 'deployed') {
          done = true;
          finish('✅ ¡Cambios aplicados! La preview se actualiza automáticamente.');
          loadFiles();
          reloadPreview();
        } else if (job.status === 'failed') {
          done = true;
          finish('⚠️ No se pudo aplicar el cambio (el build falló). Revisa la terminal e inténtalo de nuevo.');
        }
      }
      if (!done) finish('⏱️ El cambio está tardando más de lo normal. Refresca en un momento para ver el resultado.');
    } catch (err) {
      finish(`❌ Error: ${err.message}`);
    }
  };

  /* Operaciones de base de datos */
  const handleInsertRow = (e) => {
    e.preventDefault();
    const row = { id: Date.now() % 10000, ...newRowData };
    setDbData(prev => ({ ...prev, [selectedTable]: [row, ...prev[selectedTable]] }));
    setShowInsertModal(false);
    setNewRowData({});
  };
  const handleDeleteRow = (id) =>
    setDbData(prev => ({ ...prev, [selectedTable]: prev[selectedTable].filter(r => r.id !== id) }));

  const filteredFiles = files.filter(f => !fileSearch || f.name.toLowerCase().includes(fileSearch.toLowerCase()));

  /* Tabs del panel avanzado */
  const advancedTabs = [
    { id: 'files',  label: 'Código',   Icon: Code     },
    { id: 'db',     label: 'Datos',    Icon: Database  },
    { id: 'deploy', label: 'Deploy',   Icon: Activity  },
  ];

  return (
    <>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground select-none">

        {/* ══════════════════════════════════════
            HEADER
        ══════════════════════════════════════ */}
        <header className="flex items-center justify-between h-[52px] px-4 bg-card border-b border-border shrink-0 z-10 gap-3">

          {/* Izquierda: volver + nombre proyecto */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              onClick={onReset}
              title="Volver al dashboard"
            >
              <ArrowLeft size={15} />
            </Button>
            <div className="h-5 w-px bg-border shrink-0" />
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-sm shrink-0">
              <Sparkles size={13} color="#fff" />
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-bold text-foreground leading-none truncate">
                {user?.siteName || 'Proyecto Avialo'}
              </div>
              <div className="text-[9.5px] text-muted-foreground uppercase font-semibold tracking-wider mt-0.5 truncate">
                {user?.siteType || 'corporativa'} · avialo.es
              </div>
            </div>
          </div>

          {/* Centro: estado del build */}
          <StatusBadge status={status} progress={progress} />

          {/* Derecha: acciones */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant={showSidebar ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'gap-1.5 h-8 rounded-lg font-semibold text-[11px] cursor-pointer px-3',
                showSidebar && 'bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 border border-violet-500/20'
              )}
              onClick={() => setShowSidebar(s => !s)}
            >
              <Settings2 size={13} /> Avanzado
            </Button>
            <a
              href={previewUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className={cn(
                'h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors',
                !previewUrl && 'pointer-events-none opacity-35'
              )}
              title="Abrir en nueva pestaña"
            >
              <ExternalLink size={14} />
            </a>
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
              onClick={toggleTheme}
              title="Cambiar tema"
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </Button>
          </div>
        </header>

        {/* ══════════════════════════════════════
            CUERPO
        ══════════════════════════════════════ */}
        <div className={cn('flex flex-1 overflow-hidden', isResizing && 'cursor-col-resize select-none')}>

          {/* ── PANEL AVANZADO ── */}
          <div
            className="shrink-0 flex flex-col overflow-hidden bg-card border-r border-border"
            style={{
              width: showSidebar ? sidebarWidth : 0,
              minWidth: showSidebar ? sidebarWidth : 0,
              opacity: showSidebar ? 1 : 0,
              pointerEvents: showSidebar ? 'auto' : 'none',
              transition: isResizing ? 'none' : 'width 0.2s ease, opacity 0.15s ease',
            }}
          >
            <div className="h-full flex flex-col overflow-hidden" style={{ width: sidebarWidth }}>

              {/* Tabs */}
              <div className="flex border-b border-border bg-muted/20 shrink-0">
                {advancedTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSidebarTab(tab.id)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer border-b-2',
                      sidebarTab === tab.id
                        ? 'border-violet-500 text-violet-500 bg-violet-500/5'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    )}
                  >
                    <tab.Icon size={11} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Contenido del tab */}
              <div className="flex-1 overflow-y-auto">

                {/* ─── TAB CÓDIGO (explorador de archivos) ─── */}
                {sidebarTab === 'files' && (
                  <div className="flex flex-col h-full">
                    <div className="p-3 border-b border-border/50 space-y-2 shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">
                          Explorador
                        </span>
                        <button
                          onClick={loadFiles}
                          className="text-muted-foreground hover:text-violet-500 transition-colors cursor-pointer"
                          title="Refrescar"
                        >
                          <RefreshCw size={11} />
                        </button>
                      </div>
                      {/* Buscador */}
                      <div className="relative">
                        <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar archivo…"
                          value={fileSearch}
                          onChange={e => setFileSearch(e.target.value)}
                          className="w-full pl-7 pr-2.5 py-1.5 text-[11px] bg-muted/40 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500/50 text-foreground placeholder:text-muted-foreground/40"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                      {loadingFiles ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                          <Loader2 size={13} className="animate-spin text-violet-500" />
                          <span className="text-xs">Escaneando sandbox…</span>
                        </div>
                      ) : filteredFiles.length === 0 ? (
                        <div className="text-center py-10 text-xs text-muted-foreground">
                          {fileSearch ? 'Sin resultados' : 'Sin archivos'}
                        </div>
                      ) : (
                        <div className="space-y-px">
                          {filteredFiles.map(file => {
                            const { Icon, color } = getFileIconConfig(file.name, file.isDir);
                            return (
                              <button
                                key={file.path}
                                onClick={() => !file.isDir && handleSelectFile(file.path)}
                                className={cn(
                                  'w-full flex items-center gap-1.5 py-1.5 rounded-md text-left text-[12px] transition-colors',
                                  file.isDir
                                    ? 'text-foreground font-semibold cursor-default'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer',
                                  selectedFile === file.path && 'bg-violet-500/10 text-violet-500 font-semibold hover:bg-violet-500/15 hover:text-violet-500'
                                )}
                                style={{ paddingLeft: `${(file.path.split('/').length - 1) * 10 + 8}px` }}
                              >
                                <Icon size={12} className={cn(color, 'shrink-0')} />
                                <span className="truncate">{file.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── TAB BASE DE DATOS ─── */}
                {sidebarTab === 'db' && (
                  <div className="flex flex-col h-full p-3 gap-3">
                    {/* Indicador conexión */}
                    <div className="flex items-center gap-2 text-[11px] bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="text-muted-foreground font-mono truncate">postgres · schema_b2b</span>
                    </div>

                    {/* Selector de tabla */}
                    <div className="flex gap-1.5 flex-wrap">
                      {dbConfig.tables.map(t => (
                        <button
                          key={t}
                          onClick={() => setSelectedTable(t)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer',
                            selectedTable === t
                              ? 'bg-violet-500/15 text-violet-500 border-violet-500/30'
                              : 'bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground'
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* Tabla de datos */}
                    <div className="flex-1 flex flex-col rounded-xl border border-border overflow-hidden min-h-0">
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">{selectedTable}</span>
                          <span className="text-[9px] text-muted-foreground/50">{activeRows.length} filas</span>
                        </div>
                        <button
                          onClick={() => setShowInsertModal(true)}
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md border border-violet-500/30 bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 transition-colors cursor-pointer"
                        >
                          <Plus size={9} /> Insertar
                        </button>
                      </div>
                      <div className="flex-1 overflow-auto">
                        <table className="w-full text-[10.5px] border-collapse">
                          <thead className="sticky top-0 bg-muted/40 border-b border-border z-10">
                            <tr>
                              {headers.map(h => (
                                <th key={h} className="px-3 py-2 text-left text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                              <th className="w-7" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {activeRows.map(row => (
                              <tr key={row.id} className="hover:bg-violet-500/5 transition-colors group">
                                {headers.map(h => (
                                  <td key={h} className="px-3 py-2 text-muted-foreground max-w-[110px] truncate" title={String(row[h])}>
                                    {String(row[h])}
                                  </td>
                                ))}
                                <td className="px-1.5 text-right">
                                  <button
                                    onClick={() => handleDeleteRow(row.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-all cursor-pointer"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB DEPLOY ─── */}
                {sidebarTab === 'deploy' && (
                  <div className="p-4 space-y-5">
                    {/* Estado */}
                    <div className={cn(
                      'rounded-xl border p-4 space-y-3',
                      status === 'deployed'
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : status === 'failed'
                          ? 'border-red-500/30 bg-red-500/5'
                          : 'border-amber-500/30 bg-amber-500/5'
                    )}>
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          'text-[11px] font-extrabold',
                          status === 'deployed' ? 'text-emerald-500' : status === 'failed' ? 'text-red-500' : 'text-amber-500'
                        )}>
                          {status === 'deployed' ? '✅ Desplegado correctamente'
                            : status === 'failed' ? '❌ Error en compilación'
                              : '⚙️ Compilando…'}
                        </span>
                        {status !== 'deployed' && status !== 'failed' && (
                          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">{progress}%</span>
                        )}
                      </div>
                      {status !== 'deployed' && status !== 'failed' && (
                        <Progress value={progress} className="h-1 bg-muted/60 [&>div]:bg-amber-500 rounded-full" />
                      )}
                    </div>

                    {/* Info del servidor */}
                    <div className="space-y-2.5">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Infraestructura</span>
                      {[
                        { Icon: Server, label: 'Servidor',    value: 'Nube privada segura'  },
                        { Icon: Globe,  label: 'Región',      value: 'Europa (UE)'           },
                        { Icon: Lock,   label: 'SSL',         value: 'Cifrado extremo a extremo' },
                        { Icon: Clock,  label: 'Último build', value: 'Hace 2 min'           },
                      ].map(({ Icon, label, value }) => (
                        <div key={label} className="flex items-center gap-2 text-[11px]">
                          <Icon size={11} className="text-muted-foreground/60 shrink-0" />
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-semibold text-foreground ml-auto text-right">{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* URL */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">URL de producción</span>
                      <div className="flex items-center gap-2 bg-muted/40 border border-border/60 rounded-lg px-3 py-2">
                        <Lock size={10} className="text-emerald-500 shrink-0" />
                        <span className="flex-1 text-[11px] font-mono text-foreground truncate">
                          {user?.siteDomain || previewUrl || 'Sin asignar'}
                        </span>
                        <button onClick={copyUrl} className="text-muted-foreground hover:text-violet-500 transition-colors cursor-pointer shrink-0">
                          {copiedUrl
                            ? <CheckCheck size={11} className="text-emerald-500" />
                            : <Copy size={11} />}
                        </button>
                      </div>
                    </div>

                    {/* Abrir en nueva pestaña */}
                    {previewUrl && (
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-500 text-[11px] font-bold hover:bg-violet-500/20 transition-colors cursor-pointer"
                      >
                        <ExternalLink size={11} /> Abrir web en nueva pestaña
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Handle 1: entre sidebar y chat */}
          {showSidebar && (
            <div
              className="relative w-4 shrink-0 cursor-col-resize group/handle z-50 flex items-center justify-center"
              onMouseDown={startSidebarResize}
            >
              {/* Línea central */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-px w-px bg-border transition-colors duration-150 group-hover/handle:bg-violet-500/60" />
              {/* Grip dots — aparecen al hover */}
              <div className="relative z-10 flex flex-col gap-[3.5px] opacity-0 group-hover/handle:opacity-100 transition-opacity duration-150 bg-card border border-border/80 rounded-full px-1 py-1.5 shadow-sm">
                {[0,1,2,3,4].map(i => (
                  <span key={i} className="block w-[3px] h-[3px] rounded-full bg-violet-400" />
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════
              COLUMNA CHAT
          ══════════════════════════════════════ */}
          <div
            className="shrink-0 flex flex-col bg-background overflow-hidden border-r border-border"
            style={{ width: chatWidth }}
          >
            {/* Cabecera del chat */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0 bg-card">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-sm">
                  <Sparkles size={12} color="#fff" />
                </div>
                <div>
                  <div className="text-[12.5px] font-bold text-foreground leading-none">Avialo AI</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] text-muted-foreground">Diseñador de webs</span>
                  </div>
                </div>
              </div>
              {/* Badge de créditos en la cabecera */}
              <div className={cn(
                'flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border',
                userCredits <= 5
                  ? 'text-red-500 border-red-500/30 bg-red-500/10'
                  : userCredits <= 15
                    ? 'text-amber-500 border-amber-500/30 bg-amber-500/10'
                    : 'text-violet-500 border-violet-500/30 bg-violet-500/10'
              )}>
                <Zap size={9} className={userCredits <= 5 ? 'fill-red-500' : userCredits <= 15 ? 'fill-amber-500' : 'fill-violet-500'} />
                {userCredits} créditos
              </div>
            </div>

            {/* Hilo de mensajes */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
              {chatMessages.map(msg =>
                msg.sender === 'user'
                  ? <UserMessage key={msg.id} message={msg} />
                  : <AIMessage key={msg.id} message={msg} />
              )}

              {/* Estado vacío: tutorial + sugerencias */}
              {chatMessages.length === 1 && (
                <div className="space-y-4 pt-1">

                  {/* Tutorial colapsable */}
                  <AnimatePresence>
                    {showTutorial && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-500/8 to-transparent p-4"
                      >
                        <button
                          onClick={handleHideTutorial}
                          className="absolute top-2.5 right-2.5 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                        <div className="flex items-center gap-2 mb-2.5">
                          <Sparkles size={11} className="text-violet-500" />
                          <span className="text-[10.5px] font-extrabold text-foreground uppercase tracking-wider">
                            Guía de prompts
                          </span>
                        </div>
                        <div className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                          <p><strong className="text-foreground">1. Agrupa los cambios:</strong> varios a la vez = 1 crédito.</p>
                          <p><strong className="text-foreground">2. Sé específico:</strong> colores exactos, secciones concretas.</p>
                          <p><strong className="text-foreground">3. Evita lo abstracto:</strong> "hazlo más chulo" gasta créditos sin garantías.</p>
                        </div>
                        <button
                          onClick={handleHideTutorial}
                          className="mt-3 text-[10px] font-bold text-violet-500 hover:underline cursor-pointer"
                        >
                          Entendido →
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Cards de sugerencias */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                        Sugerencias
                      </span>
                      {!showTutorial && (
                        <button onClick={() => setShowTutorial(true)} className="text-[9.5px] font-bold text-violet-500 hover:underline cursor-pointer">
                          Ver guía
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: '➕', title: 'Nueva sección',  desc: 'Añade una sección de FAQ debajo de los servicios.' },
                        { icon: '🎨', title: 'Cambiar diseño', desc: 'Cambia a paleta oscura y corporativa.' },
                        { icon: '✍️', title: 'Editar textos',  desc: 'Reescribe el hero para mayor conversión.' },
                        { icon: '⚡', title: 'Añadir función', desc: 'Inserta formulario con Nombre, Email y Teléfono.' },
                      ].map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setPromptText(s.desc)}
                          className="text-left p-3 rounded-xl border border-border bg-card hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group cursor-pointer"
                        >
                          <span className="text-lg mb-1 block">{s.icon}</span>
                          <span className="text-[11px] font-bold text-foreground group-hover:text-violet-500 transition-colors block leading-tight">
                            {s.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-snug mt-0.5 block">
                            {s.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="text-center text-[9px] text-muted-foreground/50 italic mt-2">
                      Haz clic para usar · 1 crédito por mensaje
                    </p>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Terminal colapsable */}
            <div className="border-t border-border/60 flex flex-col overflow-hidden bg-[#05050a] shrink-0">
              <button
                className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => setShowTerminal(t => !t)}
              >
                <div className="flex items-center gap-2">
                  <Terminal size={11} className="text-zinc-600" />
                  <span className="text-[9px] font-extrabold tracking-widest uppercase text-zinc-600">Terminal</span>
                  {logs.length > 0 && (
                    <span className="px-1.5 rounded-full bg-violet-500/20 text-violet-400 text-[8.5px] font-bold border border-violet-500/30 leading-[18px]">
                      {logs.length}
                    </span>
                  )}
                </div>
                {showTerminal
                  ? <ChevronDown size={11} className="text-zinc-700" />
                  : <ChevronUp size={11} className="text-zinc-700" />}
              </button>

              <div className={cn(
                'overflow-hidden transition-all duration-300',
                showTerminal ? 'max-h-[180px] opacity-100' : 'max-h-0 opacity-0'
              )}>
                <div className="h-[150px] overflow-y-auto p-3 font-mono text-[10.5px] leading-relaxed text-zinc-500 select-text">
                  {logs.length === 0 ? (
                    <div>
                      <span className="text-zinc-700">avialo@shell ~$ </span>
                      <span className="text-zinc-600">Esperando instrucciones…</span>
                    </div>
                  ) : (
                    logs.slice(-40).map((log, i) => (
                      <div key={i} className={cn(
                        'py-px',
                        (log.includes('✅') || log.includes('éxito')) && 'text-emerald-400',
                        (log.includes('❌') || log.includes('Error')) && 'text-red-400',
                        (log.includes('⚙️') || log.includes('🔧')) && 'text-amber-400',
                        log.includes('🤖') && 'text-violet-400'
                      )}>
                        <span className="text-zinc-700 select-none">$ </span>{log}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>

            {/* Composer — input de chat */}
            <div className="p-3 border-t border-border bg-card shrink-0">
              {/* Barra de créditos */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1 text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">
                  <Zap size={9} className="text-amber-500 fill-amber-500" /> Créditos
                </span>
                <span className={cn(
                  'text-[10px] font-mono font-bold',
                  userCredits <= 5 ? 'text-red-500' : userCredits <= 15 ? 'text-amber-500' : 'text-violet-500'
                )}>
                  {userCredits} / {maxCredits}
                </span>
              </div>
              <Progress
                value={(userCredits / maxCredits) * 100}
                className={cn(
                  'h-1 mb-3 bg-muted/60 rounded-full',
                  userCredits <= 5
                    ? '[&>div]:bg-red-500'
                    : userCredits <= 15
                      ? '[&>div]:bg-amber-500'
                      : '[&>div]:bg-gradient-to-r [&>div]:from-violet-600 [&>div]:to-fuchsia-500'
                )}
              />

              {userCredits <= 5 && (
                <div className="text-[9px] text-red-500 font-bold mb-2 text-center animate-pulse">
                  ⚠️ Créditos casi agotados. Realiza upgrade desde Ajustes.
                </div>
              )}

              {/* Miniaturas de imágenes adjuntas */}
              {attachedImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachedImages.map((img, i) => (
                    <div key={i} className="relative group w-12 h-12 rounded-lg overflow-hidden border border-border">
                      <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setAttachedImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Quitar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {attachError && <p className="text-[10px] text-red-500 font-semibold mb-1.5">{attachError}</p>}

              <form onSubmit={handleSend} className="relative">
                <Textarea
                  className="w-full min-h-[52px] max-h-[140px] text-[13px] py-3 pl-11 pr-12 rounded-2xl border border-border bg-muted/30 focus-visible:ring-1 focus-visible:ring-violet-500/60 focus-visible:border-violet-500/60 resize-none placeholder:text-muted-foreground/40 leading-relaxed"
                  rows={2}
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                  disabled={isSending || status === 'generating' || status === 'building'}
                  placeholder={isSending ? 'Compilando cambios…' : 'Describe los cambios o adjunta tus fotos…'}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleAttach}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isSending}
                  title="Adjuntar imágenes de tu negocio"
                  className="absolute left-2 bottom-2 h-8 w-8 rounded-xl border border-border bg-muted/40 text-muted-foreground hover:text-violet-500 hover:border-violet-500/40 flex items-center justify-center disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ImagePlus size={15} />
                </button>
                <Button
                  type="submit"
                  size="icon"
                  disabled={(!promptText.trim() && attachedImages.length === 0) || isSending}
                  className="absolute right-2 bottom-2 h-8 w-8 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-sm disabled:opacity-30 transition-all cursor-pointer"
                >
                  {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </Button>
              </form>
              <p className="text-center text-[9px] text-muted-foreground/40 mt-2">
                Enter para enviar · Shift+Enter nueva línea · 📎 adjunta tus fotos
              </p>
            </div>
          </div>

          {/* Handle 2: entre chat y preview */}
          <div
            className="relative w-4 shrink-0 cursor-col-resize group/handle z-50 flex items-center justify-center"
            onMouseDown={startChatResize}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-px w-px bg-border transition-colors duration-150 group-hover/handle:bg-violet-500/60" />
            <div className="relative z-10 flex flex-col gap-[3.5px] opacity-0 group-hover/handle:opacity-100 transition-opacity duration-150 bg-card border border-border/80 rounded-full px-1 py-1.5 shadow-sm">
              {[0,1,2,3,4].map(i => (
                <span key={i} className="block w-[3px] h-[3px] rounded-full bg-violet-400" />
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════
              COLUMNA PREVIEW
          ══════════════════════════════════════ */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Barra del navegador */}
            <div className="flex items-center gap-2 px-3 h-11 bg-card border-b border-border shrink-0">
              {/* Traffic lights */}
              <div className="flex gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              </div>

              {/* URL bar */}
              <button
                onClick={copyUrl}
                className="flex-1 max-w-[360px] mx-auto flex items-center gap-2 bg-muted/40 border border-border hover:border-violet-500/40 rounded-lg px-3 py-1.5 text-xs text-muted-foreground font-mono hover:text-foreground transition-colors overflow-hidden cursor-pointer"
              >
                <Lock size={10} className="text-emerald-500 shrink-0" />
                <span className="truncate">{user?.siteDomain || 'localhost:8081'}</span>
                {copiedUrl && <CheckCheck size={10} className="text-emerald-500 shrink-0 ml-auto" />}
              </button>

              {/* Viewport toggle + refresh */}
              <div className="flex items-center gap-0.5 ml-auto shrink-0">
                {[
                  { id: 'desktop', Icon: Monitor,     title: 'Escritorio' },
                  { id: 'tablet',  Icon: Tablet,      title: 'Tablet'     },
                  { id: 'mobile',  Icon: Smartphone,  title: 'Móvil'      },
                ].map(({ id, Icon, title }) => (
                  <button
                    key={id}
                    onClick={() => setPreviewViewport(id)}
                    title={title}
                    className={cn(
                      'h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer',
                      previewViewport === id
                        ? 'bg-violet-500/10 text-violet-500'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    <Icon size={13} />
                  </button>
                ))}
                <button
                  // Reasignar src a sí mismo fuerza la recarga del iframe; funciona
                  // también con previews cross-origin (contentWindow.reload lanzaría error).
                  // eslint-disable-next-line no-self-assign
                  onClick={() => { if (iframeRef.current) iframeRef.current.src = iframeRef.current.src; }}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer ml-0.5"
                  title="Refrescar"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            {/* Iframe con viewport ajustable */}
            <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-900 overflow-auto flex items-start justify-center">
              <div
                className="h-full bg-white transition-[width] duration-300 shadow-lg"
                style={{
                  width: previewViewport === 'desktop' ? '100%' : previewViewport === 'tablet' ? '768px' : '375px',
                  minHeight: '100%',
                }}
              >
                {previewUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    title="Preview"
                    className="w-full h-full border-none"
                    style={{ pointerEvents: isResizing ? 'none' : 'auto' }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background text-muted-foreground p-6">
                    <Globe size={36} className="mb-3 opacity-40 text-violet-500 animate-pulse" />
                    <div className="text-sm font-semibold text-foreground">Conectando con el contenedor…</div>
                    <div className="text-xs mt-1.5 text-muted-foreground">Esto puede tardar unos segundos</div>
                  </div>
                )}

                {/* Overlay de compilación */}
                <AnimatePresence>
                  {status !== 'deployed' && status !== 'failed' && previewUrl && (
                    <motion.div
                      key="overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center z-20 backdrop-blur-sm"
                    >
                      <motion.div
                        animate={{ rotate: [0, 4, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-[0_16px_40px_rgba(124,58,237,0.35)]"
                      >
                        <Zap size={24} className="text-white" />
                      </motion.div>
                      <div className="text-sm font-extrabold text-foreground mt-4">Compilando cambios…</div>
                      <div className="text-xs text-muted-foreground mt-1.5">El preview se actualizará automáticamente</div>
                      <div className="w-[220px] mt-6">
                        <Progress
                          value={progress}
                          className="h-1.5 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-violet-600 [&>div]:to-fuchsia-500 rounded-full"
                        />
                      </div>
                      <div className="text-[11px] font-mono text-violet-500 mt-2 font-bold">{progress}%</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          MODALS
      ══════════════════════════════════════ */}

      {/* Visor de código */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedFile(null)}
          >
            <motion.div
              className="w-full max-w-[820px] max-h-[85vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0 bg-muted/20">
                <div className="flex items-center gap-2">
                  <FileIcon name={selectedFile.split('/').pop() || ''} size={14} />
                  <span className="font-mono text-xs text-muted-foreground">{selectedFile}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => setSelectedFile(null)}>
                  <X size={14} />
                </Button>
              </div>
              <div className="flex-1 overflow-auto bg-[#040408] p-5">
                {loadingContent ? (
                  <div className="flex items-center justify-center h-32 gap-2 text-zinc-500 text-xs">
                    <Loader2 size={13} className="text-violet-500 animate-spin" /> Cargando…
                  </div>
                ) : (
                  <pre className="m-0 font-mono text-[12px] leading-relaxed text-cyan-300 whitespace-pre overflow-x-auto">
                    {fileContent}
                  </pre>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal insertar fila en BD */}
      <AnimatePresence>
        {showInsertModal && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowInsertModal(false)}
          >
            <motion.div
              className="w-full max-w-[480px] bg-card border border-border rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Database size={13} className="text-violet-500" />
                  </div>
                  <span className="font-bold text-sm text-foreground">
                    Insertar en <span className="text-violet-500">{selectedTable}</span>
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => setShowInsertModal(false)}>
                  <X size={14} />
                </Button>
              </div>

              <form onSubmit={handleInsertRow} className="space-y-3.5">
                {headers.filter(h => h !== 'id').map(field => (
                  <div key={field} className="space-y-1">
                    <Label htmlFor={field} className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      {field}
                    </Label>
                    <Input
                      id={field}
                      type="text"
                      required
                      placeholder={`Valor para ${field}…`}
                      value={newRowData[field] || ''}
                      onChange={e => setNewRowData(p => ({ ...p, [field]: e.target.value }))}
                      className="h-9 rounded-xl border-border bg-muted/30 focus-visible:ring-1 focus-visible:ring-violet-500 text-sm"
                    />
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button" variant="outline"
                    onClick={() => setShowInsertModal(false)}
                    className="flex-1 h-10 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-sm cursor-pointer"
                  >
                    Insertar fila
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
