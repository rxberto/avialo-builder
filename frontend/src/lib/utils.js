import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Lee y parsea un valor JSON de localStorage de forma segura.
 * Si la clave no existe o el JSON está corrupto, devuelve el fallback
 * en lugar de lanzar una excepción (evita el crash total de la app).
 */
export function readStoredJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
