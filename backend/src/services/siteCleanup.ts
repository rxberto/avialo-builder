import { rm } from "fs/promises";
import path from "path";
import { generationQueue } from "../queue/queue.js";
import { dropTenantSchema } from "../database/tenant.js";
import { docker } from "../docker/dockerode.js";

const PROJECTS_DIR = "./projects";

/**
 * Limpia TODOS los recursos del sitio de un usuario (RGPD + housekeeping):
 *  - Detiene/elimina el contenedor de previsualización (nombre real: avialo-preview-<clientId>)
 *  - Elimina el esquema multi-tenant de PostgreSQL
 *  - Borra la carpeta del sandbox en disco
 *
 * El clientId real se resuelve desde el job de la cola (job.data.clientId).
 *
 * @param siteJobId El siteJobId almacenado en el usuario
 */
export async function cleanupUserSite(siteJobId?: string | null): Promise<void> {
  if (!siteJobId) return;

  const job = await generationQueue.getJob(siteJobId).catch(() => null);
  const clientId: string | undefined = job?.data?.clientId;
  if (!clientId) {
    console.warn(`⚠️ [CLEANUP] No se pudo resolver clientId para job ${siteJobId}. Se omite la limpieza de recursos.`);
    return;
  }

  // 1. Contenedor de previsualización
  try {
    const container = docker.getContainer(`avialo-preview-${clientId}`);
    await container.remove({ force: true });
    console.log(`🗑️ [CLEANUP] Contenedor avialo-preview-${clientId} eliminado.`);
  } catch {
    // No existe — nada que hacer
  }

  // 2. Esquema multi-tenant
  await dropTenantSchema(clientId).catch((err) =>
    console.error(`⚠️ [CLEANUP] Error al eliminar el esquema del tenant ${clientId}:`, err)
  );

  // 3. Carpeta del sandbox
  await rm(path.resolve(PROJECTS_DIR, clientId), { recursive: true, force: true }).catch((err) =>
    console.error(`⚠️ [CLEANUP] Error al borrar el sandbox ${clientId}:`, err)
  );
}
