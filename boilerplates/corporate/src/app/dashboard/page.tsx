import { Calendar, Plus, Clock, CheckCircle, AlertTriangle, LogOut, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function euro(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n || 0);
}

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle size={12} /> Confirmada</span>;
  if (status === "cancelled") return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-400"><AlertTriangle size={12} /> Cancelada</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"><Clock size={12} /> Pendiente</span>;
}

export default async function ClientDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // El admin tiene su propia consola.
  if (session.user.role === "admin") redirect("/admin");

  const userId = session.user.id;
  const [citas, facturas] = await Promise.all([
    db.appointment.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 20 }),
    db.invoice.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div className="flex-1 bg-muted/10 py-8 sm:py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><User className="h-5 w-5 text-primary" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Hola, {session.user.name || "cliente"}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Gestiona tus citas y facturas.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/reservar" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all active:scale-95">
              <Plus size={16} /> Reservar cita
            </Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
              <button className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"><LogOut size={16} /></button>
            </form>
          </div>
        </div>

        {/* Citas */}
        <section className="mt-8">
          <h2 className="flex items-center gap-2 font-bold"><Calendar size={18} className="text-primary" /> Mis citas</h2>
          <div className="mt-4 space-y-3">
            {citas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">Todavía no tienes citas. ¡Reserva la primera!</p>
                <Link href="/dashboard/reservar" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus size={16} /> Reservar cita</Link>
              </div>
            ) : citas.map((c) => (
              <div key={c.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{c.serviceName}</p>
                  <p className="text-sm text-muted-foreground">{new Date(c.date).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{euro(c.price)}</span>
                  <StatusBadge status={c.status} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Facturas */}
        {facturas.length > 0 && (
          <section className="mt-10">
            <h2 className="font-bold">Mis facturas</h2>
            <div className="mt-4 space-y-3">
              {facturas.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                  <div>
                    <p className="font-semibold">{f.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">Vence: {new Date(f.dueDate).toLocaleDateString("es-ES")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{euro(f.amount)}</span>
                    <StatusBadge status={f.status} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
