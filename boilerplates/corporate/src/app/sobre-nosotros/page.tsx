import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Target, Eye, Heart } from "lucide-react";
import { businessConfig } from "@/config/business";

export const metadata: Metadata = {
  title: `Sobre Nosotros | ${businessConfig.name}`,
  description: `Conoce la historia y los valores de ${businessConfig.name}.`,
};

export default function SobreNosotrosPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Sobre nosotros</p>
        <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
          La gente detrás de {businessConfig.name}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
          Somos un equipo de {businessConfig.sector.toLowerCase()}{businessConfig.city ? ` en ${businessConfig.city}` : ""} comprometido
          con la calidad y el trato cercano. Cada cliente es único, y por eso cuidamos cada detalle como si fuera para nosotros.
        </p>
      </div>

      <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {[
          { icon: Target, title: "Nuestra misión", desc: "Ofrecer un servicio excelente que mejore el día a día de nuestros clientes." },
          { icon: Eye, title: "Nuestra visión", desc: "Ser tu referente de confianza, reconocidos por la cercanía y los resultados." },
          { icon: Heart, title: "Nuestros valores", desc: "Honestidad, compromiso y pasión por el trabajo bien hecho." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8 text-center">
        <h2 className="text-xl sm:text-2xl font-bold">¿Quieres saber más?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-muted-foreground">
          Estaremos encantados de atenderte y resolver todas tus dudas.
        </p>
        <Link
          href="/contacto"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
        >
          Contáctanos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
