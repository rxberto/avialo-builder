import { EventEmitter } from "events";

class JobLogEmitter extends EventEmitter {}

// Emisor de eventos global para canalizar logs en tiempo real
export const jobLogEmitter = new JobLogEmitter();

// Almacenamiento opcional en memoria de logs por job para dar persistencia si el cliente conecta tarde
const jobLogsStorage = new Map<string, string[]>();

/**
 * Añade un log para un trabajo de generación específico y emite el evento para SSE
 * 
 * @param jobId ID del trabajo
 * @param message Mensaje de log
 */
export function addJobLog(jobId: string, message: string) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;

  console.log(`🤖 [Job: ${jobId}]: ${message}`);

  // Almacenar en memoria
  if (!jobLogsStorage.has(jobId)) {
    jobLogsStorage.set(jobId, []);
  }
  jobLogsStorage.get(jobId)!.push(formattedMessage);

  // Emitir el evento
  jobLogEmitter.emit(`log:${jobId}`, formattedMessage);
}

/**
 * Obtiene todos los logs acumulados para un jobId
 */
export function getJobLogs(jobId: string): string[] {
  return jobLogsStorage.get(jobId) || [];
}

/**
 * Borra los logs almacenados de un trabajo (limpieza)
 */
export function clearJobLogs(jobId: string) {
  jobLogsStorage.delete(jobId);
}
