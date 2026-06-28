"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex items-center gap-2 text-xs font-medium text-ui-fg-subtle hover:text-ui-fg-base transition-colors"
    >
      <LogOut size={14} /> Salir
    </button>
  );
}
