import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

// Payload tipado estrictamente para la cola de generación de BullMQ
export interface GenerationJobData {
  clientId: string;
  webType: "corporativa" | "dinamica" | "ecommerce" | string;
  businessName: string;
  sector: string;
  city: string;
  primaryColor?: string;
  pages?: string[];
  userId?: number;
  fullClientData?: Record<string, any>; // Datos completos del onboarding (Fase 4)
}


// Inicialización de la cola
export const generationQueue = new Queue<GenerationJobData>("generation-queue", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1, // Intentos de cola (el loop de la IA maneja sus propias iteraciones)
    removeOnComplete: true, // Limpiar en éxito
    removeOnFail: false,    // Conservar fallidos para auditoría
  },
});

console.log("📦 Cola 'generation-queue' inicializada correctamente");
