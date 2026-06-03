import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Sparkles, ShieldCheck, Clock, HeartHandshake } from "lucide-react";
import { businessConfig } from "@/config/business";

export const metadata: Metadata = {
  title: `Servicios | ${businessConfig.name}`,
  description: `Descubre los servicios de ${businessConfig.name}, ${businessConfig.sector} de confianza.`,
};

const SERVICES = [
  { icon: Sparkles, title: "Servicio Profesional", desc: "Soluciones a medida con la máxima calidad y atención al detalle." },
  { icon: ShieldCheck, title: "Garantía y Confianza", desc: "Trabajo garantizado y un trato cercano en cada proyecto." },
  { icon: Clock, title: "Rapidez y Puntualidad", desc: "Cumplimos plazos y nos adaptamos a tus necesidades." },
  { icon: HeartHandshake, title: "Atención Personalizada", desc: "Te acompañamos en todo el proceso, de principio a fin." },
];

export default function ServiciosPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Nuestros servicios</p>
        <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
          Todo lo que {businessConfig.name} puede hacer por ti
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Como especialistas en {businessConfig.sector.toLowerCase()}, ofrecemos un servicio integral
          pensado para resolver lo que necesitas con la mejor relación calidad-precio.
        </p>
      </div>

      <div className="mt-10 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {SERVICES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold">¿Por qué elegirnos?</h2>
          <ul className="mt-5 space-y-3">
            {["Profesionales con experiencia", "Presupuesto sin compromiso", "Materiales de primera calidad", "Trato cercano y honesto"].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm sm:text-base">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-center rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-bold">¿Hablamos de tu proyecto?</h2>
          <p className="mt-3 text-sm sm:text-base text-primary-foreground/90">
            Cuéntanos qué necesitas y te daremos una solución a medida sin compromiso.
          </p>
          <Link
            href="/contacto"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-background px-5 py-3 text-sm font-semibold text-foreground shadow-md transition-transform active:scale-[0.98] sm:w-auto"
          >
            Pedir presupuesto <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
