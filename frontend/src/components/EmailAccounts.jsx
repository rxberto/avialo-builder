import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail, Plus, Trash2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listEmailAccounts, createEmailAccount, deleteEmailAccount, resetEmailPassword } from '@/lib/api';

/**
 * Panel de gestión de correos corporativos: crear, listar, eliminar y cambiar contraseña.
 */
export default function EmailAccounts({ domain }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localPart, setLocalPart] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const res = await listEmailAccounts();
      setAccounts(res.accounts || []);
    } catch (e) {
      toast.error('No se pudieron cargar los correos', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!localPart.trim() || password.length < 8) {
      toast.error('Datos incompletos', { description: 'Indica un nombre y una contraseña de 8+ caracteres.' });
      return;
    }
    setCreating(true);
    try {
      const res = await createEmailAccount(localPart.trim(), password);
      setAccounts((prev) => [res.account, ...prev]);
      setLocalPart('');
      setPassword('');
      toast.success('Correo creado', { description: res.account.address });
    } catch (e) {
      toast.error('No se pudo crear', { description: e.message });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, address) => {
    try {
      await deleteEmailAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      toast.success('Correo eliminado', { description: address });
    } catch (e) {
      toast.error('No se pudo eliminar', { description: e.message });
    }
  };

  const handleReset = async (id) => {
    const pwd = window.prompt('Nueva contraseña (mínimo 8 caracteres):');
    if (!pwd) return;
    if (pwd.length < 8) {
      toast.error('Contraseña demasiado corta');
      return;
    }
    try {
      await resetEmailPassword(id, pwd);
      toast.success('Contraseña actualizada');
    } catch (e) {
      toast.error('No se pudo cambiar', { description: e.message });
    }
  };

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 rounded-2xl">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <Mail className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold">Correos corporativos</h3>
        </div>

        {!domain ? (
          <p className="text-xs text-zinc-500">Configura primero un dominio para crear buzones de correo.</p>
        ) : (
          <>
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
              <div className="flex flex-1 items-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <input
                  value={localPart}
                  onChange={(e) => setLocalPart(e.target.value)}
                  placeholder="hola"
                  className="flex-1 bg-transparent px-3.5 py-2.5 text-sm font-semibold focus:outline-none"
                />
                <span className="px-3 text-xs font-mono text-zinc-500 shrink-0">@{domain}</span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña (8+)"
                className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
              />
              <Button type="submit" disabled={creating} className="gap-2 rounded-xl">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Crear
              </Button>
            </form>

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando buzones…
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">Aún no has creado ningún buzón.</p>
            ) : (
              <div className="space-y-2">
                {accounts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-mono font-semibold">{a.address}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleReset(a.id)} title="Cambiar contraseña" className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500">
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(a.id, a.address)} title="Eliminar" className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500">
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
