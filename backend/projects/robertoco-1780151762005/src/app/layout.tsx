import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Empresa Genérica | Servicios Profesionales",
  description: "Servicios profesionales personalizados de alta calidad. Tu socio de confianza.",
  metadataBase: new URL("https://avialo.app"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Empresa Genérica | Servicios Profesionales",
    description: "Servicios profesionales personalizados de alta calidad.",
    type: "website",
    locale: "es_ES",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full scroll-smooth">
      <body className={`${inter.className} min-h-full flex flex-col bg-background text-foreground antialiased`}>
        {/* Header Global */}
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <Link href="/" className="text-xl font-bold tracking-tight">
                [NOMBRE_EMPRESA]
              </Link>
            </div>
            
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
                Inicio
              </Link>
              <Link href="/#servicios" className="text-sm font-medium hover:text-primary transition-colors">
                Servicios
              </Link>
              <Link href="/#contacto" className="text-sm font-medium hover:text-primary transition-colors">
                Contacto
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all active:scale-95"
              >
                Panel Cliente
              </Link>
            </nav>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Footer Legal (Obligatorio en España) */}
        <footer className="w-full border-t border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} [NOMBRE_EMPRESA] | CIF: [CIF_EMPRESA]. Todos los derechos reservados.</p>
            <nav className="flex gap-6">
              <Link href="/aviso-legal" className="hover:text-primary transition-colors">
                Aviso Legal
              </Link>
              <Link href="/privacidad" className="hover:text-primary transition-colors">
                Política de Privacidad
              </Link>
              <Link href="/cookies" className="hover:text-primary transition-colors">
                Política de Cookies
              </Link>
            </nav>
          </div>
        </footer>

        {/* Banner de Cookies AEPD */}
        <CookieBanner />
      </body>
    </html>
  );
}

// Banner de cookies de comportamiento cliente (Client Component embebido de forma segura)
import { CookieBanner } from "./CookieBanner";
