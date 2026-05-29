import { ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-md w-full space-y-8 bg-card border border-border p-8 rounded-3xl shadow-xl">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">Acceso de Usuarios</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Inicia sesión para gestionar tus citas y facturas.
          </p>
        </div>

        {/* Formulario de Login */}
        <form className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                id="email"
                required
                placeholder="ejemplo@correo.com"
                className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                required
                placeholder="••••••••"
                className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
              />
              <label htmlFor="remember-me" className="ml-2 text-muted-foreground">
                Recordarme
              </label>
            </div>
            <Link href="#" className="font-semibold text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Iniciar Sesión <ArrowRight size={16} />
          </button>
        </form>

        <div className="pt-4 border-t border-border text-center text-xs text-muted-foreground">
          <p>
            ¿No tienes cuenta?{" "}
            <Link href="#contacto" className="font-semibold text-primary hover:underline">
              Contacta con nosotros
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
