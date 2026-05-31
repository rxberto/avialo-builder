import { appendJobLog, getJobLogsFromStore, localJobEvents } from "./jobState.js";

// Emisor de eventos para SSE. Ahora alimentado por Redis pub/sub (ver jobState.ts),
// de modo que funciona entre procesos (API <-> worker).
export const jobLogEmitter = localJobEvents;

/**
 * Añade un log para un trabajo y lo publica para SSE (vía Redis).
 * Mantiene firma síncrona (fire-and-forget) para no tocar los numerosos call sites.
 *
 * @param jobId ID del trabajo
 * @param message Mensaje de log
 */
export function addJobLog(jobId: string, message: string) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;

  console.log(`🤖 [Job: ${jobId}]: ${message}`);

  appendJobLog(jobId, formattedMessage).catch((err) =>
    console.error("⚠️ Error al persistir log del job en Redis:", err)
  );
}

/**
 * Obtiene todos los logs acumulados para un jobId (desde Redis).
 */
export async function getJobLogs(jobId: string): Promise<string[]> {
  return getJobLogsFromStore(jobId);
}
