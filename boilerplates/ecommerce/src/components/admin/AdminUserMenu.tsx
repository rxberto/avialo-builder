"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronsUpDown, ExternalLink, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function AdminUserMenu({ name, email }: { name: string; email: string }) {
  const initial = (name || email || "?").charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-ui-bg-base-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-border-interactive">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ui-bg-interactive text-xs font-bold text-ui-fg-on-color">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ui-fg-base">{name || "Cuenta"}</span>
          <span className="block truncate text-xs text-ui-fg-subtle">{email}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-ui-fg-subtle" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{name || "Cuenta"}</span>
          <span className="block truncate text-xs text-ui-fg-subtle">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/" target="_blank">
            <ExternalLink /> Ver tienda
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-ui-fg-error focus:text-ui-fg-error"
        >
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
