import type { Metadata } from "next";
import { businessConfig } from "@/config/business";

export const metadata: Metadata = {
  title: `Política de Privacidad | ${businessConfig.name}`,
  description: `Política de privacidad de ${businessConfig.name}.`,
};

export default function PrivacidadPage() {
  const { name, cif, contact } = businessConfig;
  return (
    <article className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Política de Privacidad</h1>
      <div className="mt-8 space-y-6 text-sm sm:text-base leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Responsable del tratamiento</h2>
          <p className="mt-2">
            <strong className="text-foreground">{name}</strong> (CIF/NIF {cif}), con domicilio en {contact.address},
            es responsable del tratamiento de tus datos personales. Contacto: {contact.email}.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Finalidad</h2>
          <p className="mt-2">
            Tratamos la información que nos facilitas para atender tus consultas, gestionar la relación comercial y, en su
            caso, prestarte nuestros servicios. No se cederán datos a terceros salvo obligación legal.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Legitimación</h2>
          <p className="mt-2">
            La base legal es tu consentimiento y/o la ejecución de la relación contractual conforme al Reglamento (UE)
            2016/679 (RGPD) y la LOPDGDD 3/2018.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Derechos</h2>
          <p className="mt-2">
            Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad
            escribiendo a {contact.email}. Tienes derecho a reclamar ante la Agencia Española de Protección de Datos (AEPD).
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Conservación</h2>
          <p className="mt-2">
            Conservaremos tus datos mientras dure la relación y, posteriormente, durante los plazos legalmente exigibles.
          </p>
        </section>
      </div>
    </article>
  );
}
