"use client";

import { useEffect, useState } from "react";

export function CookieBanner() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setIsOpen(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setIsOpen(false);
  };

  const rejectCookies = () => {
    localStorage.setItem("cookie-consent", "rejected");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background p-4 shadow-lg md:flex md:items-center md:justify-between md:gap-4 md:px-8">
      <div className="text-sm text-muted-foreground max-w-3xl">
        <p className="font-medium text-foreground">Aviso sobre Cookies 🍪</p>
        <p className="mt-1">
          Utilizamos cookies propias y de terceros para analizar su navegación con fines estadísticos y de rendimiento. 
          Puede aceptar todas las cookies o rechazar su uso. Para más información, consulte nuestra{" "}
          <a href="/cookies" className="text-primary underline hover:text-primary/80">
            Política de Cookies
          </a>.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
        <button
          onClick={rejectCookies}
          className="rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-muted transition-colors"
        >
          Rechazar
        </button>
        <button
          onClick={acceptCookies}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          Aceptar todas
        </button>
      </div>
    </div>
  );
}
