import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Loader2, ShieldCheck, UserPlus, KeyRound, Trash2, Copy, Check,
  AlertCircle, ExternalLink, Users, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  listStoreUsers, createStoreUser, resetStoreUserPassword,
  updateStoreUser, deleteStoreUser,
} from '@/lib/api';

// Contraseña legible (sin caracteres ambiguos) generada en el cliente para el campo opcional.
function suggestPassword(len = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* el navegador puede bloquear el portapapeles sin https/gesto */ }
      }}
      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
      title={`Copiar ${label}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

/**
 * Panel del IDE para gestionar los usuarios admin de la TIENDA del cliente (tabla User del
 * esquema tenant), sin necesitar la contraseña del panel /admin de su web.
 */
export default function StoreUsers({ siteReady, loginUrl }) {
  const [users, setUsers] = useState([]);
  const [adminCount, setAdminCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(null); // mensaje si la web no está lista

  // Formulario de alta.
  const [form, setForm] = useState({ name: '', email: '', role: 'admin', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [creating, setCreating] = useState(false);

  // Credencial recién generada para mostrar UNA vez (alta o restablecimiento).
  const [reveal, setReveal] = useState(null); // { email, password, isNew }
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!siteReady) { setLoading(false); setBlocked('site'); return; }
    setLoading(true);
    setBlocked(null);
    try {
      const res = await listStoreUsers();
      setUsers(res.users || []);
      setAdminCount(res.adminCount || 0);
    } catch (e) {
      // El backend responde 409 si la web aún no está lista.
      setBlocked('error');
      toast.error('No se pudieron cargar los administradores', { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [siteReady]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) {
      toast.error('Falta el correo');
      return;
    }
    if (form.password && form.password.length < 8) {
      toast.error('La contraseña debe tener 8+ caracteres');
      return;
    }
    setCreating(true);
    try {
      const res = await createStoreUser({
        name: form.name.trim() || undefined,
        email: form.email.trim(),
        role: form.role,
        password: form.password || undefined,
      });
      setUsers((prev) => [res.user, ...prev]);
      if (res.user.role === 'admin') setAdminCount((c) => c + 1);
      setReveal({ email: res.user.email, password: res.password, isNew: true });
      setForm({ name: '', email: '', role: 'admin', password: '' });
      toast.success('Usuario creado', { description: res.user.email });
    } catch (e) {
      toast.error('No se pudo crear', { description: e.message });
    } finally {
      setCreating(false);
    }
  };

  const handleReset = async (u) => {
    setBusyId(u.id);
    try {
      const res = await resetStoreUserPassword(u.id); // sin clave → el backend genera una
      setReveal({ email: u.email, password: res.password, isNew: false });
      toast.success('Contraseña restablecida', { description: u.email });
    } catch (e) {
      toast.error('No se pudo restablecer', { description: e.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleRole = async (u, role) => {
    if (role === u.role) return;
    setBusyId(u.id);
    try {
      const res = await updateStoreUser(u.id, { role });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.user : x)));
      setAdminCount((c) => c + (role === 'admin' ? 1 : -1));
      toast.success('Rol actualizado');
    } catch (e) {
      toast.error('No se pudo cambiar el rol', { description: e.message });
      load(); // revertir el select al estado real
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`¿Eliminar a ${u.name || u.email}? Perderá el acceso al panel.`)) return;
    setBusyId(u.id);
    try {
      await deleteStoreUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      if (u.role === 'admin') setAdminCount((c) => c - 1);
      toast.success('Usuario eliminado');
    } catch (e) {
      toast.error('No se pudo eliminar', { description: e.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 rounded-2xl">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold">Administradores de tu web</h3>
        </div>
        <p className="text-xs text-zinc-500 -mt-2">
          Crea o restablece las cuentas que acceden al panel <code className="font-mono">/admin</code> de
          tu sitio. Útil si has perdido la contraseña: genera una nueva aquí.
        </p>

        {blocked ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {blocked === 'site'
              ? 'Publica tu web primero: cuando esté lista podrás gestionar sus administradores aquí.'
              : 'No se pudo acceder a la base de datos de tu web. Inténtalo de nuevo en unos segundos.'}
          </div>
        ) : (
          <>
            {/* Credencial recién generada (se muestra una sola vez) */}
            {reveal && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  <Check className="w-4 h-4" />
                  {reveal.isNew ? 'Cuenta lista — guarda estos datos ahora' : 'Nueva contraseña — guárdala ahora'}
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Por seguridad solo se muestra esta vez. Úsala para entrar en el panel y cámbiala dentro si quieres.
                </p>
                <div className="grid gap-1.5 text-xs">
                  <div className="flex items-center justify-between gap-3 bg-white/60 dark:bg-zinc-950/50 rounded-lg px-3 py-2">
                    <span className="text-zinc-500">Correo</span>
                    <span className="font-mono font-semibold truncate">{reveal.email}</span>
                    <CopyButton value={reveal.email} label="correo" />
                  </div>
                  <div className="flex items-center justify-between gap-3 bg-white/60 dark:bg-zinc-950/50 rounded-lg px-3 py-2">
                    <span className="text-zinc-500">Contraseña</span>
                    <span className="font-mono font-semibold truncate">{reveal.password}</span>
                    <CopyButton value={reveal.password} label="contraseña" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  {loginUrl && (
                    <a
                      href={loginUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Ir a iniciar sesión <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={() => setReveal(null)}
                    className="ml-auto text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    Entendido, ocultar
                  </button>
                </div>
              </div>
            )}

            {/* Alta de usuario */}
            <form onSubmit={handleCreate} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nombre (opcional)"
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@empresa.com"
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="admin">Administrador (accede al panel)</option>
                  <option value="client">Cliente (sin acceso al panel)</option>
                </select>
                <div className="flex flex-1 items-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Contraseña (vacío = se genera)"
                    className="flex-1 bg-transparent px-3.5 py-2.5 text-sm font-semibold focus:outline-none"
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)} title={showPwd ? 'Ocultar' : 'Mostrar'} className="px-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, password: suggestPassword() })} title="Generar contraseña" className="px-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">
                    Generar
                  </button>
                </div>
                <Button type="submit" disabled={creating} className="gap-2 rounded-xl shrink-0">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Añadir
                </Button>
              </div>
            </form>

            {/* Lista */}
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando administradores…
              </div>
            ) : users.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">Aún no hay usuarios.</p>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{u.name || u.email}</span>
                        {u.role === 'admin' ? (
                          <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline">Cliente</Badge>
                        )}
                      </div>
                      {u.name && <span className="text-[11px] font-mono text-zinc-500">{u.email}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={(e) => handleRole(u, e.target.value)}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-1.5 py-1 text-[11px] font-semibold focus:outline-none disabled:opacity-50"
                        title="Cambiar rol"
                      >
                        <option value="admin">Admin</option>
                        <option value="client">Cliente</option>
                      </select>
                      <button
                        onClick={() => handleReset(u)}
                        disabled={busyId === u.id}
                        title="Restablecer contraseña"
                        className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 disabled:opacity-50"
                      >
                        {busyId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={busyId === u.id}
                        title="Eliminar"
                        className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
