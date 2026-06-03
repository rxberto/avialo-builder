"use client";

import { useState } from "react";
import { Send, CheckCircle2, Loader2 } from "lucide-react";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // TODO (backend): enviar a la API real. De momento confirmamos la recepción.
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 700);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-primary" />
        <h3 className="mt-4 text-lg font-semibold">¡Mensaje enviado!</h3>
        <p className="mt-2 text-sm text-muted-foreground">Te responderemos lo antes posible. Gracias por contactar con nosotros.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium">Nombre</label>
          <input id="nombre" name="nombre" required
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label htmlFor="telefono" className="block text-sm font-medium">Teléfono</label>
          <input id="telefono" name="telefono" type="tel"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" required
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
      </div>
      <div>
        <label htmlFor="mensaje" className="block text-sm font-medium">Mensaje</label>
        <textarea id="mensaje" name="mensaje" rows={4} required
          className="mt-1.5 w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
      </div>
      <button type="submit" disabled={sending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-60 sm:w-auto">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Enviar mensaje
      </button>
    </form>
  );
}
