"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { businessConfig } from "@/config/business";
import { useCart } from "@/lib/cart-context";

export function SiteHeader() {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-foreground"
          >
            {businessConfig.name}
          </Link>
        </div>

        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="hidden sm:block text-sm font-medium hover:text-primary transition-colors"
          >
            Inicio
          </Link>
          <Link
            href="/productos"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Catálogo
          </Link>
          <Link
            href="/carrito"
            className="relative rounded-xl border border-border bg-background p-2.5 hover:border-primary text-foreground hover:text-primary transition-all flex items-center justify-center active:scale-95 shadow-sm"
            aria-label="Carrito"
          >
            <ShoppingBag size={18} />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 bg-primary text-[10px] font-black text-primary-foreground flex items-center justify-center rounded-full border border-background">
                {totalItems}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
