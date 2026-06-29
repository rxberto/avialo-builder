"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Store } from "lucide-react";
import { businessConfig } from "@/config/business";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUserMenu } from "@/components/admin/AdminUserMenu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

// Navegación móvil del panel: botón hamburguesa que abre el sidebar como drawer lateral.
// En escritorio el sidebar es fijo (este componente va oculto con `md:hidden`).
export function AdminMobileNav({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar el drawer al cambiar de ruta (tras pulsar un enlace).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Abrir menú"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-base text-ui-fg-base shadow-elevation-card-rest transition-fg hover:bg-ui-bg-base-hover"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[270px] p-0 sm:max-w-[270px]">
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <div className="flex h-full flex-col bg-ui-bg-subtle">
          <div className="flex items-center gap-2.5 px-4 h-[57px] border-b border-ui-border-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ui-bg-base border border-ui-border-base shadow-elevation-card-rest text-ui-fg-base">
              <Store className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium tracking-tight text-ui-fg-base truncate text-sm leading-tight">
                {businessConfig.name}
              </span>
              <span className="block text-xs text-ui-fg-subtle leading-tight">
                Panel de tienda
              </span>
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <AdminNav />
          </div>
          <div className="border-t border-ui-border-base p-3">
            <AdminUserMenu name={name} email={email} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
