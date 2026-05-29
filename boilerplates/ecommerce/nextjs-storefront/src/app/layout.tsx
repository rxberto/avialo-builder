import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { ShoppingBag, Search, ShieldCheck } from "lucide-react";
import { CookieBanner } from "./CookieBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tienda Online Premium | Avialo E-commerce",
  description: "Compra productos exclusivos al mejor precio. Envíos rápidos a toda España con total garantía.",
  metadataBase: new URL("https://avialo.app"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
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
        {/* Navigation Storefront */}
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-primary" />
              <Link href="/" className="text-xl font-black tracking-tight text-foreground">
                [NOMBRE_TIENDA]
              </Link>
            </div>

            {/* Buscador Simple */}
            <div className="hidden md:flex items-center gap-2 max-w-md w-full mx-8 border border-border px-3 py-1.5 rounded-xl bg-muted/30">
              <Search size={16} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar productos o categorías..."
                className="bg-transparent border-none outline-none text-xs w-full text-foreground"
              />
            </div>

            <nav className="flex items-center gap-6">
              <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
                Catálogo
              </Link>
              <Link href="/ofertas" className="text-sm font-medium hover:text-primary transition-colors">
                Ofertas
              </Link>
              {/* Botón de Carrito con indicador */}
              <Link
                href="/carrito"
                className="relative rounded-xl border border-border bg-background p-2.5 hover:border-primary text-foreground hover:text-primary transition-all flex items-center justify-center active:scale-95 shadow-sm"
              >
                <ShoppingBag size={18} />
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-primary text-[10px] font-black text-primary-foreground flex items-center justify-center rounded-full border border-background">
                  0
                </span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Footer Comercial + Legal */}
        <footer className="w-full border-t border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  <span className="font-bold text-foreground">[NOMBRE_TIENDA]</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tu comercio de total confianza. Envíos y devoluciones express a nivel nacional.
                </p>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Ayuda & Soporte</h4>
                <ul className="space-y-2 text-xs">
                  <li><Link href="/soporte" className="hover:text-primary transition-colors">Centro de Soporte</Link></li>
                  <li><Link href="/envios" className="hover:text-primary transition-colors">Envíos y Entregas</Link></li>
                  <li><Link href="/devoluciones" className="hover:text-primary transition-colors">Políticas de Devolución</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Seguridad Garantizada</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <span>Pasarela 100% segura con Stripe y encriptación SSL.</span>
                </div>
              </div>
            </div>
            
            <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <p>© {new Date().getFullYear()} [NOMBRE_TIENDA] | CIF: [CIF_EMPRESA]. Todos los derechos reservados.</p>
              <nav className="flex gap-6">
                <Link href="/aviso-legal" className="hover:text-primary transition-colors">Aviso Legal</Link>
                <Link href="/privacidad" className="hover:text-primary transition-colors">Privacidad</Link>
                <Link href="/cookies" className="hover:text-primary transition-colors">Cookies</Link>
              </nav>
            </div>
          </div>
        </footer>

        {/* Cookie Banner */}
        <CookieBanner />
      </body>
    </html>
  );
}
