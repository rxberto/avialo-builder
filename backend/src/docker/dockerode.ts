import Docker from "dockerode";
import { existsSync, promises as fs } from "fs";
import path from "path";
import { addJobLog } from "../queue/logs.js";
import { config } from "../config/env.js";
import { sandboxPath, sandboxHostPath } from "../config/sandbox.js";

// Inicialización de Dockerode conectado al Named Pipe de Windows o socket de Linux
const isWindows = process.platform === "win32";
const socketPath = isWindows ? "//./pipe/docker_engine" : "/var/run/docker.sock";

export const docker = new Docker({ socketPath });

/**
 * Asegura que una imagen Docker esté disponible localmente, descargándola si falta.
 */
async function ensureImage(image: string): Promise<void> {
  try {
    await docker.getImage(image).inspect();
    return; // Ya existe
  } catch {
    // No existe localmente — hacemos pull
  }
  await new Promise<void>((resolve, reject) => {
    docker.pull(image, {}, (err, stream) => {
      if (err) return reject(err);
      if (!stream) return reject(new Error("No se pudo iniciar el stream de pull."));
      docker.modem.followProgress(stream, (e: any) => (e ? reject(e) : resolve()));
    });
  });
}

// Límites de memoria configurables (un droplet pequeño no soporta varios builds de 2GB).
const BUILD_MEMORY_BYTES = parseInt(process.env.BUILD_MEMORY_BYTES || `${2 * 1024 * 1024 * 1024}`, 10); // 2GB
const RUNTIME_MEMORY_BYTES = parseInt(process.env.RUNTIME_MEMORY_BYTES || `${256 * 1024 * 1024}`, 10); // 256MB

/**
 * Pre-descarga las imágenes base usadas por el pipeline para evitar el pull en caliente
 * durante cada generación. Se llama al arrancar el worker.
 */
export async function prewarmImages(): Promise<void> {
  for (const image of ["node:20-bookworm-slim", "nginx:alpine"]) {
    try {
      await ensureImage(image);
      console.log(`✅ Imagen Docker lista (prewarm): ${image}`);
    } catch (err: any) {
      console.warn(`⚠️ No se pudo prewarmear ${image}: ${err.message}`);
    }
  }
}

/**
 * Ejecuta un comando dentro de un contenedor Docker efímero y AISLADO, con el sandbox
 * del cliente montado como único volumen.
 *
 * SEGURIDAD: el código generado por la IA (incluidos scripts de build/postinstall, next.config, etc.)
 * NUNCA debe ejecutarse en el proceso del orquestador host. Este runner lo confina en un
 * contenedor con CapDrop=ALL, límites de memoria/PIDs y sin acceso al filesystem del host
 * más allá de la carpeta del proyecto.
 *
 * @param clientId  ID del cliente (carpeta del sandbox)
 * @param command   Comando shell a ejecutar dentro de /usr/src/app
 * @param timeoutMs Timeout duro; al excederse se detiene el contenedor
 */
export async function runCommandInContainer(
  clientId: string,
  command: string,
  timeoutMs: number = 120000
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  // Bind para Docker: ruta EN EL HOST (el daemon resuelve binds contra el FS del host).
  const absolutePath = sandboxHostPath(clientId);
  const Image = "node:20-bookworm-slim";

  try {
    await ensureImage(Image);
  } catch (err: any) {
    console.warn(`⚠️ No se pudo asegurar la imagen ${Image} (se intentará caché local): ${err.message}`);
  }

  const container = await docker.createContainer({
    Image,
    // Tty:true => salida de texto plano combinada (sin multiplexado de 8 bytes)
    Tty: true,
    Cmd: ["sh", "-lc", `cd /usr/src/app && ${command}`],
    HostConfig: {
      Binds: [`${absolutePath}:/usr/src/app`],
      Memory: 2 * 1024 * 1024 * 1024, // 2GB
      PidsLimit: 512,
      CapDrop: ["ALL"],
      AutoRemove: false,
    },
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    container.stop({ t: 1 }).catch(() => {});
  }, timeoutMs);

  try {
    await container.start();
    const waitResult = await container.wait();

    const logBuffer = (await container.logs({ stdout: true, stderr: true, follow: false })) as unknown as Buffer;
    const output = logBuffer.toString("utf-8");

    const success = !timedOut && waitResult.StatusCode === 0;
    return {
      success,
      stdout: output,
      stderr: success ? "" : (timedOut ? `Comando excedió el timeout de ${timeoutMs}ms.\n${output}` : output),
    };
  } catch (err: any) {
    return { success: false, stdout: "", stderr: err.message || "Error ejecutando el contenedor de comando." };
  } finally {
    clearTimeout(timer);
    await container.remove({ force: true }).catch(() => {});
  }
}

