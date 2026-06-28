import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { businessConfig } from "@/config/business";
import { CartProvider } from "@/lib/cart-context";
import { SiteHeader } from "@/components/SiteHeader";
import { CookieBanner } from "@/components/CookieBanner";
import { getStoreSettings, storeConfigured } from "@/lib/tenantApi";

// Lee los ajustes de la tienda (Medusa) y los fusiona con la config del negocio:
// si el dueño los ha rellenado en el panel ⚙️ de la tienda, mandan; si no, caemos
// a businessConfig (la fuente histórica). Best-effort: cualquier fallo → fallback.
async function resolveStoreInfo() {
  const fallback = {
    name: businessConfig.name,
    email: businessConfig.contact.email,
    phone: businessConfig.contact.phone,
  };
  if (!storeConfigured()) return fallback;
  try {
    const s = await getStoreSettings();
    return {
      name: s.storeName || fallback.name,
      email: s.contactEmail || fallback.email,
      phone: s.contactPhone || fallback.phone,
    };
  } catch {
    return fallback;
  }
}

// Chrome de la TIENDA (cabecera con carrito + footer comercial/legal). Solo envuelve las
// páginas de cara al cliente final; el panel del dueño (/admin) usa su propio layout.
export default async function StoreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await resolveStoreInfo();
  return (
    <CartProvider>
      <SiteHeader />

      <main className="flex-1 flex flex-col">{children}</main>

      <footer className="w-full border-t border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <span className="font-bold text-foreground">{store.name}</span>
              <p className="text-xs text-muted-foreground leading-relaxed mt-3">
                Tu comercio de confianza. Envíos y devoluciones a nivel nacional.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Ayuda y soporte
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <a
                    href={`mailto:${store.email}`}
                    className="hover:text-primary transition-colors"
                  >
                    {store.email}
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${store.phone}`}
                    className="hover:text-primary transition-colors"
                  >
                    {store.phone}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Pago seguro
              </h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span>Pasarela 100% segura con Stripe y cifrado SSL.</span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} {store.name} | CIF: {businessConfig.cif}.
              Todos los derechos reservados.
            </p>
            <nav className="flex gap-6">
              <Link href="/aviso-legal" className="hover:text-primary transition-colors">
                Aviso Legal
              </Link>
              <Link href="/privacidad" className="hover:text-primary transition-colors">
                Privacidad
              </Link>
              <Link href="/cookies" className="hover:text-primary transition-colors">
                Cookies
              </Link>
            </nav>
          </div>
        </div>
      </footer>

      <CookieBanner />
    </CartProvider>
  );
}
