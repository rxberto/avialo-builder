import { Redis } from "ioredis";
import { EventEmitter } from "events";
import { config } from "../config/env.js";

// ============================================
// ESTADO DE JOBS COMPARTIDO VÍA REDIS
// ============================================
// El estado de los trabajos y sus logs se almacenan en Redis (no en memoria) para que
// el proceso de la API (que sirve SSE) y el proceso del worker (que genera) puedan estar
// SEPARADOS y, además, el estado sobreviva a reinicios.
//
// - Estado:  clave string  `avialo:job:status:<jobId>` (JSON, con TTL)
// - Logs:    lista          `avialo:job:logs:<jobId>`  (con TTL)
// - Eventos: pub/sub canal  `avialo:job-events` -> se reemiten a un EventEmitter local

const TTL_SECONDS = 60 * 60 * 24; // 24h
const CHANNEL = "avialo:job-events";

// Conexión para escritura/lectura y publicación
const redis = new Redis(config.redis.url, { maxRetriesPerRequest: null });
// Conexión dedicada para suscripción (ioredis exige una conexión aparte en modo subscribe)
const subscriber = new Redis(config.redis.url, { maxRetriesPerRequest: null });

// Emisor local: la API se suscribe a esto; lo alimenta el subscriber de Redis.
export const localJobEvents = new EventEmitter();
localJobEvents.setMaxListeners(0);

subscriber.subscribe(CHANNEL).catch((err) => {
  console.error("❌ Error al suscribirse al canal de eventos de jobs:", err);
});

subscriber.on("message", (_channel, raw) => {
  try {
    const evt = JSON.parse(raw) as { jobId: string; type: "log" | "progress"; payload: unknown };
    localJobEvents.emit(`${evt.type}:${evt.jobId}`, evt.payload);
  } catch {
    // Mensaje malformado — ignorar
  }
});

export interface JobStatus {
  jobId: string;
  state: "pending" | "generating" | "building" | "preview" | "deployed" | "failed";
  progress: number; // 0 a 100
  port?: number;
  previewUrl?: string;
  error?: string;
  updatedAt: string;
}

/**
 * Persiste el estado de un job y publica el progreso para los clientes SSE conectados.
 */
export async function setJobStatus(status: JobStatus): Promise<void> {
  await redis.set(`avialo:job:status:${status.jobId}`, JSON.stringify(status), "EX", TTL_SECONDS);
  await redis.publish(
    CHANNEL,
    JSON.stringify({
      jobId: status.jobId,
      type: "progress",
      payload: {
        status: status.state,
        progress: status.progress,
        previewUrl: status.previewUrl ?? null,
      },
    })
  );
}

/**
 * Lee el estado actual de un job, o null si no existe.
 */
export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  const raw = await redis.get(`avialo:job:status:${jobId}`);
  return raw ? (JSON.parse(raw) as JobStatus) : null;
}

/**
 * Añade un log a un job (persistido) y lo publica para SSE en tiempo real.
 */
export async function appendJobLog(jobId: string, message: string): Promise<void> {
  const key = `avialo:job:logs:${jobId}`;
  await redis.rpush(key, message);
  await redis.expire(key, TTL_SECONDS);
  await redis.publish(CHANNEL, JSON.stringify({ jobId, type: "log", payload: message }));
}

/**
 * Devuelve todos los logs acumulados de un job.
 */
export async function getJobLogsFromStore(jobId: string): Promise<string[]> {
  return await redis.lrange(`avialo:job:logs:${jobId}`, 0, -1);
}
