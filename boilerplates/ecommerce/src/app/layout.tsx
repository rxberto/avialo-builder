import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { businessConfig } from "@/config/business";
import { hexToHslChannels } from "@/lib/brand";

const inter = Inter({ subsets: ["latin"] });

// El cliente puede fijar title/description desde el panel ⚙️; si no, se derivan del negocio.
const siteTitle =
  businessConfig.seo?.title?.trim() || `${businessConfig.name} | Tienda online`;
const siteDescription =
  businessConfig.seo?.description?.trim() ||
  `Compra online en ${businessConfig.name}${businessConfig.city ? ` · ${businessConfig.city}` : ""}. Envíos a toda España con pago seguro.`;

const brandHsl =
  hexToHslChannels(businessConfig.theme.primaryColor) || "221.2 83.2% 53.3%";
const brandVars = { "--primary": brandHsl, "--ring": brandHsl } as React.CSSProperties;

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  metadataBase: new URL("https://avialo.app"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    locale: "es_ES",
  },
};

// Layout RAÍZ: solo html/body + marca. La chrome del storefront vive en (store)/layout y el
// panel del dueño en admin/layout, así /admin y /login no arrastran la cabecera de la tienda.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full scroll-smooth">
      <body
        style={brandVars}
        className={`${inter.className} min-h-full flex flex-col bg-background text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
