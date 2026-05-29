import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobSSE } from '../lib/useJobSSE';
import {
  Globe, Terminal, Database, RefreshCw, Send,
  ArrowLeft, ExternalLink, Sparkles, Plus, Trash2,
  Code, FileCode, Folder, Loader2, FileText,
  ChevronDown, ChevronUp, Sun, Moon, Zap, X,
  Settings2
} from 'lucide-react';
import { getSandboxFiles, getSandboxFileContent, editJob } from '../lib/api';

// Shadcn UI Imports
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '../lib/utils';

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

/** Pill status badge using Shadcn Badge component */
function StatusBadge({ status, progress }) {
  if (status === 'deployed') return (
    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 gap-1.5 py-1 px-3 rounded-full font-bold">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
      En Línea
    </Badge>
  );
  if (status === 'failed') return (
    <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive gap-1.5 py-1 px-3 rounded-full font-bold">
      <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
      Error
    </Badge>
  );
  return (
    <Badge variant="outline" className="border-violet-500/20 bg-violet-500/10 text-violet-500 gap-1.5 py-1 px-3 rounded-full font-bold">
      <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-[ping_1.2s_infinite]" />
      Compilando {progress}%
    </Badge>
  );
}

/** Single chat bubble using Shadcn Card component */
function ChatBubble({ message }) {
  const isUser = message.sender === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
        isUser 
          ? "bg-muted text-muted-foreground border-border" 
          : "bg-violet-500/10 text-violet-500 border-violet-500/20"
      )}>
        {isUser ? <FileText className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
      </div>

      {/* Bubble Card */}
      <Card className={cn(
        "max-w-[85%] py-3 px-4 rounded-2xl shadow-sm text-sm border",
        isUser 
          ? "bg-violet-600 border-violet-500 text-white rounded-tr-none ml-auto" 
          : "bg-card border-border text-foreground rounded-tl-none mr-auto"
      )}>
        <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
        {message.isGenerating && (
          <div className="flex gap-1 mt-2.5 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        <time className={cn(
          "block mt-1.5 text-[10px]",
          isUser ? "text-violet-200" : "text-muted-foreground"
        )}>{message.timestamp}</time>
      </Card>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   INITIAL DB DATA (simulated)
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
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function IDEPage({ jobId, user, onReset, darkMode, toggleTheme }) {
  const { logs, status, progress, previewUrl } = useJobSSE(jobId);

  /* ── Panel Resizing States & Handlers ── */
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [chatWidth, setChatWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const startSidebarResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const doResize = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(200, Math.min(480, startWidth + deltaX));
      setSidebarWidth(newWidth);
    };

    const stopSidebarResize = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopSidebarResize);
    };

    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopSidebarResize);
  };

  const startChatResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = chatWidth;

    const doResize = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(300, Math.min(800, startWidth + deltaX));
      setChatWidth(newWidth);
    };

    const stopChatResize = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopChatResize);
    };

    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopChatResize);
  };

  /* ── Advanced sidebar ── */
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('files'); // 'files' | 'db'

  /* ── File explorer ── */
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);

  /* ── Terminal ── */
  const [showTerminal, setShowTerminal] = useState(false);
  const logsEndRef = useRef(null);

  /* ── Chat ── */
  const [promptText, setPromptText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatMessages, setChatMessages] = useState([{
    id: 'welcome',
    sender: 'ai',
    text: '¡Hola! Soy tu asistente de diseño IA. Dime qué cambios quieres hacer en tu web: colores, textos, secciones, botones… ¡lo que necesites!',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }]);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  /* ── Database ── */
  const dbCat = user?.siteType === 'ecommerce' ? 'ecommerce' : 'corporativa';
  const dbConfig = INITIAL_DB[dbCat];
  const [selectedTable, setSelectedTable] = useState(dbConfig.tables[0]);
  const [dbData, setDbData] = useState(dbConfig.data);
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [newRowData, setNewRowData] = useState({});

  /* ── DB computed ── */
  const activeRows = dbData[selectedTable] || [];
  const headers = activeRows.length > 0 ? Object.keys(activeRows[0]) : [];

  /* ── Load files ── */
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

  /* ── File select ── */
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

  /* ── Auto-scroll ── */
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => { if (showTerminal) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs, showTerminal]);

  /* ── Send chat ── */
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!promptText.trim() || isSending) return;
    const text = promptText.trim();
    setPromptText('');
    setIsSending(true);
    const aiId = `ai-${Date.now()}`;

    setChatMessages(prev => [...prev,
      { id: `u-${Date.now()}`, sender: 'user', text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      { id: aiId, sender: 'ai', text: 'Analizando tu proyecto y aplicando los cambios…', isGenerating: true, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);

    // Show terminal automatically when building
    setShowTerminal(true);

    try {
      await editJob(jobId, text);
    } catch (err) {
      setChatMessages(prev => prev.map(m => m.id === aiId
        ? { ...m, text: `❌ Error: ${err.message}`, isGenerating: false }
        : m));
      setIsSending(false);
    }
  };

  /* ── SSE status → finish AI bubble ── */
  useEffect(() => {
    if (status === 'deployed' && isSending) {
      setIsSending(false);
      setChatMessages(prev => prev.map(m => m.isGenerating
        ? { ...m, text: '✅ ¡Cambios aplicados! La preview se ha actualizado automáticamente.', isGenerating: false }
        : m));
      loadFiles();
    } else if (status === 'failed' && isSending) {
      setIsSending(false);
      setChatMessages(prev => prev.map(m => m.isGenerating
        ? { ...m, text: '⚠️ La compilación falló. Revisa la terminal para más detalles.', isGenerating: false }
        : m));
    }
  }, [status]);

  /* ── DB ops ── */
  const handleInsertRow = (e) => {
    e.preventDefault();
    const row = { id: Date.now() % 10000, ...newRowData };
    setDbData(prev => ({ ...prev, [selectedTable]: [row, ...prev[selectedTable]] }));
    setShowInsertModal(false);
    setNewRowData({});
  };
  const handleDeleteRow = (id) => {
    setDbData(prev => ({ ...prev, [selectedTable]: prev[selectedTable].filter(r => r.id !== id) }));
  };

  const iframeRef = useRef(null);

  return (
    <>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground select-none">

        {/* ──────────────── HEADER ──────────────── */}
        <header className="flex items-center justify-between h-[52px] px-4 bg-card border-b border-border shrink-0 z-10">
          {/* Left: Back + Project name */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-muted-foreground border-border bg-card hover:bg-accent cursor-pointer"
              onClick={onReset}
              title="Volver al dashboard"
            >
              <ArrowLeft size={15} />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-md">
                <Sparkles size={13} color="#fff" />
              </div>
              <div>
                <div className="text-[12.5px] font-extrabold text-foreground leading-none">
                  {user?.siteName || 'Proyecto Avialo'}
                </div>
                <div className="text-[9.5px] text-muted-foreground uppercase font-semibold tracking-wider mt-0.5">
                  {user?.siteType || 'corporativa'} · avialo.io
                </div>
              </div>
            </div>
          </div>

          {/* Center: Status Badge */}
          <StatusBadge status={status} progress={progress} />

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Advanced toggle */}
            <Button
              variant={showSidebar ? "secondary" : "outline"}
              size="sm"
              className={cn(
                "gap-1.5 h-8 rounded-full font-semibold border-border text-xs cursor-pointer",
                showSidebar && "bg-violet-500/10 text-violet-500 border-violet-500/20 hover:bg-violet-500/20"
              )}
              onClick={() => setShowSidebar(s => !s)}
            >
              <Settings2 size={13} />
              Avanzado
            </Button>

            {/* Open in tab */}
            <a
              href={previewUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors hover:bg-accent cursor-pointer",
                !previewUrl && "pointer-events-none opacity-35"
              )}
              title="Abrir preview en nueva pestaña"
            >
              <ExternalLink size={14} />
            </a>

            {/* Theme toggle */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-muted-foreground border-border bg-card hover:bg-accent cursor-pointer"
              onClick={toggleTheme}
              title="Cambiar tema"
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </Button>
          </div>
        </header>

        {/* ──────────────── BODY ──────────────── */}
        <div className={cn(
          "flex flex-1 overflow-hidden relative w-full",
          isResizing ? "cursor-col-resize select-none" : ""
        )}>

          {/* ── ADVANCED SIDEBAR ── */}
          <div 
            className={cn(
              "shrink-0 border-r border-border bg-muted/10 flex flex-col overflow-hidden transition-all duration-300",
              showSidebar ? "" : "w-0! opacity-0 pointer-events-none border-r-0"
            )}
            style={{ 
              width: showSidebar ? `${sidebarWidth}px` : 0,
              transition: isResizing ? 'none' : undefined
            }}
          >
            <div className="h-full flex flex-col overflow-hidden" style={{ width: `${sidebarWidth}px` }}>
              <Tabs defaultValue="files" value={sidebarTab} onValueChange={setSidebarTab} className="w-full flex flex-col flex-1 overflow-hidden">
                <TabsList className="grid grid-cols-2 w-full rounded-none border-b border-border bg-muted/20 shrink-0 h-11 p-0">
                  <TabsTrigger 
                    value="files" 
                    className="text-[10px] uppercase font-bold tracking-wider rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-500 h-full bg-transparent hover:bg-muted/10 transition-all cursor-pointer"
                  >
                    <Code size={12} className="mr-1.5" /> Código
                  </TabsTrigger>
                  <TabsTrigger 
                    value="db" 
                    className="text-[10px] uppercase font-bold tracking-wider rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-500 h-full bg-transparent hover:bg-muted/10 transition-all cursor-pointer"
                  >
                    <Database size={12} className="mr-1.5" /> Base de Datos
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex-1 overflow-y-auto p-4">
                  {/* ── Files Tab ── */}
                  {sidebarTab === 'files' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Archivos del proyecto</span>
                        <Button variant="outline" size="icon" className="h-6 w-6 border-border bg-card cursor-pointer" onClick={loadFiles} title="Refrescar">
                          <RefreshCw size={11} />
                        </Button>
                      </div>

                      {loadingFiles ? (
                        <div className="flex gap-2 items-center justify-center py-6 text-muted-foreground text-xs">
                          <Loader2 size={13} className="animate-spin text-violet-500" />
                          Escaneando sandbox…
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {files.map(file => (
                            <Button
                              key={file.path}
                              variant="ghost"
                              className={cn(
                                "w-full justify-start text-xs font-normal h-8 px-2 rounded-lg text-muted-foreground hover:bg-violet-500/5 hover:text-foreground cursor-pointer",
                                file.isDir && "text-foreground font-semibold cursor-default hover:bg-transparent",
                                selectedFile === file.path && "bg-violet-500/10 text-violet-500 font-semibold hover:bg-violet-500/15 hover:text-violet-500"
                              )}
                              style={{ paddingLeft: `${(file.path.split('/').length - 1) * 10 + 8}px` }}
                              onClick={() => !file.isDir && handleSelectFile(file.path)}
                            >
                              {file.isDir
                                ? <Folder size={13} className="text-violet-500 shrink-0 mr-1.5" />
                                : <FileCode size={13} className="shrink-0 mr-1.5 text-muted-foreground" />
                              }
                              <span className="truncate">{file.name}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── DB Tab ── */}
                  {sidebarTab === 'db' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                        <Database size={13} className="text-violet-500" />
                        Postgres · schema_b2b
                      </div>

                      {/* Table selector */}
                      <div className="flex gap-1.5 flex-wrap">
                        {dbConfig.tables.map(t => (
                          <Button
                            key={t}
                            variant={selectedTable === t ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTable(t)}
                            className={cn(
                              "h-7 rounded-full text-[10px] font-bold px-3 border-border cursor-pointer",
                              selectedTable === t && "bg-violet-500/10 text-violet-500 border-violet-500/20 hover:bg-violet-500/15"
                            )}
                          >
                            {t}
                          </Button>
                        ))}
                      </div>

                      {/* Table preview Card */}
                      <Card className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                        <div className="flex justify-between items-center p-3 border-b border-border bg-muted/10">
                          <span className="font-mono text-[10px] text-violet-500 font-bold uppercase">
                            {selectedTable}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowInsertModal(true)}
                            className="flex items-center gap-1 h-6 px-2.5 border-border bg-card text-[10px] font-bold cursor-pointer"
                          >
                            <Plus size={10} /> Insertar
                          </Button>
                        </div>
                        <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                          <table className="w-full border-collapse text-[11px]">
                            <thead>
                              <tr className="border-b border-border">
                                {headers.map(h => (
                                  <th key={h} className="p-2.5 text-left text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap">
                                    {h}
                                  </th>
                                ))}
                                <th className="w-8" />
                              </tr>
                            </thead>
                            <tbody>
                              {activeRows.map(row => (
                                <tr key={row.id} className="border-b border-border/40 hover:bg-violet-500/5 transition-colors">
                                  {headers.map(h => (
                                    <td key={h} className="p-2.5 text-muted-foreground max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap" title={String(row[h])}>
                                      {String(row[h])}
                                    </td>
                                  ))}
                                  <td className="p-2 text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteRow(row.id)}
                                      className="w-6 h-6 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground cursor-pointer"
                                    >
                                      <Trash2 size={11} />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </Tabs>
            </div>
          </div>

          {/* Resizer 1: between Sidebar and Chat */}
          {showSidebar && (
            <div 
              className={cn(
                "w-1 cursor-col-resize hover:bg-violet-500/60 active:bg-violet-500 shrink-0 relative z-50 -mx-[2px] transition-colors duration-150 shadow-[0_0_8px_rgba(124,58,237,0)] hover:shadow-[0_0_8px_rgba(124,58,237,0.5)] active:shadow-[0_0_8px_rgba(124,58,237,0.5)]",
                isResizing ? "bg-violet-500 shadow-[0_0_8px_rgba(124,58,237,0.5)]" : "bg-transparent"
              )} 
              onMouseDown={startSidebarResize} 
            />
          )}

          {/* ── CHAT COLUMN ── */}
          <div 
            className="shrink-0 flex flex-col border-r border-border bg-card/50 overflow-hidden z-2"
            style={{ width: `${chatWidth}px` }}
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
              <div ref={chatEndRef} />
            </div>

            {/* Terminal (collapsible) */}
            <div className="border-t border-border bg-[#05050a] flex flex-col overflow-hidden">
              <div
                className="flex items-center justify-between py-2 px-4 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.02] select-none transition-colors"
                onClick={() => setShowTerminal(t => !t)}
              >
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase text-zinc-400">
                  <Terminal size={12} className="text-zinc-400" />
                  Terminal de compilación
                  {logs.length > 0 && (
                    <Badge className="bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/20 py-0.5 px-2 text-[9px] rounded-full">
                      {logs.length}
                    </Badge>
                  )}
                </div>
                {showTerminal ? <ChevronDown size={13} className="text-zinc-500" /> : <ChevronUp size={13} className="text-zinc-500" />}
              </div>

              <div className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                showTerminal ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className="p-3.5 font-mono text-[10.5px] leading-relaxed overflow-y-auto h-40 text-zinc-400 select-text">
                  {logs.length === 0 ? (
                    <div className="text-zinc-600">
                      <span className="text-zinc-700">avialo@shell:~$ </span>
                      Esperando instrucciones del chat…
                    </div>
                  ) : (
                    logs.slice(-40).map((log, i) => (
                      <div key={i} className={cn(
                        (log.includes('✅') || log.includes('éxito')) && "text-emerald-400",
                        (log.includes('❌') || log.includes('Error')) && "text-red-400",
                        (log.includes('⚙️') || log.includes('🔧')) && "text-amber-400",
                        log.includes('🤖') && "text-violet-400"
                      )}>
                        <span className="text-zinc-700 select-none">$ </span>
                        {log}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>

            {/* Input area */}
            <div className="p-4 border-t border-border bg-card shrink-0">
              <form className="flex items-end gap-2" onSubmit={handleSend}>
                <Textarea
                  ref={inputRef}
                  className="flex-1 min-h-[44px] max-h-[140px] rounded-xl border border-border bg-muted/30 focus-visible:ring-1 focus-visible:ring-violet-500 text-sm py-2 px-3 resize-none"
                  rows={1}
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                  disabled={isSending || status === 'generating' || status === 'building'}
                  placeholder={isSending ? 'La IA está compilando tus cambios…' : 'Describe los cambios que quieres hacer…'}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!promptText.trim() || isSending}
                  className="h-11 w-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shrink-0 shadow-[0_4px_16px_rgba(124,58,237,0.3)] transition-all cursor-pointer"
                >
                  {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </Button>
              </form>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground mt-3 py-2 px-3 bg-violet-500/[0.03] dark:bg-violet-500/[0.02] border border-dashed border-violet-500/10 dark:border-violet-500/10 rounded-lg">
                <Sparkles size={11} className="text-violet-500 animate-[pulse_2.5s_infinite_ease-in-out]" />
                <span>La IA comete errores. Revisa y verifica los cambios importantes de tu web.</span>
              </div>
            </div>
          </div>

          {/* Resizer 2: between Chat and Preview */}
          <div 
            className={cn(
              "w-1 cursor-col-resize hover:bg-violet-500/60 active:bg-violet-500 shrink-0 relative z-50 -mx-[2px] transition-colors duration-150 shadow-[0_0_8px_rgba(124,58,237,0)] hover:shadow-[0_0_8px_rgba(124,58,237,0.5)] active:shadow-[0_0_8px_rgba(124,58,237,0.5)]",
              isResizing ? "bg-violet-500 shadow-[0_0_8px_rgba(124,58,237,0.5)]" : "bg-transparent"
            )} 
            onMouseDown={startChatResize} 
          />

          {/* ── PREVIEW COLUMN ── */}
          <div className="flex-1 flex flex-col bg-muted/20 overflow-hidden z-1">
            {/* Browser bar */}
            <div className="flex items-center gap-3 px-4 h-11 bg-card border-b border-border shrink-0">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              </div>
              <div className="flex-1 max-w-[400px] mx-auto bg-muted/40 border border-border rounded-lg py-1 px-3 text-xs text-muted-foreground font-mono flex items-center gap-2 overflow-hidden truncate">
                <Globe size={11} className="shrink-0" />
                <span className="truncate">{user?.siteDomain || 'localhost:8081'}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-md border-border bg-card cursor-pointer"
                onClick={() => { if (iframeRef.current) iframeRef.current.src = iframeRef.current.src; }}
                title="Refrescar preview"
              >
                <RefreshCw size={12} />
              </Button>
            </div>

            {/* Iframe / loading */}
            <div className="flex-1 relative bg-white">
              {previewUrl
                ? <iframe ref={iframeRef} src={previewUrl} title="Preview" style={{ pointerEvents: isResizing ? 'none' : 'auto' }} className="w-full h-full border-none" />
                : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background text-muted-foreground p-6">
                    <Globe size={36} className="mb-3 opacity-40 animate-pulse text-violet-500" />
                    <div className="text-sm font-semibold text-foreground">Conectando con el contenedor…</div>
                    <div className="text-xs mt-1.5 text-muted-foreground">Esto puede tardar unos segundos</div>
                  </div>
                )
              }

              {/* Building overlay */}
              <AnimatePresence>
                {status !== 'deployed' && status !== 'failed' && previewUrl && (
                  <motion.div
                    key="overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/94 flex flex-col items-center justify-center z-20 backdrop-blur-[6px]"
                  >
                    <motion.div
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-[0_16px_40px_rgba(124,58,237,0.35)]"
                    >
                      <Zap size={24} className="text-white" />
                    </motion.div>
                    <div className="text-sm font-extrabold text-foreground mt-4 tracking-wide">
                      Compilando cambios…
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5">
                      El preview se actualizará automáticamente
                    </div>
                    <div className="w-[240px] mt-6">
                      <Progress value={progress} className="h-1.5 bg-muted rounded-full" />
                    </div>
                    <div className="text-[11px] font-mono text-violet-500 mt-2 font-bold">
                      {progress}%
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── MODALS ──────────────── */}

      {/* Code viewer */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            className="fixed inset-0 bg-black/45 backdrop-blur-[4px] z-[100] flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedFile(null)}
          >
            <motion.div
              className="w-full max-w-[800px] max-h-[80vh] flex flex-col bg-card border border-border rounded-2xl p-6 shadow-2xl overflow-hidden"
              initial={{ scale: .96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .96, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <Code size={14} className="text-violet-500" />
                  <span className="font-mono text-xs text-muted-foreground">{selectedFile}</span>
                </div>
                <Button variant="outline" size="icon" className="h-7 w-7 border-border cursor-pointer" onClick={() => setSelectedFile(null)}>
                  <X size={14} />
                </Button>
              </div>
              <div className="flex-1 rounded-xl overflow-auto bg-[#040408] border border-white/[0.02] p-4">
                {loadingContent ? (
                  <div className="flex items-center justify-center h-full gap-2 text-zinc-500 text-xs">
                    <Loader2 size={13} className="text-violet-500 animate-spin" /> Cargando…
                  </div>
                ) : (
                  <pre className="m-0 font-mono text-[12px] leading-relaxed text-cyan-300 overflow-x-auto whitespace-pre">
                    {fileContent}
                  </pre>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insert DB row */}
      <AnimatePresence>
        {showInsertModal && (
          <motion.div
            className="fixed inset-0 bg-black/45 backdrop-blur-[4px] z-[100] flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInsertModal(false)}
          >
            <motion.div
              className="w-full max-w-[520px] bg-card border border-border rounded-2xl p-7 shadow-2xl overflow-hidden"
              initial={{ scale: .96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .96, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-violet-500" />
                  <span className="font-bold text-sm text-foreground">
                    Insertar en {selectedTable}
                  </span>
                </div>
                <Button variant="outline" size="icon" className="h-7 w-7 border-border cursor-pointer" onClick={() => setShowInsertModal(false)}>
                  <X size={14} />
                </Button>
              </div>
              <form onSubmit={handleInsertRow}>
                <div className="space-y-4">
                  {headers.filter(h => h !== 'id').map(field => (
                    <div key={field} className="space-y-1.5">
                      <Label htmlFor={field} className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">
                        {field}
                      </Label>
                      <Input
                        id={field}
                        type="text"
                        required
                        placeholder={`Valor para ${field}…`}
                        value={newRowData[field] || ''}
                        onChange={e => setNewRowData(p => ({ ...p, [field]: e.target.value }))}
                        className="w-full rounded-xl border border-border bg-muted/30 focus-visible:ring-1 focus-visible:ring-violet-500 focus-visible:border-violet-500 text-sm py-2 px-3 h-10"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-6 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInsertModal(false)}
                    className="flex-1 h-11 rounded-xl text-sm font-semibold border-border bg-card cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-11 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)] transition-all cursor-pointer"
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
