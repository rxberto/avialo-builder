import type { Metadata } from "next";
import { Phone, Mail, MapPin } from "lucide-react";
import { businessConfig } from "@/config/business";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: `Contacto | ${businessConfig.name}`,
  description: `Contacta con ${businessConfig.name}. Teléfono, email y dirección.`,
};

export default function ContactoPage() {
  const { phone, email, address } = businessConfig.contact;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Contacto</p>
        <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Hablemos</h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          ¿Tienes una consulta o quieres un presupuesto? Escríbenos y te responderemos lo antes posible.
        </p>
      </div>

      <div className="mt-10 sm:mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Datos de contacto */}
        <div className="space-y-4">
          <a href={`tel:${phone}`} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Phone className="h-5 w-5" /></span>
            <span>
              <span className="block text-sm font-semibold">Teléfono</span>
              <span className="text-sm text-muted-foreground break-all">{phone}</span>
            </span>
          </a>
          <a href={`mailto:${email}`} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="h-5 w-5" /></span>
            <span>
              <span className="block text-sm font-semibold">Email</span>
              <span className="text-sm text-muted-foreground break-all">{email}</span>
            </span>
          </a>
          <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></span>
            <span>
              <span className="block text-sm font-semibold">Dirección</span>
              <span className="text-sm text-muted-foreground">{address}</span>
            </span>
          </div>
        </div>

        {/* Formulario */}
        <ContactForm />
      </div>
    </div>
  );
}
