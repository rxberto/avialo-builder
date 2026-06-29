"use client";

import { useState } from "react";
import { Eye, EyeOff, RefreshCw, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { generatePassword, passwordStrength } from "@/lib/passwordTools";

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  // Si el campo está vacío y es opcional (p.ej. "dejar en blanco para no cambiar"),
  // no mostramos el medidor de fuerza.
  optionalHint?: string;
}

const STRENGTH_META: Record<string, { label: string; bar: string; text: string; width: string }> = {
  weak: { label: "Débil", bar: "bg-ui-tag-red-icon", text: "text-ui-fg-error", width: "w-1/3" },
  fair: { label: "Aceptable", bar: "bg-ui-tag-orange-icon", text: "text-ui-fg-subtle", width: "w-2/3" },
  strong: { label: "Fuerte", bar: "bg-ui-tag-green-icon", text: "text-ui-tag-green-text", width: "w-full" },
};

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  optionalHint,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  function regenerate() {
    const pwd = generatePassword(16);
    onChange(pwd);
    setVisible(true);
  }

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Algunos navegadores bloquean el portapapeles sin gesto/https; lo ignoramos.
    }
  }

  const strength = value ? passwordStrength(value) : null;
  const meta = strength ? STRENGTH_META[strength] : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <button
          type="button"
          onClick={regenerate}
          className="inline-flex items-center gap-1 txt-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
        >
          <RefreshCw className="h-3 w-3" /> Generar
        </button>
      </div>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete="new-password"
          className="pr-16"
        />
        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
          <button
            type="button"
            onClick={copy}
            aria-label="Copiar contraseña"
            className="flex h-6 w-6 items-center justify-center rounded-md text-ui-fg-muted hover:bg-ui-bg-base-hover hover:text-ui-fg-base disabled:opacity-40"
            disabled={!value}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-ui-tag-green-icon" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="flex h-6 w-6 items-center justify-center rounded-md text-ui-fg-muted hover:bg-ui-bg-base-hover hover:text-ui-fg-base"
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      {meta ? (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-ui-bg-component">
            <div className={cn("h-full rounded-full transition-all", meta.bar, meta.width)} />
          </div>
          <span className={cn("txt-small", meta.text)}>{meta.label}</span>
        </div>
      ) : optionalHint ? (
        <p className="txt-small text-ui-fg-muted">{optionalHint}</p>
      ) : null}
    </div>
  );
}
