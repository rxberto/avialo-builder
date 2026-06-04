"use client";

import { useState } from "react";
import { Send, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { businessConfig } from "@/config/business";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const forms = businessConfig.forms;
  const formsubmitOn = forms?.provider === "formsubmit" && !!forms?.email;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSending(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      nombre: String(fd.get("nombre") || ""),
      email: String(fd.get("email") || ""),
      telefono: String(fd.get("telefono") || ""),
      mensaje: String(fd.get("mensaje") || ""),
      _subject: `Nuevo mensaje de contacto — ${businessConfig.name}`,
    };

    try {
      if (formsubmitOn) {
        // Envío real al correo del negocio vía FormSubmit (sin backend propio).
        const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(forms!.email)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("No se pudo enviar el mensaje. Inténtalo de nuevo.");
      } else {
        // Sin proveedor configurado: confirmamos la recepción (demo).
        await new Promise((r) => setTimeout(r, 600));
      }
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
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
      {error && (
        <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle className="h-4 w-4" /> {error}</p>
      )}
      <button type="submit" disabled={sending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-60 sm:w-auto">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Enviar mensaje
      </button>
    </form>
  );
}
