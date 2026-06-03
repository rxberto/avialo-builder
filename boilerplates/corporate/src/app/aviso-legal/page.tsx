import type { Metadata } from "next";
import { businessConfig } from "@/config/business";

export const metadata: Metadata = {
  title: `Aviso Legal | ${businessConfig.name}`,
  description: `Aviso legal de ${businessConfig.name}.`,
};

export default function AvisoLegalPage() {
  const { name, cif, contact } = businessConfig;
  return (
    <article className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Aviso Legal</h1>
      <div className="mt-8 space-y-6 text-sm sm:text-base leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Datos identificativos</h2>
          <p className="mt-2">
            En cumplimiento de la Ley 34/2002 (LSSI-CE), se informa de que este sitio web es titularidad de{" "}
            <strong className="text-foreground">{name}</strong>, con CIF/NIF <strong className="text-foreground">{cif}</strong>,
            domicilio en {contact.address}. Correo de contacto: {contact.email}. Teléfono: {contact.phone}.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Objeto</h2>
          <p className="mt-2">
            El presente aviso legal regula el uso del sitio web. La navegación atribuye la condición de usuario e implica
            la aceptación plena de todas las cláusulas aquí recogidas.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Propiedad intelectual</h2>
          <p className="mt-2">
            Todos los contenidos del sitio (textos, imágenes, marcas y código) son titularidad de {name} o de terceros
            que han autorizado su uso, y están protegidos por la normativa de propiedad intelectual e industrial.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Responsabilidad</h2>
          <p className="mt-2">
            {name} no se hace responsable del mal uso que se realice de los contenidos, siendo responsabilidad exclusiva
            de la persona que accede a ellos o los utiliza.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Legislación aplicable</h2>
          <p className="mt-2">
            Las presentes condiciones se rigen por la legislación española. Para la resolución de conflictos las partes
            se someten a los juzgados y tribunales que correspondan conforme a derecho.
          </p>
        </section>
      </div>
    </article>
  );
}
