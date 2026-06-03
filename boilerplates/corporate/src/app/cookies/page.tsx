import type { Metadata } from "next";
import { businessConfig } from "@/config/business";

export const metadata: Metadata = {
  title: `Política de Cookies | ${businessConfig.name}`,
  description: `Política de cookies de ${businessConfig.name}.`,
};

export default function CookiesPage() {
  const { name, contact } = businessConfig;
  return (
    <article className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Política de Cookies</h1>
      <div className="mt-8 space-y-6 text-sm sm:text-base leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. ¿Qué son las cookies?</h2>
          <p className="mt-2">
            Las cookies son pequeños archivos que se almacenan en tu dispositivo al navegar. Permiten recordar tus
            preferencias y mejorar tu experiencia en el sitio web de {name}.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Tipos de cookies que usamos</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li><strong className="text-foreground">Técnicas:</strong> necesarias para el funcionamiento del sitio.</li>
            <li><strong className="text-foreground">De preferencias:</strong> recuerdan tus opciones de navegación.</li>
            <li><strong className="text-foreground">Analíticas:</strong> nos ayudan a entender el uso del sitio de forma anónima.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Gestión de cookies</h2>
          <p className="mt-2">
            Puedes aceptar, rechazar o configurar las cookies a través del banner de consentimiento, así como
            eliminarlas en cualquier momento desde la configuración de tu navegador.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Más información</h2>
          <p className="mt-2">
            Para cualquier duda sobre nuestra política de cookies, escríbenos a {contact.email}.
          </p>
        </section>
      </div>
    </article>
  );
}
