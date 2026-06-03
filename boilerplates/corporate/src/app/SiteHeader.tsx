"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Menu, X } from "lucide-react";
import { businessConfig } from "@/config/business";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/sobre-nosotros", label: "Sobre Nosotros" },
  { href: "/contacto", label: "Contacto" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="text-lg sm:text-xl font-bold tracking-tight truncate max-w-[55vw] sm:max-w-none">
            {businessConfig.name}
          </span>
        </Link>

        {/* Navegación de escritorio */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all active:scale-95"
          >
            Panel Cliente
          </Link>
        </nav>

        {/* Botón hamburguesa (solo móvil) */}
        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-foreground hover:bg-muted transition-colors"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Menú móvil desplegable */}
      {open && (
        <nav className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2 animate-in slide-in-from-top-2">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block rounded-lg bg-primary px-3 py-3 text-center text-base font-semibold text-primary-foreground shadow-md active:scale-[0.98] transition-transform"
              >
                Panel Cliente
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
