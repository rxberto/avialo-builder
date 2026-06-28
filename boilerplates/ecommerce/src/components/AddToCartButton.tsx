"use client";

import { useState } from "react";
import { Check, Loader2, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";

interface Props {
  variantId: string;
  quantity?: number;
  // compact: solo icono (tarjeta de catálogo). full: botón con texto (ficha de producto).
  compact?: boolean;
  disabled?: boolean;
  label?: string;
}

export function AddToCartButton({
  variantId,
  quantity = 1,
  compact = false,
  disabled = false,
  label = "Añadir al carrito",
}: Props) {
  const { addItem } = useCart();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await addItem(variantId, quantity);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={busy || disabled}
        aria-label={label}
        className="p-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={15} className="animate-spin" />
        ) : done ? (
          <Check size={15} />
        ) : (
          <ShoppingCart size={15} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy || disabled}
      className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-xl shadow-lg hover:bg-primary/90 transition-all active:scale-95 text-sm disabled:opacity-60 w-full sm:w-auto"
    >
      {busy ? (
        <Loader2 size={16} className="animate-spin" />
      ) : done ? (
        <Check size={16} />
      ) : (
        <ShoppingCart size={16} />
      )}
      {done ? "Añadido" : label}
    </button>
  );
}