/**
 * Etiquetas de Traefik para enrutar un subdominio HTTPS a un contenedor de preview.
 * Traefik (provider docker) las descubre por la red avialo-network.
 */
function traefikPreviewLabels(clientId: string, host: string, internalPort: number): Record<string, string> {
  const router = `preview-${clientId}`.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
  // Dominio base (avialo.app) para pedir UN cert wildcard *.avialo.app compartido por todas
  // las previews, en vez de uno por subdominio (evita los rate limits de Let's Encrypt).
  const base = host.split(".").slice(1).join(".") || host;
  return {
    "traefik.enable": "true",
    [`traefik.http.routers.${router}.rule`]: "Host(`" + host + "`)",
    [`traefik.http.routers.${router}.entrypoints`]: "websecure",
    [`traefik.http.routers.${router}.tls`]: "true",
    // Reto DNS de Cloudflare → permite emitir el wildcard. Sin esto saldría cert autofirmado.
    [`traefik.http.routers.${router}.tls.certresolver`]: "dns-letsencrypt",
    [`traefik.http.routers.${router}.tls.domains[0].main`]: base,
    [`traefik.http.routers.${router}.tls.domains[0].sans`]: `*.${base}`,
    [`traefik.http.services.${router}.loadbalancer.server.port`]: String(internalPort),
    "traefik.docker.network": "avialo-network",
  };
}

/**
 * Arranca un contenedor Docker ligero para previsualizar el sitio web generado.
 *
 * @param clientId    ID del cliente
 * @param previewHost Subdominio público (p.ej. "negocio.avialo.app"). Si se pasa, se
 *                    enruta vía Traefik (HTTPS); si no, se publica en localhost:port (dev).
 * @param port        Puerto libre en el host (solo se usa en modo localhost/dev)
 */
