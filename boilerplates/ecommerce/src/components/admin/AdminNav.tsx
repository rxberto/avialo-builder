"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Layers,
  FolderTree,
  Tags,
  Ticket,
  Settings,
  CreditCard,
} from "lucide-react";
import type { ComponentType } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  soon?: boolean;
}

// Estructura inspirada en Medusa Admin, adaptada al panel del cliente.
const SECTIONS: { title: string | null; items: NavItem[] }[] = [
  {
    title: null,
    items: [
      { href: "/admin", label: "Inicio", icon: LayoutDashboard },
      { href: "/admin/productos", label: "Productos", icon: Package },
      { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
      { href: "/admin/clientes", label: "Clientes", icon: Users },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { href: "/admin/colecciones", label: "Colecciones", icon: Layers },
      { href: "/admin/categorias", label: "Categorías", icon: FolderTree },
      { href: "/admin/etiquetas", label: "Etiquetas", icon: Tags },
      { href: "/admin/descuentos", label: "Descuentos", icon: Ticket },
    ],
  },
  {
    title: "Configuración",
    items: [
      { href: "/admin/pagos", label: "Pagos", icon: CreditCard },
      { href: "/admin/ajustes", label: "Ajustes", icon: Settings },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="space-y-4">
      {SECTIONS.map((section, i) => (
        <div key={i} className="space-y-0.5">
          {section.title && (
            <p className="px-2 pt-2 pb-1.5 text-xs font-medium text-ui-fg-muted">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const Icon = item.icon;
            if (item.soon) {
              return (
                <div
                  key={item.href}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm font-medium text-ui-fg-disabled cursor-not-allowed select-none"
                  title="Próximamente"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={18} /> {item.label}
                  </span>
                  <Badge variant="neutral">Pronto</Badge>
                </div>
              );
            }
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-ui-bg-base text-ui-fg-base shadow-elevation-card-rest"
                    : "text-ui-fg-subtle hover:bg-ui-bg-base-hover hover:text-ui-fg-base"
                )}
              >
                <Icon
                  size={18}
                  className={cn(active ? "text-ui-fg-base" : "text-ui-fg-muted")}
                />{" "}
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
