import { Calendar, Users, FileText, Settings, TrendingUp, Check, X, ShieldAlert, Plus } from "lucide-react";

export default function AdminDashboard() {
  // Datos simulados avanzados
  const estadisticas = [
    { label: "Clientes Totales", value: "148", icon: <Users size={20} className="text-primary" /> },
    { label: "Citas Activas", value: "24", icon: <Calendar size={20} className="text-primary" /> },
    { label: "Facturación (Mes)", value: "4,820.50€", icon: <TrendingUp size={20} className="text-primary" /> },
    { label: "Pendiente de Cobro", value: "350.00€", icon: <FileText size={20} className="text-amber-500" /> },
  ];

  const citasRecientes = [
    { id: "1", client: "Sofía Ruiz", service: "Consultoría Inicial", date: "28/05/2026", time: "10:30 H", status: "confirmed" },
    { id: "2", client: "Alejandro Sanz", service: "Revisión Técnica", date: "29/05/2026", time: "12:00 H", status: "pending" },
    { id: "3", client: "Laura Cores", service: "Plan Estratégico", date: "02/06/2026", time: "09:30 H", status: "pending" },
  ];

  const facturasRecientes = [
    { id: "INV-2026-001", client: "Sofía Ruiz", amount: 49.99, status: "paid", date: "25/05/2026" },
    { id: "INV-2026-002", client: "Alejandro Sanz", amount: 29.99, status: "unpaid", date: "25/05/2026" },
  ];

  return (
    <div className="flex-1 bg-muted/10 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Consola de Administración</h1>
              <p className="text-sm text-muted-foreground mt-1">Gestiona el negocio, citas, clientes y facturas.</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-95">
            <Plus size={16} /> Emitir Factura
          </button>
        </div>

        {/* Stats Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {estadisticas.map((stat, idx) => (
            <div key={idx} className="bg-card border border-border p-6 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black text-foreground mt-2">{stat.value}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center border border-border">
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Dos Columnas Principales */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Listado de Citas Recientes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Gestión de Citas (Cerrando Agenda)</h2>
                </div>
                <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">Actualizado</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground font-bold">
                      <th className="py-3 px-2">Cliente</th>
                      <th className="py-3 px-2">Servicio</th>
                      <th className="py-3 px-2">Fecha/Hora</th>
                      <th className="py-3 px-2">Estado</th>
                      <th className="py-3 px-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {citasRecientes.map((cita) => (
                      <tr key={cita.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3.5 px-2 font-semibold text-foreground">{cita.client}</td>
                        <td className="py-3.5 px-2 text-muted-foreground">{cita.service}</td>
                        <td className="py-3.5 px-2 text-foreground">
                          {cita.date} <span className="text-xs text-muted-foreground">({cita.time})</span>
                        </td>
                        <td className="py-3.5 px-2">
                          {cita.status === "confirmed" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Confirmada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-right flex items-center justify-end gap-1.5">
                          {cita.status === "pending" && (
                            <button className="p-1.5 rounded-lg border border-border text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all">
                              <Check size={14} />
                            </button>
                          )}
                          <button className="p-1.5 rounded-lg border border-border text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Configuración Básica del Negocio */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
                <Settings className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Configuración General de la Pyme</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre Comercial</label>
                  <input
                    type="text"
                    defaultValue="Consultora Ruiz S.L."
                    className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CIF/NIF (Facturación España)</label>
                  <input
                    type="text"
                    defaultValue="B-84271928"
                    className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Color Primario (Hex)</label>
                  <input
                    type="text"
                    defaultValue="#2563EB"
                    className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Reservas</label>
                  <select className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value="slots">Bloques de Hora Fijos</option>
                    <option value="request">Petición bajo Aprobación</option>
                    <option value="free">Libre / Sin Restricciones</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all">
                  Guardar Configuración
                </button>
              </div>
            </div>
          </div>

          {/* Listado de Facturación Rápida */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Facturación y Cobros</h2>
              </div>
              <div className="space-y-4">
                {facturasRecientes.map((fac) => (
                  <div
                    key={fac.id}
                    className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-2xl gap-4"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{fac.id}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{fac.client}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">Fecha: {fac.date}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground block">{fac.amount.toFixed(2)}€</span>
                      <span
                        className={`inline-block text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full ${
                          fac.status === "paid"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                        }`}
                      >
                        {fac.status === "paid" ? "Cobrado" : "Impagado"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
