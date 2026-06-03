import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { GenerationJobData } from "./queue.js";
import { addJobLog } from "./logs.js";
import { setJobStatus, JobStatus } from "./jobState.js";
import { scaffoldProject } from "../scaffolding/scaffold.js";
import { startPreviewContainer, prewarmImages } from "../docker/dockerode.js";
import { createTenantSchema } from "../database/tenant.js";
import { runAutocorrectionLoop } from "../agent/loop.js";
import { prisma } from "../database/client.js";
import net from "net";

// Concurrencia configurable. En un droplet pequeño cada build levanta un contenedor de
// hasta 2GB, por lo que el valor por defecto es 1 para no provocar OOM.
const GENERATION_CONCURRENCY = parseInt(process.env.GENERATION_CONCURRENCY || "1", 10);

/**
 * Busca de forma segura un puerto TCP libre en el host para enlazar el contenedor Docker
 */
async function findFreePort(startPort: number = 8081): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => {
      resolve(findFreePort(startPort + 1));
    });
    server.listen(startPort, () => {
      server.close(() => {
        resolve(startPort);
      });
    });
  });
}

// Inicialización del Worker de BullMQ
export const generationWorker = new Worker<GenerationJobData>(
  "generation-queue",
  async (job: Job<GenerationJobData>) => {
    const jobId = job.id || `job-${Date.now()}`;
    const { clientId, webType, businessName, sector, city, primaryColor, pages, userId } = job.data;

    // Estado inicial (persistido en Redis, compartido con el proceso de la API)
    await setJobStatus({
      jobId,
      state: "generating",
      progress: 10,
      updatedAt: new Date().toISOString(),
    });

    try {
      addJobLog(jobId, `🚀 Iniciando proceso de generación para "${businessName}" (Sector: ${sector})`);

      // Sincronizar estado en PostgreSQL (User.siteStatus = "generating")
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { siteStatus: "generating" }
        }).catch(err => console.error("⚠️ Error al actualizar siteStatus en DB:", err));
      }

      // 1. ESTADO: generating -> Multi-tenant schema & Scaffold
      addJobLog(jobId, `⚙️  [1/4] Creando base de datos multi-tenant...`);
      await createTenantSchema(clientId);
      await setJobStatus({ jobId, state: "generating", progress: 25, updatedAt: new Date().toISOString() });

      addJobLog(jobId, `⚙️  [1/4] Ejecutando scaffolding sobre la plantilla del boilerplate...`);
      const scaffold = await scaffoldProject(clientId, {
        webType,
        businessName,
        sector,
        city,
        primaryColor,
        pages,
        fullClientData: job.data.fullClientData,
      });

      if (!scaffold.success) {
        throw new Error(scaffold.reason || "Fallo el scaffolding base.");
      }
      await setJobStatus({ jobId, state: "generating", progress: 40, updatedAt: new Date().toISOString() });

      // 2. ESTADO: building -> Invocación real del Agente IA con bucle de autocorrección
      addJobLog(jobId, `⚙️  [2/4] Invocando al agente de IA con bucle de autocorrección...`);
      await setJobStatus({ jobId, state: "building", progress: 40, updatedAt: new Date().toISOString() });

      const agentResult = await runAutocorrectionLoop(jobId, job.data);

      if (!agentResult.success) {
        throw new Error(agentResult.error || "El Agente IA falló tras 5 intentos.");
      }
      await setJobStatus({ jobId, state: "building", progress: 70, updatedAt: new Date().toISOString() });

      // 3. ESTADO: preview -> Levantamiento del contenedor Docker via Dockerode
      addJobLog(jobId, `⚙️  [3/4] Levantando entorno de previsualización con Docker...`);
      await setJobStatus({ jobId, state: "preview", progress: 80, updatedAt: new Date().toISOString() });

      const freePort = await findFreePort();
      // Las rutas del sandbox (contenedor/host) las resuelve startPreviewContainer
      // a partir del clientId (ver config/sandbox.ts). El 2º arg queda como legado.
      await startPreviewContainer(clientId, "", freePort);

      const previewUrl = `http://localhost:${freePort}`;

      // 4. ESTADO: deployed -> Éxito total
      const finalStatus: JobStatus = {
        jobId,
        state: "deployed",
        progress: 100,
        port: freePort,
        previewUrl,
        updatedAt: new Date().toISOString(),
      };

      await setJobStatus(finalStatus);
      addJobLog(jobId, `🎉 [4/4] ¡Aplicación desplegada con éxito en modo previsualización!`);
      addJobLog(jobId, `🔗 Accede a la URL de preview: ${previewUrl}`);

      // Sincronizar éxito en PostgreSQL (User.siteStatus = "deployed")
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            siteStatus: "deployed",
            siteDomain: `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.avialo.app`,
            siteJobId: jobId
          }
        }).catch(err => console.error("⚠️ Error al guardar deployed en DB:", err));
      }

      return finalStatus;

    } catch (error: any) {
      const errorMessage = error.message || "Error desconocido en el worker.";
      console.error(`❌ Fallo en Job ${jobId}:`, error);

      await setJobStatus({
        jobId,
        state: "failed",
        progress: 100,
        error: errorMessage,
        updatedAt: new Date().toISOString(),
      });

      addJobLog(jobId, `❌ ERROR CRÍTICO durante la generación: ${errorMessage}`);

      // Sincronizar fallo en PostgreSQL (User.siteStatus = "failed")
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { siteStatus: "failed" }
        }).catch(err => console.error("⚠️ Error al guardar fallido en DB:", err));
      }

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: GENERATION_CONCURRENCY,
  }
);

// Pre-descargar las imágenes base para no hacer pull en mitad de cada generación.
prewarmImages().catch((err) => console.warn("⚠️ Prewarm de imágenes Docker falló:", err?.message));

console.log(`⚙️  Worker asíncrono de BullMQ iniciado (concurrencia=${GENERATION_CONCURRENCY})`);
