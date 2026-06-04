import { mkdir, writeFile, copyFile, access } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import {
  UPLOADS_DIR,
  SANDBOX_PUBLIC_UPLOADS,
  userUploadsDir,
  decodeDataUrlImage,
} from "../config/uploads.js";
import { sandboxPath } from "../config/sandbox.js";

// ============================================
// SERVICIO DE SUBIDAS DE IMÁGENES (FASE 4)
// ============================================

/** Solo aceptamos nombres de fichero simples (uuid + ext), nunca rutas (anti path traversal). */
const SAFE_FILENAME = /^[a-zA-Z0-9_-]+\.(jpg|png|webp)$/;

/**
 * Guarda de forma persistente una imagen subida por el usuario en su carpeta de subidas.
 * Devuelve el identificador (nombre de fichero) con el que se referenciará después.
 */
export async function saveUserUpload(userId: number, dataUrl: string): Promise<{ id: string }> {
  const { buffer, ext } = decodeDataUrlImage(dataUrl);
  const dir = userUploadsDir(userId);
  await mkdir(dir, { recursive: true });
  const id = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, id), buffer);
  return { id };
}

/**
 * Copia las fotos persistentes de un usuario (referenciadas por sus ids) dentro de la carpeta
 * pública del proyecto generado (`<sandbox>/public/avialo-uploads/`). Devuelve las rutas
 * públicas (`/avialo-uploads/<file>`) que la web puede usar en <img src=...>.
 *
 * Ignora silenciosamente ids inválidos o ficheros ausentes (best-effort): nunca debe tumbar
 * la generación porque una foto falte.
 */
export async function materializeUserPhotos(
  userId: number,
  clientId: string,
  photoIds: string[]
): Promise<string[]> {
  if (!Array.isArray(photoIds) || photoIds.length === 0) return [];

  const srcDir = userUploadsDir(userId);
  const destDir = path.join(sandboxPath(clientId), SANDBOX_PUBLIC_UPLOADS);
  await mkdir(destDir, { recursive: true });

  const urls: string[] = [];
  for (const rawId of photoIds) {
    const id = String(rawId);
    if (!SAFE_FILENAME.test(id)) continue; // descartar nombres sospechosos
    const src = path.join(srcDir, id);
    try {
      await access(src);
      await copyFile(src, path.join(destDir, id));
      urls.push(`/avialo-uploads/${id}`);
    } catch {
      // Foto ausente o no copiable: la saltamos sin abortar.
    }
  }
  return urls;
}

/**
 * Escribe una imagen (data URL) directamente en la carpeta pública del proyecto en vivo del
 * IDE. Devuelve la ruta pública para que la próxima edición de IA la referencie.
 */
export async function saveSandboxImage(clientId: string, dataUrl: string): Promise<{ url: string }> {
  const { buffer, ext } = decodeDataUrlImage(dataUrl);
  const destDir = path.join(sandboxPath(clientId), SANDBOX_PUBLIC_UPLOADS);
  await mkdir(destDir, { recursive: true });
  const id = `${randomUUID()}.${ext}`;
  await writeFile(path.join(destDir, id), buffer);
  return { url: `/avialo-uploads/${id}` };
}

/** Expuesto por si otros módulos necesitan la base de subidas. */
export { UPLOADS_DIR };
