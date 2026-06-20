import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users, Globe, Star, Lock, Search, RefreshCw, UserPlus, Trash2,
  ShieldCheck, LogOut, Check, AlertTriangle, Loader2,
  Sun, Moon, Hash, Layers, Coins,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getToken() {
  try {
    const u = JSON.parse(localStorage.getItem('avialo_user') || '{}');
    return u.token || '';
  } catch { return ''; }
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

// Planes canónicos (coinciden con los productos facturables). Se rellena desde el backend
// (/api/admin/plans); esto es solo el fallback si la petición falla.
const FALLBACK_PLANS = [
  { id: 'none', label: 'Sin plan' },
  { id: 'corporativa', label: 'Corporativa (Basic)' },
  { id: 'dinamica', label: 'Dinámica (Pro)' },
  { id: 'ecommerce', label: 'Ecommerce' },
];

// Mapa de estado de la web → estilo del badge (tokens semánticos, light/dark).
const SITE_STATUS = {
  deployed: { label: 'Desplegada', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  generating: { label: 'Generando', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  pending: { label: 'Pendiente', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  failed: { label: 'Error', cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  none: { label: 'Sin web', cls: 'bg-muted text-muted-foreground border-border' },
};

function SiteBadge({ status }) {
  const s = SITE_STATUS[status] || SITE_STATUS.none;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap', s.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', status === 'generating' && 'animate-pulse', {
        deployed: 'bg-emerald-500', generating: 'bg-amber-500', pending: 'bg-blue-500', failed: 'bg-red-500', none: 'bg-muted-foreground/50',
      }[status] || 'bg-muted-foreground/50')} />
      {s.label}
    </span>
  );
}

export default function AdminPage({ user, onLogout, darkMode, toggleTheme }) {
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/login', { replace: true });
  }, [user, navigate]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editCredits, setEditCredits] = useState({});
  const [confirmModal, setConfirmModal] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [createForm, setCreateForm] = useState({
    name: '', email: '', password: '', plan: 'dinamica', aiCredits: 1500, profession: '',
  });
  const [creating, setCreating] = useState(false);
  const [planSaving, setPlanSaving] = useState({}); // { [userId]: true } mientras se guarda

  const showToast = (msg, type = 'success') => {
    if (type === 'error') toast.error(msg);
    else toast.success(msg);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al cargar usuarios');
      const data = await res.json();
      setUsers(data.users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Cargar el catálogo canónico de planes (fallback al constante si falla).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/plans`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.plans) && data.plans.length) setPlans(data.plans);
        }
      } catch { /* mantener fallback */ }
    })();
  }, []);

  const handleUpdatePlan = async (userId, newPlan, userName) => {
    setPlanSaving(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/plan`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ plan: newPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Plan de "${userName}" actualizado a ${newPlan}`);
      fetchUsers();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setPlanSaving(prev => { const n = { ...prev }; delete n[userId]; return n; });
    }
  };

  const handleConfirm = async () => {
    const { type, userId, userName } = confirmModal;
    setConfirmModal(null);

    if (type === 'delete_user') {
      try {
        const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
          method: 'DELETE', headers: authHeaders(),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast(`Usuario "${userName}" eliminado.`);
        fetchUsers();
      } catch (e) { showToast(e.message, 'error'); }
    }

    if (type === 'delete_site') {
      try {
        const res = await fetch(`${API_BASE}/api/admin/users/${userId}/site`, {
          method: 'DELETE', headers: authHeaders(),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast(`Web de "${userName}" eliminada.`);
        fetchUsers();
      } catch (e) { showToast(e.message, 'error'); }
    }
  };

  const handleUpdateCredits = async (userId, userName) => {
    const val = parseInt(editCredits[userId]);
    if (isNaN(val) || val < 0) { showToast('Introduce un número válido', 'error'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/credits`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ credits: val }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast(`Créditos de "${userName}" actualizados a ${val}`);
      fetchUsers();
      setEditCredits(prev => { const n = { ...prev }; delete n[userId]; return n; });
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          ...createForm,
          aiCredits: parseInt(createForm.aiCredits) || 1500,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Usuario "${createForm.email}" creado con plan "${createForm.plan}".`);
      setCreateForm({ name: '', email: '', password: '', plan: 'dinamica', aiCredits: 1500, profession: '' });
      setShowCreateForm(false);
      fetchUsers();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setCreating(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('avialo_user');
    if (onLogout) onLogout();
    navigate('/login', { replace: true });
  };

  const filtered = useMemo(() => users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  ), [users, search]);

  const stats = useMemo(() => [
    { label: 'Total usuarios', val: users.length, Icon: Users, cls: 'text-brand bg-brand/10 border-brand/20' },
    { label: 'Con plan', val: users.filter(u => u.plan && u.plan !== 'none').length, Icon: Star, cls: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    { label: 'Con web', val: users.filter(u => u.siteStatus === 'deployed').length, Icon: Globe, cls: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Sin plan', val: users.filter(u => !u.plan || u.plan === 'none').length, Icon: Lock, cls: 'text-muted-foreground bg-muted border-border' },
  ], [users]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen flex bg-background text-foreground">

      {/* ── Sidebar (escritorio) ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="px-5 py-6 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div className="leading-tight">
            <span className="font-extrabold tracking-tight">Avialo</span>{' '}
            <span className="font-extrabold text-gradient">Admin</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-brand/10 text-brand border border-brand/20 text-sm font-semibold">
            <Users className="w-4 h-4" /> Usuarios
          </div>
        </nav>

        <div className="p-3 space-y-2">
          {toggleTheme && (
            <Button variant="outline" onClick={toggleTheme}
              className="w-full justify-start gap-2 h-9 rounded-xl text-xs font-semibold text-muted-foreground">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {darkMode ? 'Modo claro' : 'Modo oscuro'}
            </Button>
          )}
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-sm font-semibold truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            <Badge variant="secondary" className="mt-2 text-[10px] font-bold">Administrador</Badge>
          </div>
          <Button variant="destructive" onClick={handleLogout}
            className="w-full justify-start gap-2 h-9 rounded-xl text-xs font-semibold">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <main className="flex-1 min-w-0 flex flex-col">

        {/* Cabecera móvil */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand border border-brand/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-extrabold tracking-tight text-sm">Avialo <span className="text-gradient">Admin</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            {toggleTheme && (
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-lg">
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            )}
            <Button variant="destructive" size="icon" onClick={handleLogout} className="rounded-lg">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 sm:p-7 lg:p-8 max-w-[1400px] w-full mx-auto">

          {/* Encabezado */}
          <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-brand tracking-wider uppercase mb-1">
                <Layers className="w-3.5 h-3.5" /> Panel de administración
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Usuarios</h1>
              <p className="text-muted-foreground text-sm mt-1">Gestiona clientes, planes, créditos y webs en tiempo real.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={fetchUsers} disabled={loading}
                className="gap-2 rounded-xl h-9 text-xs font-semibold">
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Actualizar
              </Button>
              <Button onClick={() => setShowCreateForm(true)}
                className="gap-2 rounded-xl h-9 text-xs font-bold bg-brand hover:bg-brand/90 text-white">
                <UserPlus className="w-4 h-4" /> Nuevo usuario
              </Button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {stats.map((s) => (
              <Card key={s.label} className="shadow-sm">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">{s.val}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.label}</p>
                  </div>
                  <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center shrink-0', s.cls)}>
                    <s.Icon className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nombre o email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-9 rounded-xl"
            />
          </div>

          {/* Tabla */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-brand" /> Cargando usuarios…
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          ) : (
            <Card className="shadow-sm p-0 gap-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[820px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Usuario</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Plan</th>
                      <th className="px-4 py-3 font-semibold">Créditos</th>
                      <th className="px-4 py-3 font-semibold">Web</th>
                      <th className="px-4 py-3 font-semibold">Ajustar créditos</th>
                      <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground">
                          No hay usuarios que coincidan.
                        </td>
                      </tr>
                    ) : filtered.map((u) => {
                      const planKnown = plans.some(p => p.id === u.plan);
                      const planValue = planKnown ? u.plan : (u.plan && u.plan !== 'none' ? u.plan : 'none');
                      const creditVal = editCredits[u.id];
                      const creditDisabled = creditVal === '' || creditVal === undefined;
                      return (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          {/* Usuario */}
                          <td className="px-4 py-3">
                            <div className="font-semibold">{u.name}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                              <Hash className="w-3 h-3" />{u.id}
                            </div>
                          </td>
                          {/* Email */}
                          <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">{u.email}</td>
                          {/* Plan */}
                          <td className="px-4 py-3">
                            <Select value={planValue} disabled={planSaving[u.id]}
                              onValueChange={(v) => handleUpdatePlan(u.id, v, u.name)}>
                              <SelectTrigger size="sm" className="w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {!planKnown && u.plan && u.plan !== 'none' && (
                                  <SelectItem value={u.plan}>{u.plan} (legacy)</SelectItem>
                                )}
                                {plans.map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.label || p.id}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          {/* Créditos */}
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center gap-1 font-bold',
                              u.aiCredits < 500 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400')}>
                              <Coins className="w-3.5 h-3.5" />{u.aiCredits}
                            </span>
                          </td>
                          {/* Web */}
                          <td className="px-4 py-3"><SiteBadge status={u.siteStatus} /></td>
                          {/* Ajustar créditos */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Input type="number" min="0" placeholder={String(u.aiCredits)}
                                value={creditVal ?? ''}
                                onChange={(e) => setEditCredits(prev => ({ ...prev, [u.id]: e.target.value }))}
                                className="h-8 w-20 rounded-lg" />
                              <Button size="icon-sm" disabled={creditDisabled}
                                onClick={() => handleUpdateCredits(u.id, u.name)}
                                className="rounded-lg bg-brand hover:bg-brand/90 text-white shrink-0">
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                          {/* Acciones */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {u.siteStatus !== 'none' && (
                                <Button variant="outline" size="sm"
                                  onClick={() => setConfirmModal({ type: 'delete_site', userId: u.id, userName: u.name })}
                                  className="gap-1.5 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
                                  <Globe className="w-3.5 h-3.5" /> Web
                                </Button>
                              )}
                              <Button variant="destructive" size="sm"
                                onClick={() => setConfirmModal({ type: 'delete_user', userId: u.id, userName: u.name })}
                                className="gap-1.5 rounded-lg text-xs font-semibold">
                                <Trash2 className="w-3.5 h-3.5" /> Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* ── Modal: confirmar eliminación ── */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setConfirmModal(null)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  confirmModal.type === 'delete_user' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500')}>
                  {confirmModal.type === 'delete_user' ? <Trash2 className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                </div>
                <h3 className="text-base font-bold">
                  {confirmModal.type === 'delete_user' ? '¿Eliminar usuario?' : '¿Eliminar web?'}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {confirmModal.type === 'delete_user'
                  ? <>Eliminarás permanentemente a <strong className="text-foreground">{confirmModal.userName}</strong>. Esta acción no se puede deshacer.</>
                  : <>La web de <strong className="text-foreground">{confirmModal.userName}</strong> será eliminada. Podrá crear una nueva más adelante.</>}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmModal(null)} className="rounded-xl text-xs font-semibold">
                  Cancelar
                </Button>
                <Button onClick={handleConfirm} className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white">
                  Sí, eliminar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: crear usuario ── */}
      <AnimatePresence>
        {showCreateForm && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCreateForm(false)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-none">Crear nuevo usuario</h3>
                  <p className="text-xs text-muted-foreground mt-1">Se añadirá con el plan y los créditos indicados.</p>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre *</Label>
                    <Input required value={createForm.name} className="h-9 rounded-lg"
                      onChange={(e) => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre completo" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email *</Label>
                    <Input type="email" required value={createForm.email} className="h-9 rounded-lg"
                      onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))} placeholder="email@ejemplo.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contraseña *</Label>
                    <Input type="password" required value={createForm.password} className="h-9 rounded-lg"
                      onChange={(e) => setCreateForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Profesión</Label>
                    <Input value={createForm.profession} className="h-9 rounded-lg"
                      onChange={(e) => setCreateForm(p => ({ ...p, profession: e.target.value }))} placeholder="ej: Diseñador" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Plan</Label>
                    <Select value={createForm.plan} onValueChange={(v) => setCreateForm(p => ({ ...p, plan: v }))}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.label || p.id}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Créditos IA</Label>
                    <Input type="number" min="0" value={createForm.aiCredits} className="h-9 rounded-lg"
                      onChange={(e) => setCreateForm(p => ({ ...p, aiCredits: e.target.value }))} />
                  </div>
                </div>

                <Separator className="bg-border/60" />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}
                    className="rounded-xl text-xs font-semibold">Cancelar</Button>
                  <Button type="submit" disabled={creating}
                    className="gap-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand/90 text-white">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {creating ? 'Creando…' : 'Crear usuario'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
