import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar variables de entorno desde la raíz del monorepo
dotenv.config({ path: join(__dirname, "../../../.env") });

/**
 * Obtiene un secreto obligatorio. En producción ABORTA el arranque si falta o es débil.
 * En desarrollo genera un secreto efímero (sin literales hardcodeados en el código).
 */
function requiredSecret(name: string, value: string | undefined): string {
  if (value && value.length >= 16) return value;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `❌ Variable de entorno obligatoria ausente o demasiado corta: ${name}. ` +
      `Debe tener al menos 16 caracteres. Genera una con: openssl rand -base64 32`
    );
  }

  // Desarrollo: secreto efímero por arranque (los tokens no sobreviven a reinicios).
  console.warn(
    `⚠️  ${name} no definido — usando un secreto EFÍMERO de desarrollo. ` +
    `Define ${name} en tu .env para tokens persistentes.`
  );
  return randomBytes(32).toString("base64");
}

/** Valida el proveedor primario forzado vía LLM_PRIMARY. */
function parseLlmPrimary(value: string | undefined): "claude" | "gemini" | "deepseek" | undefined {
  const v = (value || "").trim().toLowerCase();
  return v === "claude" || v === "gemini" || v === "deepseek" ? v : undefined;
}

export interface AppConfig {
  anthropic: {
    apiKey?: string;
  };
  gemini: {
    apiKey?: string;
  };
  openai: {
    apiKey?: string;
  };
  openrouter: {
    apiKey?: string;
  };
  deepseek: {
    apiKey?: string;
    model: string;
  };
  llm: {
    // Proveedor primario forzado para la generación (sobrescribe el routing por tarea).
    // Útil cuando solo se tienen créditos de un proveedor (p.ej. "deepseek").
    primary?: "claude" | "gemini" | "deepseek";
  };
  redis: {
    url: string;
  };
  database: {
    url: string;
  };
  server: {
    port: number;
  };
  auth: {
    jwtSecret: string;
    nextauthSecret: string;
  };
}

export const config: AppConfig = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  gemini: {
    // Aceptamos ambos nombres por compatibilidad (GEMINI_API_KEY canónico, GOOGLE_API_KEY legado).
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  },
  llm: {
    primary: parseLlmPrimary(process.env.LLM_PRIMARY),
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  database: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres?schema=public",
  },
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
  },
  auth: {
    jwtSecret: requiredSecret("JWT_SECRET", process.env.JWT_SECRET),
    nextauthSecret: requiredSecret("NEXTAUTH_SECRET", process.env.NEXTAUTH_SECRET),
  },
};
