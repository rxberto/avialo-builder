import Link from "next/link";
import { Star, ArrowRight, CheckCircle, Calendar, MessageSquare, Phone } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Líderes en el sector
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground">
            Soluciones Profesionales para Impulsar tu Negocio
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Ayudamos a pymes y autónomos a automatizar su gestión, captar más clientes y optimizar sus servicios con tecnología de vanguardia.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-95"
            >
              Reservar Cita <Calendar size={16} />
            </Link>
            <Link
              href="#servicios"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-muted transition-all active:scale-95"
            >
              Saber más <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        {/* Adornos decorativos */}
        <div className="absolute top-1/2 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />
      </section>

      {/* 2. SERVICES SECTION */}
      <section id="servicios" className="py-20 bg-muted/20 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Nuestros Servicios</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Ofrecemos soluciones integrales y personalizadas para adaptarnos perfectamente a tus necesidades comerciales.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Asesoramiento Estratégico",
                desc: "Analizamos tu situación y diseñamos una hoja de ruta clara para optimizar el rendimiento de tu negocio.",
                icon: <CheckCircle className="h-6 w-6 text-primary" />,
              },
              {
                title: "Gestión Digital Avanzada",
                desc: "Sistemas interactivos y automatizados de reservas, clientes y facturas directamente a tu disposición.",
                icon: <Calendar className="h-6 w-6 text-primary" />,
              },
              {
                title: "Soporte Técnico 24/7",
                desc: "Nuestro equipo técnico especializado está disponible para garantizar el correcto funcionamiento de tu app.",
                icon: <Phone className="h-6 w-6 text-primary" />,
              },
            ].map((serv, idx) => (
              <div
                key={idx}
                className="flex flex-col bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  {serv.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground">{serv.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">{serv.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. TESTIMONIALS SECTION */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Lo que Dicen Nuestros Clientes</h2>
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
            {[
              {
                name: "Sofía Ruiz",
                role: "Directora de Clínica Dental",
                comment: "Gracias al sistema de citas integradas, hemos reducido un 40% las ausencias y la satisfacción de los pacientes ha aumentado drásticamente.",
              },
              {
                name: "Manuel Gómez",
                role: "Fundador de Asesoría Gómez",
                comment: "El panel privado y el gestor de facturación son sumamente limpios y rápidos. Ha facilitado muchísimo el trabajo diario con los clientes.",
              },
            ].map((test, idx) => (
              <div
                key={idx}
                className="bg-card border border-border p-8 rounded-2xl text-left flex flex-col justify-between shadow-sm relative"
              >
                <div className="flex items-center gap-1 text-amber-500 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="text-sm italic text-muted-foreground leading-relaxed flex-1">"{test.comment}"</p>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{test.name}</h4>
                    <p className="text-xs text-muted-foreground">{test.role}</p>
                  </div>
                  <MessageSquare className="h-5 w-5 text-muted-foreground/30" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CONTACT / CTA SECTION */}
      <section id="contacto" className="py-20 bg-muted/30 border-t border-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">¿Listo para Empezar?</h2>
          <p className="mt-4 text-muted-foreground">
            Rellene nuestro formulario de contacto o acceda a su panel privado para solicitar asesoramiento técnico inmediato.
          </p>

          <form className="mt-8 text-left bg-card border border-border p-8 rounded-2xl shadow-md space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  placeholder="Ej. Juan Pérez"
                  className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  placeholder="Ej. juan@empresa.com"
                  className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mensaje o Consulta
              </label>
              <textarea
                id="message"
                required
                rows={4}
                placeholder="¿En qué podemos ayudarte?"
                className="mt-2 block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
              />
            </div>

            {/* Checkbox obligatoria RGPD en España */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="rgpd"
                required
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="rgpd" className="text-xs text-muted-foreground leading-relaxed">
                Acepto la{" "}
                <Link href="/privacidad" className="text-primary underline hover:text-primary/80">
                  Política de Privacidad
                </Link>{" "}
                y doy mi consentimiento para el tratamiento de mis datos de acuerdo con el RGPD.
              </label>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Enviar Mensaje <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
