import path from "path";

// ============================================
// CONFIGURACIÓN DE SUBIDAS DE IMÁGENES (FASE 4)
// ============================================
// El cliente puede subir SUS PROPIAS fotos del negocio (en el onboarding y en el chat del
// IDE) para reemplazar las imágenes de stock por sector. Se guardan en disco:
//
//   - Onboarding:  <UPLOADS_DIR>/<userId>/<uuid>.<ext>   (persistente, reutilizable)
//   - Al generar:  el worker las copia a <sandbox>/public/avialo-uploads/<file>
//   - IDE chat:    se escriben directamente en <sandbox>/public/avialo-uploads/<file>
//
// Tanto la API (que recibe la subida) como el worker (que la copia al sandbox) deben montar
// el MISMO directorio de host (ver docker-compose: ../uploads:/app/uploads).

// Base del almacén de subidas tal como la ve el proceso (api/worker).
export const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";

// Carpeta pública dentro del proyecto generado donde viven las fotos servidas por la web.
export const SANDBOX_PUBLIC_UPLOADS = "public/avialo-uploads";

// Límites duros (defensa en profundidad; el cliente además reduce las imágenes antes de subir).
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB por imagen ya decodificada
export const MAX_PHOTOS_PER_REQUEST = 8;        // tope de fotos por subida de onboarding

// Tipos MIME admitidos y su extensión en disco.
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Carpeta de subidas persistentes de un usuario concreto. */
export function userUploadsDir(userId: number | string): string {
  return path.resolve(UPLOADS_DIR, String(userId));
}

export interface DecodedImage {
  buffer: Buffer;
  ext: string;
  mime: string;
}

/**
 * Decodifica y valida una imagen recibida como data URL base64
 * (p.ej. "data:image/jpeg;base64,/9j/4AAQ...").
 * Lanza un Error con mensaje legible si el formato/tipo/tamaño no son válidos.
 */
export function decodeDataUrlImage(dataUrl: unknown): DecodedImage {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    throw new Error("Formato de imagen no válido (se esperaba un data URL base64).");
  }

  const match = /^data:([a-z/+.-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new Error("No se pudo leer la imagen (data URL malformado).");
  }

  const mime = match[1].toLowerCase();
  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    throw new Error(`Tipo de imagen no admitido: ${mime}. Usa JPG, PNG o WebP.`);
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(match[2], "base64");
  } catch {
    throw new Error("No se pudo decodificar la imagen.");
  }

  if (buffer.length === 0) {
    throw new Error("La imagen está vacía.");
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`La imagen supera el tamaño máximo de ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB.`);
  }

  return { buffer, ext, mime };
}