export async function startPreviewContainer(
  clientId: string,
  previewHost: string,
  port: number,
  // Variables extra (p.ej. NEXT_PUBLIC_* de la storefront ecommerce) que deben estar
  // presentes en BUILD (Next inyecta NEXT_PUBLIC_* en build-time) y en runtime.
  extraBuildEnv: string[] = [],
  // Secretos SOLO de runtime (no build, no NEXT_PUBLIC): token de gestión de la tienda y URL
  // del orquestador. Los lee el código server-side del panel del cliente, nunca el navegador.
  runtimeSecretEnv: string[] = []
): Promise<{ containerId: string; port: number; image: string; previewUrl: string }> {
  const containerName = `avialo-preview-${clientId}`;
  // fsPath: ruta que ve el worker (para existsSync/fs.rm).
  // bindPath: ruta en el host (para los Binds de los contenedores hijos).
  const fsPath = sandboxPath(clientId);
  const bindPath = sandboxHostPath(clientId);
  // Modo Traefik (producción) vs localhost (dev) según haya subdominio público.
  const useTraefik = !!previewHost;

  addJobLog(clientId, `🐳 Inicializando contenedor Docker: ${containerName}`);

  // Verificar si ya existe un contenedor con el mismo nombre y detenerlo
  try {
    const existing = docker.getContainer(containerName);
    const info = await existing.inspect();
    if (info.State.Running) {
      addJobLog(clientId, `⚠️  Contenedor previo running detectado. Deteniendo...`);
      await existing.stop();
    }
    addJobLog(clientId, `🗑️ Eliminando contenedor previo...`);
    await existing.remove();
  } catch (err) {
    // El contenedor no existía, procedemos con normalidad
  }

  // Determinar si es un sitio estático (Nginx) o dinámico/NextJS (Node)
  const isStatic = existsSync(path.join(fsPath, "index.html")) && !existsSync(path.join(fsPath, "package.json"));
  
  let Image = isStatic ? "nginx:alpine" : "node:20-bookworm-slim"; // bookworm-slim para evitar fallos OOM y glibc en build
  
  addJobLog(clientId, `⏳ Descargando imagen docker si es necesario: ${Image}...`);
  // Pull de la imagen de forma asíncrona si no existe
  try {
    await new Promise<void>((resolve, reject) => {
      docker.pull(Image, {}, (err, stream) => {
        if (err) return reject(err);
        if (!stream) return reject(new Error("No se pudo iniciar el stream."));
        docker.modem.followProgress(stream, onFinished, onProgress);
        function onFinished(err: any) { if (err) return reject(err); resolve(); }
        function onProgress() {} // Omitimos logs de progreso por ruido
      });
    });
    addJobLog(clientId, `✅ Imagen docker lista: ${Image}`);
  } catch (err: any) {
    addJobLog(clientId, `⚠️ Fallo en pull de imagen (se intentará usar caché local): ${err.message}`);
  }

  const ExposedPorts: { [port: string]: {} } = isStatic ? { "80/tcp": {} } : { "3000/tcp": {} };
  const PortBindings: { [port: string]: any } = isStatic 
    ? { "80/tcp": [{ HostPort: port.toString() }] }
    : { "3000/tcp": [{ HostPort: port.toString() }] };

  if (isStatic) {
    // FLUJO ESTÁTICO (SIMPLE)
    addJobLog(clientId, useTraefik
      ? `🚀 Creando contenedor NGINX enrutado por Traefik a https://${previewHost}`
      : `🚀 Creando contenedor NGINX con puerto: ${port}`);
    const container = await docker.createContainer({
      Image,
      name: containerName,
      ExposedPorts,
      ...(useTraefik ? { Labels: traefikPreviewLabels(clientId, previewHost, 80) } : {}),
      HostConfig: {
        Binds: [`${bindPath}:/usr/share/nginx/html:ro`],
        Memory: 128 * 1024 * 1024, // 128MB
        // Auto-recuperación: si el contenedor cae (OOM/crash) Docker lo levanta de nuevo,
        // para que el preview no quede muerto y haya que regenerar.
        RestartPolicy: { Name: "unless-stopped" },
        ...(useTraefik ? { NetworkMode: "avialo-network" } : { PortBindings }),
      },
    });
    await container.start();
    addJobLog(clientId, `✅ Contenedor NGINX iniciado con ID: ${container.id.substring(0, 12)}`);
    return {
      containerId: container.id,
      port,
      image: Image,
      previewUrl: useTraefik ? `https://${previewHost}` : `http://localhost:${port}`,
    };
  }

  // ── OPTIMIZACIÓN DE CONEXIONES Y POOLING ENTERPRISE ──
  // Construir la DATABASE_URL del tenant usando el pooler o la base del host
  let tenantDbUrl = config.database.url;
  
  // Cambiar el esquema al del tenant actual
  if (tenantDbUrl.includes("schema=")) {
    tenantDbUrl = tenantDbUrl.replace(/schema=[^&]*/, `schema=tenant_${clientId}`);
  } else {
    const separator = tenantDbUrl.includes("?") ? "&" : "?";
    tenantDbUrl = `${tenantDbUrl}${separator}schema=tenant_${clientId}`;
  }

  // Limitar el tamaño de conexiones del cliente a 3 para evitar saturar el pool global
  if (tenantDbUrl.includes("connection_limit=")) {
    tenantDbUrl = tenantDbUrl.replace(/connection_limit=[^&]*/, `connection_limit=3`);
  } else {
    tenantDbUrl = `${tenantDbUrl}&connection_limit=3`;
  }

  // Activar pgBouncer mode de Prisma si la base de datos corre en Pgbouncer (puerto 6432)
  if (tenantDbUrl.includes(":6432/") && !tenantDbUrl.includes("pgbouncer=")) {
    tenantDbUrl = `${tenantDbUrl}&pgbouncer=true`;
  }

  // FLUJO DINÁMICO ASIMÉTRICO (Node.js / Next.js)
  // Raíz del proyecto Node dentro del contenedor (algunos boilerplates viejos usan /storefront).
  const appDir = existsSync(path.join(fsPath, "storefront"))
    ? "/usr/src/app/storefront"
    : "/usr/src/app";
  const prismaDir = appDir === "/usr/src/app/storefront" ? "storefront/prisma" : "prisma";

  // node:20-bookworm-slim NO trae OpenSSL y el engine NATIVO de Prisma lo necesita (si no,
  // falla en runtime con "libssl.so.* cannot open shared object"). Solo instalamos openssl
  // cuando el proyecto usa Prisma (tiene prisma/schema.prisma); el ecommerce usa `pg` y no paga
  // este coste. Va en build (para que `prisma generate` elija el engine de OpenSSL 3) y en
  // runtime (para que cargue). ~10s una vez por sitio (los restarts reutilizan el contenedor).
  const usesPrisma = existsSync(path.join(fsPath, prismaDir, "schema.prisma"));
  const opensslSetup = usesPrisma
    ? "apt-get update && apt-get install -y --no-install-recommends openssl && "
    : "";

  const buildCmd = ["sh", "-c", `${opensslSetup}cd ${appDir} && npm install && npm run build`];
  const runtimeCmd = ["sh", "-c", `${opensslSetup}cd ${appDir} && cp -r public .next/standalone/ 2>/dev/null || true && cp -r .next/static .next/standalone/.next/ 2>/dev/null || true && HOSTNAME=0.0.0.0 PORT=3000 node .next/standalone/server.js`];

  // Fase 1: BUILD CONTAINER (2GB RAM)
  addJobLog(clientId, `🏗️ [FASE 1] Lanzando contenedor efímero de Build (Límite: 2GB RAM)`);
  const buildContainer = await docker.createContainer({
    Image,
    Cmd: buildCmd,
    Env: [
      `DATABASE_URL=${tenantDbUrl}`,
      // NEXT_PUBLIC_* de la storefront: deben existir en build-time para que Next las inyecte.
      ...extraBuildEnv,
    ],
    HostConfig: {
      Binds: [`${bindPath}:/usr/src/app`],
      Memory: BUILD_MEMORY_BYTES,
      AutoRemove: true,
    },
  });

  await buildContainer.start();
  const buildResult = await buildContainer.wait();
  
  if (buildResult.StatusCode !== 0) {
    addJobLog(clientId, `❌ Error crítico en el Build Container (Código: ${buildResult.StatusCode})`);
    throw new Error(`El proceso de build falló con código ${buildResult.StatusCode}. Verifica el sandbox.`);
  }
  addJobLog(clientId, `✅ [FASE 1] Build finalizado con éxito.`);

  // Fase 2: GARBAGE COLLECTION
  addJobLog(clientId, `🧹 [FASE 2] Eliminando node_modules del Sandbox para ahorrar recursos...`);
  try {
    const modulesPath = existsSync(path.join(fsPath, "storefront"))
      ? path.join(fsPath, "storefront", "node_modules")
      : path.join(fsPath, "node_modules");
    await fs.rm(modulesPath, { recursive: true, force: true });
    addJobLog(clientId, `✅ [FASE 2] Limpieza completada.`);
  } catch (err: any) {
    addJobLog(clientId, `⚠️ [FASE 2] Aviso: No se pudo eliminar node_modules: ${err.message}`);
  }

  // Fase 3: RUNTIME CONTAINER (256MB RAM)
  const publicUrl = useTraefik ? `https://${previewHost}` : `http://localhost:${port}`;
  addJobLog(clientId, useTraefik
    ? `🚀 [FASE 3] Lanzando Runtime enrutado por Traefik a ${publicUrl}`
    : `🚀 [FASE 3] Lanzando contenedor Runtime (Límite: 256MB RAM) en puerto ${port}`);
  const runtimeContainer = await docker.createContainer({
    Image,
    name: containerName,
    Cmd: runtimeCmd,
    ExposedPorts,
    ...(useTraefik ? { Labels: traefikPreviewLabels(clientId, previewHost, 3000) } : {}),
    Env: [
      `DATABASE_URL=${tenantDbUrl}`,
      // NextAuth v5 lee AUTH_*; mantenemos NEXTAUTH_* por compatibilidad. trustHost es
      // obligatorio detrás de Traefik o el login da UntrustedHost.
      `AUTH_SECRET=${config.auth.nextauthSecret}`,
      `AUTH_TRUST_HOST=true`,
      `AUTH_URL=${publicUrl}`,
      `NEXTAUTH_SECRET=${config.auth.nextauthSecret}`,
      `NEXTAUTH_URL=${publicUrl}`,
      // Mismas NEXT_PUBLIC_* en runtime (los Server Components de la storefront leen
      // process.env en tiempo de ejecución).
      ...extraBuildEnv,
      // Secretos server-only del panel del cliente (NO se inyectan en el build).
      ...runtimeSecretEnv,
    ],
    HostConfig: {
      Binds: [`${bindPath}:/usr/src/app`],
      Memory: RUNTIME_MEMORY_BYTES,
      // Auto-recuperación: el runtime de Next.js (256MB) es ajustado y puede caer por OOM.
      // Con unless-stopped Docker lo reinicia solo en vez de dejar el preview caído.
      RestartPolicy: { Name: "unless-stopped" },
      ...(useTraefik ? { NetworkMode: "avialo-network" } : { PortBindings }),
    },
  });

  await runtimeContainer.start();
  addJobLog(clientId, `✅ [FASE 3] Contenedor de producción iniciado con ID: ${runtimeContainer.id.substring(0, 12)}`);

  return {
    containerId: runtimeContainer.id,
    port,
    image: Image,
    previewUrl: publicUrl,
  };
}

