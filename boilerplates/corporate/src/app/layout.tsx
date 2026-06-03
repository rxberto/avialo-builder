import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { businessConfig } from "@/config/business";
import { SiteHeader } from "./SiteHeader";

const inter = Inter({ subsets: ["latin"] });

const siteTitle = `${businessConfig.name} | ${businessConfig.sector}`;
const siteDescription = `${businessConfig.name}${businessConfig.city ? ` en ${businessConfig.city}` : ""}. ${businessConfig.sector} de confianza. Contacta o reserva online.`;

// Convierte el color de marca (hex) a canales HSL "H S% L%" para alimentar el token --primary
// de Tailwind (bg-primary = hsl(var(--primary))). Así TODA la web usa el color del cliente.
function hexToHslChannels(hex: string): string | null {
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec((hex || "").trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, sat = 0;
  const lig = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = lig > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / d + 2; break;
      default: hue = (r - g) / d + 4;
    }
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(lig * 100)}%`;
}

const brandHsl = hexToHslChannels(businessConfig.theme.primaryColor) || "221.2 83.2% 53.3%";
const brandVars = { "--primary": brandHsl, "--ring": brandHsl } as React.CSSProperties;

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
      <body style={brandVars} className={`${inter.className} min-h-full flex flex-col bg-background text-foreground antialiased`}>
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
