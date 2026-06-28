"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { HttpTypes } from "@medusajs/types";
import { sdk } from "./medusa";
import { toRealPromoCode } from "./promoCode";

const CART_ID_KEY = "avialo_cart_id";

// Campos del carrito que necesitamos para el resumen y el checkout.
const CART_FIELDS =
  "*items,*items.variant,*items.product,*items.thumbnail,+items.total,*region,+shipping_methods.name,*promotions,+discount_total";

export interface PromoResult {
  ok: boolean;
  error?: string;
}

interface CartContextValue {
  cart: HttpTypes.StoreCart | null;
  loading: boolean;
  totalItems: number;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  applyPromo: (visibleCode: string) => Promise<PromoResult>;
  removePromo: (realCode: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

function readCartId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CART_ID_KEY);
}

function writeCartId(id: string): void {
  if (typeof window !== "undefined") window.localStorage.setItem(CART_ID_KEY, id);
}

function clearCartId(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(CART_ID_KEY);
}

async function getStoreRegionId(): Promise<string | null> {
  try {
    const { regions } = await sdk.client.fetch<{
      regions: HttpTypes.StoreRegion[];
    }>("/store/regions", { method: "GET" });
    return regions?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<HttpTypes.StoreCart | null>(null);
  const [loading, setLoading] = useState(false);

  const retrieveCart = useCallback(async (id: string) => {
    try {
      const { cart: fetched } = await sdk.store.cart.retrieve(id, {
        fields: CART_FIELDS,
      });
      setCart(fetched);
      return fetched;
    } catch {
      // El carrito ya no existe (completado/expirado): lo descartamos.
      clearCartId();
      setCart(null);
      return null;
    }
  }, []);

  // Asegura un carrito existente o crea uno nuevo con la región de la tienda.
  const ensureCart = useCallback(async (): Promise<HttpTypes.StoreCart | null> => {
    const existingId = readCartId();
    if (existingId) {
      const existing = await retrieveCart(existingId);
      if (existing) return existing;
    }
    const regionId = await getStoreRegionId();
    if (!regionId) return null;
    const { cart: created } = await sdk.store.cart.create({ region_id: regionId });
    writeCartId(created.id);
    setCart(created);
    return created;
  }, [retrieveCart]);

  useEffect(() => {
    const id = readCartId();
    if (id) void retrieveCart(id);
  }, [retrieveCart]);

  const refresh = useCallback(async () => {
    const id = readCartId();
    if (id) await retrieveCart(id);
  }, [retrieveCart]);

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      setLoading(true);
      try {
        const current = await ensureCart();
        if (!current) return;
        await sdk.store.cart.createLineItem(current.id, {
          variant_id: variantId,
          quantity,
        });
        await retrieveCart(current.id);
      } finally {
        setLoading(false);
      }
    },
    [ensureCart, retrieveCart]
  );

  const updateItem = useCallback(
    async (lineId: string, quantity: number) => {
      const id = readCartId();
      if (!id) return;
      setLoading(true);
      try {
        await sdk.store.cart.updateLineItem(id, lineId, { quantity });
        await retrieveCart(id);
      } finally {
        setLoading(false);
      }
    },
    [retrieveCart]
  );

  const removeItem = useCallback(
    async (lineId: string) => {
      const id = readCartId();
      if (!id) return;
      setLoading(true);
      try {
        await sdk.store.cart.deleteLineItem(id, lineId);
        await retrieveCart(id);
      } finally {
        setLoading(false);
      }
    },
    [retrieveCart]
  );

  // Aplica un cupón: reconstruye el código real (con el prefijo del tenant) y lo
  // añade al carrito vía Store API. Devuelve un error legible si no es válido.
  const applyPromo = useCallback(
    async (visibleCode: string): Promise<PromoResult> => {
      const code = toRealPromoCode(visibleCode);
      if (!code) return { ok: false, error: "Introduce un código." };
      const current = await ensureCart();
      if (!current) return { ok: false, error: "No se pudo preparar el carrito." };
      setLoading(true);
      try {
        await sdk.client.fetch(`/store/carts/${current.id}/promotions`, {
          method: "POST",
          body: { promo_codes: [code] },
        });
        const updated = await retrieveCart(current.id);
        // Medusa ignora silenciosamente un código inválido: si no aparece, avisamos.
        const applied = (updated?.promotions ?? []).some(
          (p) => p.code?.toLowerCase() === code.toLowerCase()
        );
        if (!applied) {
          return { ok: false, error: "El código no es válido o ha caducado." };
        }
        return { ok: true };
      } catch {
        return { ok: false, error: "El código no es válido o ha caducado." };
      } finally {
        setLoading(false);
      }
    },
    [ensureCart, retrieveCart]
  );

  const removePromo = useCallback(
    async (realCode: string) => {
      const id = readCartId();
      if (!id) return;
      setLoading(true);
      try {
        await sdk.client.fetch(`/store/carts/${id}/promotions`, {
          method: "DELETE",
          body: { promo_codes: [realCode] },
        });
        await retrieveCart(id);
      } finally {
        setLoading(false);
      }
    },
    [retrieveCart]
  );

  const totalItems = useMemo(
    () => (cart?.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0),
    [cart]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      totalItems,
      addItem,
      updateItem,
      removeItem,
      applyPromo,
      removePromo,
      refresh,
    }),
    [cart, loading, totalItems, addItem, updateItem, removeItem, applyPromo, removePromo, refresh]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
