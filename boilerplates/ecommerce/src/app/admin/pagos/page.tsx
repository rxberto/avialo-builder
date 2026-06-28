import { storeConfigured } from "@/lib/tenantApi";
import { PaymentsPanel } from "@/components/admin/PaymentsPanel";

export const dynamic = "force-dynamic";

export default function PagosPage() {
  if (!storeConfigured()) {
    return (
      <div className="max-w-lg rounded-xl border border-ui-border-base bg-ui-bg-base p-6 text-sm text-ui-fg-subtle">
        La gestión de la tienda aún no está disponible para este sitio.
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight">Pagos</h1>
        <p className="text-sm text-ui-fg-subtle mt-1">
          Elige y configura cómo cobra tu tienda. Solo una pasarela puede estar activa a la vez.
        </p>
      </div>

      <PaymentsPanel />
    </div>
  );
}
