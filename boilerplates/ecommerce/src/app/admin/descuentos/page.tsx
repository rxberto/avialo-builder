import Link from "next/link";
import { AlertCircle, Ticket } from "lucide-react";
import { listPromotions, storeConfigured, PromotionSummary } from "@/lib/tenantApi";
import { promoStatusMeta, promoTypeLabel, promotionValueLabel } from "@/lib/promoLabels";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PromotionCreate } from "@/components/admin/PromotionCreate";

export const dynamic = "force-dynamic";

export default async function DescuentosPage() {
  if (!storeConfigured()) {
    return (
      <div className="max-w-lg rounded-xl border border-ui-border-base bg-ui-bg-base p-6 text-sm text-ui-fg-subtle">
        La gestión de la tienda aún no está disponible para este sitio.
      </div>
    );
  }

  let promotions: PromotionSummary[] = [];
  let count = 0;
  let loadError: string | null = null;
  try {
    const page = await listPromotions({ limit: 100 });
    promotions = page.promotions;
    count = page.count;
  } catch (err) {
    loadError = err instanceof Error ? err.message : "No se pudieron cargar los descuentos.";
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight">Descuentos</h1>
          <p className="text-sm text-ui-fg-subtle mt-1">
            {count > 0
              ? `${count} descuento${count === 1 ? "" : "s"} en tu tienda.`
              : "Crea códigos de descuento para tus clientes (p. ej. «VERANO10»)."}
          </p>
        </div>
        <PromotionCreate />
      </div>

      {loadError && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          <AlertCircle className="h-4 w-4 shrink-0" /> {loadError}
        </div>
      )}

      <Card className="overflow-hidden">
        {promotions.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="mx-auto h-8 w-8 text-ui-fg-muted" />
            <p className="mt-3 text-sm text-ui-fg-subtle">Aún no tienes descuentos.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((p) => {
                const st = promoStatusMeta(p.status);
                return (
                  <TableRow key={p.id} className="group cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/admin/descuentos/${p.id}`}
                        className="font-mono font-medium text-ui-fg-base group-hover:underline"
                      >
                        {p.code}
                      </Link>
                    </TableCell>
                    <TableCell className="text-ui-fg-subtle">
                      {promoTypeLabel(p.valueType)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-ui-fg-base">
                      {promotionValueLabel(p)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
