"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Email o contraseña incorrectos.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-md w-full space-y-8 bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Acceso de Usuarios</h2>
          <p className="mt-2 text-sm text-muted-foreground">Inicia sesión para gestionar tus citas.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
            <input type="email" id="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ejemplo@correo.com"
              className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Contraseña</label>
            <input type="password" id="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Iniciar Sesión
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
