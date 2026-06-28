import Link from "next/link";
import { AlertCircle, Users } from "lucide-react";
import { listCustomers, storeConfigured, CustomerSummary } from "@/lib/tenantApi";
import { formatPrice } from "@/lib/format";
import { formatOrderDate } from "@/lib/orderLabels";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

// Iniciales para el avatar (estilo Medusa Admin).
function initials(name: string | null, email: string | null): string {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default async function ClientesPage() {
  if (!storeConfigured()) {
    return (
      <div className="max-w-lg rounded-xl border border-ui-border-base bg-ui-bg-base p-6 text-sm text-ui-fg-subtle">
        La gestión de la tienda aún no está disponible para este sitio.
      </div>
    );
  }

  let customers: CustomerSummary[] = [];
  let count = 0;
  let loadError: string | null = null;
  try {
    const page = await listCustomers({ limit: 50 });
    customers = page.customers;
    count = page.count;
  } catch (err) {
    loadError = err instanceof Error ? err.message : "No se pudieron cargar los clientes.";
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight">Clientes</h1>
        <p className="text-sm text-ui-fg-subtle mt-1">
          {count > 0
            ? `${count} cliente${count === 1 ? "" : "s"} han comprado en tu tienda.`
            : "Los clientes que compren en tu tienda aparecerán aquí."}
        </p>
      </div>

      {loadError && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          <AlertCircle className="h-4 w-4 shrink-0" /> {loadError}
        </div>
      )}

      <Card className="overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-ui-fg-muted" />
            <p className="mt-3 text-sm text-ui-fg-subtle">Aún no tienes clientes.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell text-center">Pedidos</TableHead>
                <TableHead className="hidden sm:table-cell">Última compra</TableHead>
                <TableHead className="text-right">Gastado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell className="min-w-0">
                    <Link
                      href={`/admin/clientes/${encodeURIComponent(c.id)}`}
                      className="flex items-center gap-3"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ui-bg-component text-xs font-semibold text-ui-fg-subtle">
                        {initials(c.name, c.email)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-ui-fg-base truncate group-hover:underline">
                          {c.name || "Cliente"}
                        </span>
                        <span className="block text-xs text-ui-fg-subtle truncate">{c.email}</span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center text-ui-fg-subtle">
                    {c.orderCount}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-ui-fg-subtle whitespace-nowrap">
                    {formatOrderDate(c.lastOrderAt)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-ui-fg-base whitespace-nowrap">
                    {formatPrice(c.totalSpent, c.currencyCode)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
