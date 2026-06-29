import { redirect } from "next/navigation";
import Link from "next/link";
import { Inter } from "next/font/google";
import { Store, ExternalLink } from "lucide-react";
import { auth } from "@/auth";
import { businessConfig } from "@/config/business";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUserMenu } from "@/components/admin/AdminUserMenu";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";

// Inter: la tipografía exacta de Medusa Admin (cargada solo en el panel).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Panel del DUEÑO de la tienda. Gate de sesión admin (defensa en profundidad además del
// middleware). Chrome propia estilo Medusa Admin (tema neutro `.admin-theme`).
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    redirect("/login");
  }

  const name = session.user?.name || "";
  const email = session.user?.email || "";

  return (
    <div
      className={`${inter.className} admin-theme flex-1 flex flex-col md:flex-row bg-ui-bg-subtle text-ui-fg-base`}
    >
      {/* Sidebar fijo — solo escritorio. En móvil se sustituye por el drawer (hamburguesa). */}
      <aside className="hidden md:flex md:w-[220px] shrink-0 border-r border-ui-border-base bg-ui-bg-subtle flex-col">
        <div className="flex items-center gap-2.5 px-4 h-[57px] border-b border-ui-border-base">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ui-bg-base border border-ui-border-base shadow-elevation-card-rest text-ui-fg-base">
            <Store className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block font-medium tracking-tight text-ui-fg-base truncate text-sm leading-tight">
              {businessConfig.name}
            </span>
            <span className="block text-xs text-ui-fg-subtle leading-tight">Panel de tienda</span>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <AdminNav />
        </div>
        <div className="border-t border-ui-border-base p-3">
          <AdminUserMenu name={name} email={email} />
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[57px] shrink-0 border-b border-ui-border-base bg-ui-bg-base flex items-center gap-3 px-4 sm:px-6">
          {/* Izquierda: hamburguesa + marca (solo móvil). */}
          <div className="flex items-center gap-2.5 min-w-0 md:hidden">
            <AdminMobileNav name={name} email={email} />
            <span className="block font-medium tracking-tight text-ui-fg-base truncate text-sm">
              {businessConfig.name}
            </span>
          </div>

          {/* Derecha. */}
          <div className="flex items-center gap-4 ml-auto">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ui-fg-subtle hover:text-ui-fg-base transition-colors"
            >
              <span className="hidden sm:inline">Ver tienda</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
