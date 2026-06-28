// ============================================================================
// CIFRADO DE SECRETOS EN REPOSO (AES-256-GCM).
// ----------------------------------------------------------------------------
// Para credenciales de terceros que SÍ debemos custodiar (p.ej. la clave SHA-256 de
// Redsys del tenant). La clave maestra llega SOLO por entorno (`AVIALO_SECRETS_KEY`),
// nunca hardcodeada. Formato del cifrado: base64( iv(12) | authTag(16) | ciphertext ).
// ============================================================================

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

/** Deriva una clave de 32 bytes desde `AVIALO_SECRETS_KEY` (hex de 64, o cualquier string → sha256). */
function masterKey(): Buffer {
  const raw = process.env.AVIALO_SECRETS_KEY;
  if (!raw) {
    throw new Error("AVIALO_SECRETS_KEY no está configurada: no se pueden cifrar secretos.");
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  // Cualquier otra cadena se normaliza a 32 bytes de forma determinista (sha256).
  return createHash("sha256").update(raw, "utf8").digest();
}

/** Cifra un texto plano. Devuelve un blob base64 autoportante (iv|tag|ciphertext). */
export function encryptSecret(plaintext: string): string {
  const key = masterKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Descifra un blob producido por `encryptSecret`. Lanza si la autenticación falla. */
export function decryptSecret(blob: string): string {
  const key = masterKey();
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** True si hay clave maestra configurada (para fallar limpio en las rutas). */
export function secretsConfigured(): boolean {
  return !!process.env.AVIALO_SECRETS_KEY;
}
