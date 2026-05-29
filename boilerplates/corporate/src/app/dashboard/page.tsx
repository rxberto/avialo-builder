import { Calendar, CreditCard, User, Download, Plus, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function ClientDashboard() {
  // Datos simulados (mocked) para el diseño base de la pyme
  const citas = [
    {
      id: "1",
      serviceName: "Consultoría Inicial",
      date: "28 de Mayo, 2026",
      time: "10:30 H",
      status: "confirmed",
      price: 49.99,
    },
    {
      id: "2",
      serviceName: "Seguimiento de Plan",
      date: "04 de Junio, 2026",
      time: "16:00 H",
      status: "pending",
      price: 29.99,
    },
  ];

  const facturas = [
    {
      id: "INV-2026-001",
      amount: 49.99,
      status: "paid",
      dueDate: "28/05/2026",
    },
    {
      id: "INV-2026-002",
      amount: 29.99,
      status: "unpaid",
      dueDate: "04/06/2026",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle size={12} /> Confirmado
          </span>
        );
      case "pending":
      case "unpaid":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock size={12} /> Pendiente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
            <AlertTriangle size={12} /> Cancelado
          </span>
        );
    }
  };

  return (
    <div className="flex-1 bg-muted/10 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Tu Panel de Cliente</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bienvenido, [NOMBRE_CLIENTE]. Gestiona tus servicios y citas.
            </p>
          </div>
          <div>
            <Link
              href="/dashboard/reservar"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-95"
            >
              <Plus size={16} /> Solicitar Nueva Cita
            </Link>
          </div>
        </div>

        {/* Grid de Contenido Principal */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Columna Izquierda: Citas Activas */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Tus Próximas Citas</h2>
              </div>

              {citas.length > 0 ? (
                <div className="space-y-4">
                  {citas.map((cita) => (
                    <div
                      key={cita.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/20 border border-border rounded-2xl gap-4 hover:border-primary/20 transition-all"
                    >
                      <div>
                        <h3 className="font-bold text-foreground">{cita.serviceName}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {cita.date} a las {cita.time}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <span className="text-sm font-bold text-foreground">{cita.price.toFixed(2)}€</span>
                        {getStatusBadge(cita.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No tienes citas reservadas actualmente.
                </p>
              )}
            </div>

            {/* Sistema de Reservas Rápido Embed */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
                <Plus className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Reserva de Servicios Rápida</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Selecciona uno de nuestros servicios profesionales recomendados y agenda un hueco directamente.
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {["Asesoría Técnica", "Revisión General", "Consulta Estratégica"].map((serv, idx) => (
                  <button
                    key={idx}
                    className="flex items-center justify-between p-4 border border-border hover:border-primary hover:bg-primary/5 rounded-2xl text-left transition-all active:scale-98"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{serv}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Desde 29.99€</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Facturas y Perfil */}
          <div className="space-y-6">
            {/* Facturas */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Tus Facturas (IVA incl.)</h2>
              </div>

              {facturas.length > 0 ? (
                <div className="divide-y divide-border">
                  {facturas.map((fac) => (
                    <div key={fac.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{fac.id}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">Vto: {fac.dueDate}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-foreground">{fac.amount.toFixed(2)}€</span>
                        <button className="p-2 border border-border hover:border-primary rounded-xl text-muted-foreground hover:text-primary transition-all">
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay facturas disponibles.</p>
              )}
            </div>

            {/* Datos del Perfil */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Tu Perfil</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase">Nombre</span>
                  <p className="font-semibold text-foreground">[NOMBRE_CLIENTE]</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase">Email de contacto</span>
                  <p className="font-semibold text-foreground">[EMAIL_CLIENTE]</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase">Teléfono</span>
                  <p className="font-semibold text-foreground">[TELEFONO_CLIENTE]</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icono decorativo simple
function ArrowRight({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
