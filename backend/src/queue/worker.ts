import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { GenerationJobData } from "./queue.js";
import { addJobLog } from "./logs.js";
import { setJobStatus, JobStatus } from "./jobState.js";
import { scaffoldProject } from "../scaffolding/scaffold.js";
import { startPreviewContainer, prewarmImages } from "../docker/dockerode.js";
import { createTenantSchema, migrateTenantSchema, seedTenantAdmin } from "../database/tenant.js";
import { materializeUserPhotos } from "../services/uploads.js";
import { provisionTenantStore, tenantPromoCodePrefix } from "../services/medusa.js";
import { runAutocorrectionLoop } from "../agent/loop.js";
import { prisma } from "../database/client.js";
import { config } from "../config/env.js";
import { sandboxPath } from "../config/sandbox.js";
import { writeFile } from "fs/promises";
import path from "path";
import net from "net";
import { randomBytes } from "crypto";

/** Contraseña temporal legible para el admin del negocio. */
function tempPassword(): string {
  return randomBytes(6).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) + "9!";
}

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

    // Env de la storefront ecommerce (NEXT_PUBLIC_*) que se inyecta al build del preview.
    // Se rellena al aprovisionar la tienda Medusa; vacío para webs no-ecommerce.
    let storefrontEnv: string[] = [];
    // Secretos server-only del panel del cliente (token de gestión + URL del orquestador).
    // Solo runtime; nunca build ni NEXT_PUBLIC.
    let storefrontSecretEnv: string[] = [];

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

      // 1. ESTADO: generating -> Multi-tenant schema + TABLAS + admin del negocio
      addJobLog(jobId, `⚙️  [1/4] Creando base de datos multi-tenant...`);
      await createTenantSchema(clientId);

      // Crear las tablas reales (User/Appointment/...) en el esquema del cliente.
      const migration = await migrateTenantSchema(clientId);
      if (!migration.success) {
        throw new Error(`No se pudieron crear las tablas del negocio: ${migration.error}`);
      }
      addJobLog(jobId, `🗄️  Base de datos del negocio lista (reservas, usuarios, facturas).`);

      // Sembrar el admin del negocio para que el dueño pueda entrar a su panel /admin.
      const bizCtx = job.data.fullClientData?.businessContext || {};
      const adminEmail = (bizCtx.email || `admin@${city.toLowerCase().replace(/[^a-z0-9]/g, "")}.local`).toLowerCase();
      const adminPass = tempPassword();
      const seed = await seedTenantAdmin(clientId, { name: `Admin ${businessName}`, email: adminEmail, password: adminPass });
      if (seed.success) {
        addJobLog(jobId, `🔑 Acceso al PANEL ADMIN de tu web → entra en /login con: email "${adminEmail}" · contraseña "${adminPass}" (cámbiala luego).`);
      }
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

      // Ecommerce: aprovisionar la tienda en el backend Medusa COMPARTIDO.
      // Crea Sales Channel + Publishable Key aislados para este cliente y persiste la key,
      // que la storefront usará (inyectada en build/runtime) para hablar con el Store API.
      if (webType === "ecommerce") {
        addJobLog(jobId, `🛒 [1/4] Aprovisionando tienda en Medusa (canal + clave de tienda)...`);
        try {
          const store = await provisionTenantStore(clientId, { withSampleProducts: true });
          // Token máquina del panel del cliente (lo valida el orquestador → su Sales Channel).
          const storeMgmtToken = `smt_${randomBytes(24).toString("hex")}`;
          if (userId) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                medusaSalesChannelId: store.salesChannelId,
                medusaPublishableKey: store.publishableKey,
                storeMgmtToken,
              },
            });
          }
          // La storefront necesita estas NEXT_PUBLIC_* en build-time (Next las inyecta) para
          // hablar con el Store API público y pagar con Stripe en el navegador.
          storefrontEnv = [
            `NEXT_PUBLIC_MEDUSA_BACKEND_URL=${config.medusa.storefrontApiUrl}`,
            `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${store.publishableKey}`,
            // Prefijo público para reconstruir los códigos de descuento del tenant
            // al aplicarlos en el carrito (no es secreto; se deriva del Sales Channel).
            `NEXT_PUBLIC_TENANT_PROMO_PREFIX=${tenantPromoCodePrefix(store.salesChannelId)}`,
            // Provider de pago (Stripe Connect): enruta el cobro a la cuenta del tenant.
            `NEXT_PUBLIC_STRIPE_PROVIDER_ID=pp_stripe-connect_stripe`,
            ...(config.medusa.stripePublishableKey
              ? [`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${config.medusa.stripePublishableKey}`]
              : []),
          ];

          // Secretos del panel del dueño (server-only): token máquina + URL del orquestador.
          // La comisión de la plataforma (puntos básicos) la lee la ruta server de config de pago.
          storefrontSecretEnv = [
            `STORE_MGMT_TOKEN=${storeMgmtToken}`,
            `ORCHESTRATOR_URL=${config.orchestrator.internalUrl}`,
            `AVIALO_PLATFORM_FEE_BPS=${process.env.AVIALO_PLATFORM_FEE_BPS || "0"}`,
          ];

          // Persistimos las mismas variables como .env.production en el sandbox. Next lo carga
          // automáticamente en CUALQUIER build posterior (editLoop, panel ⚙️, re-generación),
          // así una edición del IDE no deja la tienda sin clave. El runtime las recibe vía el
          // env inyectado al contenedor (los .env no se leen en la salida standalone).
          await writeFile(
            path.join(sandboxPath(clientId), ".env.production"),
            storefrontEnv.join("\n") + "\n"
          ).catch((err) =>
            console.error("⚠️ No se pudo escribir .env.production de la storefront:", err)
          );

          addJobLog(jobId, `🛒 Tienda Medusa lista (canal de venta y catálogo demo creados).`);
        } catch (err: any) {
          // La tienda no puede funcionar sin esto → abortar la generación.
          throw new Error(`No se pudo aprovisionar la tienda Medusa: ${err?.message || err}`);
        }
      }

      // Copiar las fotos propias del negocio (subidas en el onboarding) a la carpeta pública
      // del proyecto y obtener sus rutas para inyectarlas en el prompt con prioridad.
      let userImages: string[] = [];
      const photoIds: string[] = job.data.fullClientData?.businessContext?.photos || [];
      if (userId && Array.isArray(photoIds) && photoIds.length) {
        try {
          userImages = await materializeUserPhotos(userId, clientId, photoIds);
          if (userImages.length) {
            addJobLog(jobId, `🖼️  ${userImages.length} foto(s) del negocio añadidas al proyecto.`);
          }
        } catch (err: any) {
          console.error("⚠️ No se pudieron copiar las fotos del cliente:", err);
        }
      }

      await setJobStatus({ jobId, state: "generating", progress: 40, updatedAt: new Date().toISOString() });

      // 2. ESTADO: building -> Invocación real del Agente IA con bucle de autocorrección
      addJobLog(jobId, `⚙️  [2/4] Invocando al agente de IA con bucle de autocorrección...`);
      await setJobStatus({ jobId, state: "building", progress: 40, updatedAt: new Date().toISOString() });

      const agentResult = await runAutocorrectionLoop(jobId, { ...job.data, userImages });

      if (!agentResult.success) {
        throw new Error(agentResult.error || "El Agente IA falló tras 5 intentos.");
      }
      await setJobStatus({ jobId, state: "building", progress: 70, updatedAt: new Date().toISOString() });

      // 3. ESTADO: preview -> Levantamiento del contenedor Docker via Dockerode
      addJobLog(jobId, `⚙️  [3/4] Levantando entorno de previsualización con Docker...`);
      await setJobStatus({ jobId, state: "preview", progress: 80, updatedAt: new Date().toISOString() });

      const freePort = await findFreePort();

      // Subdominio público del preview. En producción PREVIEW_DOMAIN_BASE=avialo.app →
      // se enruta vía Traefik en HTTPS (un iframe http://IP:port sería bloqueado por
      // contenido mixto en el panel HTTPS). Sin esa env (dev) → localhost:port.
      const slug = businessName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
      const previewBase = process.env.PREVIEW_DOMAIN_BASE || "";
      const previewHost = previewBase ? `${slug}.${previewBase}` : "";

      const preview = await startPreviewContainer(clientId, previewHost, freePort, storefrontEnv, storefrontSecretEnv);
      const previewUrl = preview.previewUrl;

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
            siteDomain: previewHost || `${slug}.avialo.app`,
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
