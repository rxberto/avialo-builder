import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar variables de entorno desde la raíz del monorepo
dotenv.config({ path: join(__dirname, "../../../.env") });

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
  redis: {
    url: string;
  };
  database: {
    url: string;
  };
  server: {
    port: number;
  };
}

export const config: AppConfig = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
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
};
