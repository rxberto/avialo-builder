import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { businessConfig } from "@/config/business";
import { SiteHeader } from "./SiteHeader";

const inter = Inter({ subsets: ["latin"] });

const siteTitle = `${businessConfig.name} | ${businessConfig.sector}`;
const siteDescription = `${businessConfig.name}${businessConfig.city ? ` en ${businessConfig.city}` : ""}. ${businessConfig.sector} de confianza. Contacta o reserva online.`;

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  metadataBase: new URL("https://avialo.app"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
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
        {/* Header Global responsive (con menú hamburguesa en móvil) */}
        <SiteHeader />

        {/* Contenido Principal */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Footer Legal (Obligatorio en España) */}
        <footer className="w-full border-t border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} {businessConfig.name} | CIF: {businessConfig.cif}. Todos los derechos reservados.</p>
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
