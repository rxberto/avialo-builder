"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  UserPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Users as UsersIcon,
  User as UserIcon,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PasswordInput } from "@/components/admin/PasswordInput";

type Role = "admin" | "client";
type RoleFilter = "all" | Role;
type SortKey = "role" | "recent" | "old" | "name";

interface PanelUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: string;
}

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

interface FormState {
  name: string;
  email: string;
  password: string;
  role: Role;
}

const EMPTY_FORM: FormState = { name: "", email: "", password: "", role: "admin" };

export function UsersPanel() {
  const [users, setUsers] = useState<PanelUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filtros de la tabla.
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sort, setSort] = useState<SortKey>("role");

  // Drawer de alta/edición. `editing` null ⇒ modo "crear".
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PanelUser | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Confirmación de borrado.
  const [deleting, setDeleting] = useState<PanelUser | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = useCallback((msg: string) => {
    setSuccess(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSuccess(null), 3500);
  }, []);
  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error((await res.json()).error || "No se pudieron cargar los usuarios.");
      }
      const data = (await res.json()) as { users: PanelUser[]; currentUserId: string };
      setUsers(data.users);
      setCurrentUserId(data.currentUserId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const admins = users.filter((u) => u.role === "admin").length;
    return { total: users.length, admins, clients: users.length - admins };
  }, [users]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        (u.name?.toLowerCase().includes(q) ?? false) || u.email.toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "name":
          return (a.name || a.email).localeCompare(b.name || b.email, "es");
        case "recent":
          return b.createdAt.localeCompare(a.createdAt);
        case "old":
          return a.createdAt.localeCompare(b.createdAt);
        case "role":
        default:
          if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
          return a.createdAt.localeCompare(b.createdAt);
      }
    });
    return list;
  }, [users, query, roleFilter, sort]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(u: PanelUser) {
    setEditing(u);
    setForm({ name: u.name ?? "", email: u.email, password: "", role: u.role });
    setFormError(null);
    setFormOpen(true);
  }

  const editingSelf = !!editing && editing.id === currentUserId;

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        // Edición: solo enviamos lo editable (el email es la identidad, no se cambia aquí).
        const body: Record<string, unknown> = { name: form.name };
        if (!editingSelf) body.role = form.role; // nunca cambiamos el rol propio
        if (form.password) body.password = form.password;
        const res = await fetch(`/api/admin/users/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).error || "No se pudo guardar.");
        flash("Cambios guardados.");
      } else {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error || "No se pudo crear el usuario.");
        flash("Usuario creado.");
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/users/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "No se pudo eliminar.");
      setDeleting(null);
      flash("Usuario eliminado.");
      await load();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-md border border-ui-tag-green-border bg-ui-tag-green-bg px-4 py-3 text-sm text-ui-tag-green-text">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox icon={<UsersIcon className="h-4 w-4" />} label="Usuarios" value={stats.total} />
        <StatBox
          icon={<ShieldCheck className="h-4 w-4 text-ui-tag-green-icon" />}
          label="Administradores"
          value={stats.admins}
        />
        <StatBox icon={<UserIcon className="h-4 w-4" />} label="Clientes" value={stats.clients} />
      </div>

      <div className="overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base">
        {/* Barra de herramientas */}
        <div className="flex flex-col gap-3 border-b border-ui-border-base px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-fg-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o correo…"
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
              <SelectTrigger className="w-[140px] flex-1 sm:flex-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
                <SelectItem value="client">Clientes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[140px] flex-1 sm:flex-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="role">Por rol</SelectItem>
                <SelectItem value="recent">Más recientes</SelectItem>
                <SelectItem value="old">Más antiguos</SelectItem>
                <SelectItem value="name">Nombre (A–Z)</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={openCreate} className="shrink-0">
              <UserPlus className="h-4 w-4" /> Añadir
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-6 py-10 text-sm text-ui-fg-subtle">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando usuarios…
          </div>
        ) : visible.length === 0 ? (
          <div className="px-6 py-10 text-sm text-ui-fg-subtle">
            {users.length === 0
              ? "No hay usuarios todavía."
              : "Ningún usuario coincide con la búsqueda."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-ui-fg-base font-medium">
                    <span className="flex items-center gap-2">
                      {u.name || "—"}
                      {u.id === currentUserId && <Badge variant="blue">Tú</Badge>}
                    </span>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge variant="green">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Administrador
                      </Badge>
                    ) : (
                      <Badge variant="neutral">
                        <UserIcon className="mr-1 h-3 w-3" /> Cliente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{dateFmt.format(new Date(u.createdAt))}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Acciones">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openEdit(u)}>
                          <Pencil /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-ui-fg-error [&>svg]:text-ui-fg-error focus:bg-ui-tag-red-bg"
                          disabled={u.id === currentUserId}
                          onSelect={() => {
                            setDeleteError(null);
                            setDeleting(u);
                          }}
                        >
                          <Trash2 /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Drawer de alta / edición */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="p-0">
          <form onSubmit={submitForm} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{editing ? "Editar usuario" : "Añadir usuario"}</SheetTitle>
              <SheetDescription>
                {editing
                  ? "Cambia el nombre, el rol o restablece la contraseña."
                  : "Crea una cuenta para que otra persona acceda al panel."}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {formError && (
                <div className="flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-3 py-2 txt-small text-ui-fg-error">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="u-name">Nombre</Label>
                <Input
                  id="u-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nombre y apellidos"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-email">Correo</Label>
                <Input
                  id="u-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="persona@empresa.com"
                  autoComplete="off"
                  required={!editing}
                  disabled={!!editing}
                />
                {editing && (
                  <p className="txt-small text-ui-fg-muted">El correo no se puede cambiar.</p>
                )}
              </div>

              <PasswordInput
                id="u-password"
                label={editing ? "Nueva contraseña (opcional)" : "Contraseña"}
                value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
                placeholder={editing ? "Dejar en blanco para no cambiarla" : "Mínimo 8 caracteres"}
                required={!editing}
                optionalHint={editing ? "Déjala en blanco para no cambiarla." : undefined}
              />

              <div className="space-y-1.5">
                <Label htmlFor="u-role">Rol</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as Role })}
                  disabled={editingSelf}
                >
                  <SelectTrigger id="u-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador (acceso al panel)</SelectItem>
                    <SelectItem value="client">Cliente (sin acceso al panel)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="txt-small text-ui-fg-muted">
                  {editingSelf
                    ? "No puedes cambiar tu propio rol."
                    : "Solo los administradores pueden entrar a este panel."}
                </p>
              </div>
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing ? "Guardar cambios" : "Crear usuario"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Confirmación de borrado */}
      <Sheet open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <SheetContent side="bottom" className="inset-x-0 bottom-0 mx-auto max-w-md rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Eliminar usuario</SheetTitle>
            <SheetDescription>
              {deleting && (
                <>
                  ¿Seguro que quieres eliminar a <strong>{deleting.name || deleting.email}</strong>?
                  Perderá el acceso al panel. Esta acción no se puede deshacer.
                </>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 py-5">
            {deleteError && (
              <div className="flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-3 py-2 txt-small text-ui-fg-error">
                <AlertCircle className="h-4 w-4 shrink-0" /> {deleteError}
              </div>
            )}
          </div>
          <SheetFooter>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeleting(null)}
              disabled={deleteBusy}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={deleteBusy}
            >
              {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base px-4 py-3">
      <div className="flex items-center gap-2 text-ui-fg-subtle">
        {icon}
        <span className="txt-compact-small">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold text-ui-fg-base">{value}</p>
    </div>
  );
}
