import { businessConfig } from "@/config/business";

// Marco común para las páginas legales (obligatorias en España). Contenido base editable
// por el cliente; el negocio (nombre, CIF, contacto) se inyecta desde businessConfig.
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
      <h1 className="text-3xl font-black tracking-tight text-foreground mb-2">
        {title}
      </h1>
      <p className="text-xs text-muted-foreground mb-10">
        {businessConfig.name} · CIF {businessConfig.cif}
      </p>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4 leading-relaxed">
        {children}
      </div>
    </div>
  );
}
