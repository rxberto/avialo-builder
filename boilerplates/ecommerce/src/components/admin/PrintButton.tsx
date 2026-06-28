"use client";

import { Printer } from "lucide-react";

// Botón que dispara el diálogo de impresión del navegador (Guardar como PDF).
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
    >
      <Printer size={15} /> Imprimir / Guardar PDF
    </button>
  );
}
