"use client";

import { useEffect, useState } from "react";

export function CookieBanner() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setIsOpen(true);
  }, []);

  const decide = (value: "accepted" | "rejected") => {
    localStorage.setItem("cookie-consent", value);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background p-4 shadow-lg md:flex md:items-center md:justify-between md:gap-4 md:px-8">
      <div className="text-sm text-muted-foreground max-w-3xl">
        <p className="font-semibold text-foreground">Aviso sobre Cookies 🍪</p>
        <p className="mt-1">
          Utilizamos cookies para ofrecerte la mejor experiencia de compra. Al
          hacer clic en &quot;Aceptar&quot;, consientes el uso de cookies. Más
          detalles en nuestra{" "}
          <a
            href="/cookies"
            className="text-primary underline hover:text-primary/80"
          >
            Política de Cookies
          </a>
          .
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
        <button
          onClick={() => decide("rejected")}
          className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          Rechazar
        </button>
        <button
          onClick={() => decide("accepted")}
          className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
