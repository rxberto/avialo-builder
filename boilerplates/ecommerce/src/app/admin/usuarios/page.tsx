import { auth } from "@/auth";
import { AccountCard } from "@/components/admin/AccountCard";
import { UsersPanel } from "@/components/admin/UsersPanel";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const session = await auth();
  const me = {
    id: session?.user?.id ?? "",
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ui-fg-base tracking-tight">Usuarios</h1>
        <p className="text-sm text-ui-fg-subtle mt-1">
          Gestiona quién puede acceder al panel de tu tienda y con qué rol.
        </p>
      </div>

      <AccountCard me={me} />

      <div>
        <h2 className="text-base font-semibold text-ui-fg-base tracking-tight mb-3">
          Equipo
        </h2>
        <UsersPanel />
      </div>
    </div>
  );
}
