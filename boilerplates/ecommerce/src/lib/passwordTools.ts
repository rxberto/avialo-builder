// Utilidades de contraseña para el panel (solo navegador). Sin secretos ni estado.

// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para que sea fácil de dictar.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?";

// Genera una contraseña aleatoria criptográficamente segura (Web Crypto).
export function generatePassword(length = 16): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export type PasswordStrength = "weak" | "fair" | "strong";

// Estimación simple de fuerza para guiar al usuario (no es una política, solo una pista).
export function passwordStrength(value: string): PasswordStrength {
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  if (score <= 2) return "weak";
  if (score <= 3) return "fair";
  return "strong";
}
