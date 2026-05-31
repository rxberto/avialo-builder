// ============================================
// ENTRYPOINT DEL PROCESO WORKER (separado de la API)
// ============================================
// La API (server.ts) ya NO arranca el worker. Este proceso independiente consume la cola
// de generación de BullMQ. El estado se comparte con la API vía Redis (ver jobState.ts),
// por lo que ambos procesos pueden escalarse por separado.

import { initObservability, logger, captureError } from "./config/observability.js";

// Inicializar Sentry/logging antes de cualquier otra cosa.
initObservability("avialo-worker");

import { connectPrisma } from "./database/client.js";
import "./queue/worker.js"; // efecto secundario: instancia el Worker de BullMQ

process.on("unhandledRejection", (reason) => captureError(reason, { kind: "unhandledRejection" }));
process.on("uncaughtException", (err) => captureError(err, { kind: "uncaughtException" }));

async function main() {
  await connectPrisma();
  logger.info("Proceso WORKER de Avialo iniciado y escuchando la cola de generación.");
}

main().catch((err) => {
  captureError(err, { phase: "worker-startup" });
  process.exit(1);
});