/**
 * Reinicia el contenedor de preview de un cliente para que sirva el build recién recompilado
 * (tras una edición). El comando del contenedor vuelve a copiar estáticos y arranca server.js
 * con el nuevo .next del sandbox. Devuelve true si pudo reiniciarlo.
 */
export async function restartPreviewContainer(clientId: string): Promise<boolean> {
  const containerName = `avialo-preview-${clientId}`;
  try {
    const container = docker.getContainer(containerName);
    addJobLog(clientId, `🔄 Reiniciando contenedor de preview para servir los cambios...`);
    await container.restart({ t: 2 });
    addJobLog(clientId, `✅ Preview reiniciado con el nuevo build.`);
    return true;
  } catch (err: any) {
    addJobLog(clientId, `⚠️ No se pudo reiniciar el preview (${err.message}). Puede que no esté levantado.`);
    return false;
  }
}

/**
 * Detiene y elimina un contenedor de previsualización en ejecución
 *
 * @param containerId ID del contenedor Docker
 */
export async function stopPreviewContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    console.log(`🐳 Deteniendo contenedor Docker: ${containerId.substring(0, 12)}`);
    await container.stop();
    await container.remove();
    console.log(`✅ Contenedor Docker eliminado con éxito`);
  } catch (error: any) {
    console.error(`❌ Error al detener contenedor "${containerId}":`, error.message);
  }
}
