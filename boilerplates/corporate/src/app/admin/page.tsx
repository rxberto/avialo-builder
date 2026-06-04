import { Calendar, Users, FileText, TrendingUp, ShieldAlert, LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";

// Datos en vivo: no prerenderizar en build (no hay BD en build).
export const dynamic = "force-dynamic";

function euro(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n || 0);
}

const STATUS_ES: Record<string, string> = { pending: "Pendiente", confirmed: "Confirmada", cancelled: "Cancelada" };

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const [clientCount, apptCount, paidAgg, pendingAgg, appointments] = await Promise.all([
    db.user.count({ where: { role: "client" } }),
    db.appointment.count(),
    db.invoice.aggregate({ _sum: { amount: true }, where: { status: "paid" } }),
    db.invoice.aggregate({ _sum: { amount: true }, where: { status: "unpaid" } }),
    db.appointment.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const stats = [
    { label: "Clientes", value: String(clientCount), icon: <Users size={20} className="text-primary" /> },
    { label: "Citas totales", value: String(apptCount), icon: <Calendar size={20} className="text-primary" /> },
    { label: "Facturado (cobrado)", value: euro(paidAgg._sum.amount || 0), icon: <TrendingUp size={20} className="text-primary" /> },
    { label: "Pendiente de cobro", value: euro(pendingAgg._sum.amount || 0), icon: <FileText size={20} className="text-amber-500" /> },
  ];

  return (
    <div className="flex-1 bg-muted/10 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Consola de Administración</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Citas, clientes y facturación en tiempo real.</p>
            </div>
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
              <LogOut size={16} /> Cerrar sesión
            </button>
          </form>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border p-5 sm:p-6 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-xl sm:text-2xl font-black mt-2">{s.value}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center border border-border shrink-0">{s.icon}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-bold">Citas recientes</h2>
          </div>
          {appointments.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Aún no hay citas. Aparecerán aquí cuando tus clientes reserven.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 font-semibold">Servicio</th>
                    <th className="px-5 py-3 font-semibold">Fecha</th>
                    <th className="px-5 py-3 font-semibold">Importe</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {appointments.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/20">
                      <td className="px-5 py-3">
                        <div className="font-medium">{a.user?.name || "Cliente"}</div>
                        <div className="text-xs text-muted-foreground">{a.user?.email}</div>
                      </td>
                      <td className="px-5 py-3">{a.serviceName}</td>
                      <td className="px-5 py-3 whitespace-nowrap">{new Date(a.date).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td className="px-5 py-3 whitespace-nowrap">{a.price > 0 ? euro(a.price) : "Gratis"}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{STATUS_ES[a.status] || a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
