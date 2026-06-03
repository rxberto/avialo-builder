"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { registerClient } from "@/app/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await registerClient(form);
      if (res?.error) {
        setError(res.error);
        return;
      }
      // Cuenta creada: iniciamos sesión automáticamente.
      const login = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (login?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("No se pudo completar el registro. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-md w-full space-y-8 bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Crea tu cuenta</h2>
          <p className="mt-2 text-sm text-muted-foreground">Regístrate para reservar y gestionar tus citas.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre</label>
            <input type="text" id="name" required value={form.name} onChange={upd("name")} placeholder="Tu nombre"
              className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
            <input type="email" id="email" required value={form.email} onChange={upd("email")} placeholder="ejemplo@correo.com"
              className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Contraseña</label>
            <input type="password" id="password" required minLength={6} value={form.password} onChange={upd("password")} placeholder="Mínimo 6 caracteres"
              className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Crear cuenta
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
