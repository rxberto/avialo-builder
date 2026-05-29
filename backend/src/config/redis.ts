import { Redis } from "ioredis";
import { config } from "./env.js";

// Configuración de la conexión Redis
export const redisConnection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null, // Requerido por BullMQ
});

redisConnection.on("connect", () => {
  console.log("🔌 Conectado a Redis de forma exitosa");
});

redisConnection.on("error", (error: any) => {
  console.error("❌ Error en la conexión con Redis:", error);
});
