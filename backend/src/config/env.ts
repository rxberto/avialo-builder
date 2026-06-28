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
  // URL INTERNA del orquestador, tal como la alcanza un contenedor de preview dentro de la red
  // Docker (avialo-network). El panel del cliente la usa para gestionar su tienda vía el portero.
  orchestrator: {
    internalUrl: string;
  };
  auth: {
    jwtSecret: string;
    nextauthSecret: string;
  };
  // Backend Medusa compartido (ecommerce). El worker lo usa para aprovisionar la tienda
  // de cada cliente (Sales Channel + Publishable Key) vía Admin API.
  medusa: {
    // URL interna (red Docker) para la Admin API server-to-server: http://medusa:9000.
    backendUrl: string;
    // URL PÚBLICA del Store API que se inyecta en la storefront. El carrito/checkout corren
    // en el navegador, así que NO sirve la URL interna: debe ser https://tienda-api.<dominio>.
    storefrontApiUrl: string;
    adminEmail: string;
    adminPassword?: string;
    // Clave publicable de Stripe (pk_...) de la misma cuenta que usa Medusa. La storefront la
    // necesita en el navegador para el Payment Element.
    stripePublishableKey?: string;
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
  orchestrator: {
    // En producción (compose) el contenedor del orquestador es avialo-orchestrator:3000.
    // En dev puede sobreescribirse (p.ej. http://host.docker.internal:3000).
    internalUrl:
      process.env.ORCHESTRATOR_INTERNAL_URL || "http://avialo-orchestrator:3000",
  },
  auth: {
    jwtSecret: requiredSecret("JWT_SECRET", process.env.JWT_SECRET),
    nextauthSecret: requiredSecret("NEXTAUTH_SECRET", process.env.NEXTAUTH_SECRET),
  },
  medusa: {
    // Dentro de la red Docker, el backend compartido es http://medusa:9000.
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://medusa:9000",
    // URL pública del Store API para el navegador. Por defecto se deriva de PREVIEW_DOMAIN_BASE
    // (Traefik enruta tienda-api.<dominio> → medusa:9000); en dev cae a localhost:9000.
    storefrontApiUrl:
      process.env.MEDUSA_STOREFRONT_URL ||
      (process.env.PREVIEW_DOMAIN_BASE
        ? `https://tienda-api.${process.env.PREVIEW_DOMAIN_BASE}`
        : "http://localhost:9000"),
    adminEmail: process.env.MEDUSA_ADMIN_EMAIL || "admin@avialo.app",
    adminPassword: process.env.MEDUSA_ADMIN_PASSWORD,
    // Aceptamos la pk pública dedicada o la del flujo de billing (misma cuenta Stripe).
    stripePublishableKey:
      process.env.STRIPE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
};
