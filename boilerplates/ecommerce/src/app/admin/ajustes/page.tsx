import { AlertCircle } from "lucide-react";
import { getStoreSettings, storeConfigured, StoreSettings } from "@/lib/tenantApi";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  if (!storeConfigured()) {
    return (
      <div className="max-w-lg rounded-xl border border-ui-border-base bg-ui-bg-base p-6 text-sm text-ui-fg-subtle">
        La gestión de la tienda aún no está disponible para este sitio.
      </div>
    );
  }

  let settings: StoreSettings | null = null;
  let loadError: string | null = null;
  try {
    settings = await getStoreSettings();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "No se pudieron cargar los ajustes.";
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight">Ajustes</h1>
        <p className="text-sm text-ui-fg-subtle mt-1">
          Información de tu tienda y datos de contacto.
        </p>
      </div>

      {loadError && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-ui-border-error bg-ui-tag-red-bg px-4 py-3 text-sm text-ui-fg-error">
          <AlertCircle className="h-4 w-4 shrink-0" /> {loadError}
        </div>
      )}

      {settings && <SettingsForm settings={settings} />}
    </div>
  );
}
