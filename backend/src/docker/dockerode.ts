import Docker from "dockerode";
import { existsSync, promises as fs } from "fs";
import path from "path";
import { addJobLog } from "../queue/logs.js";

// Inicialización de Dockerode conectado al Named Pipe de Windows o socket de Linux
const isWindows = process.platform === "win32";
const socketPath = isWindows ? "//./pipe/docker_engine" : "/var/run/docker.sock";

export const docker = new Docker({ socketPath });

/**
 * Arranca un contenedor Docker ligero para previsualizar el sitio web generado.
 * 
 * @param clientId ID del cliente
 * @param projectPath Ruta absoluta de la carpeta del proyecto
 * @param port Puerto libre en el host para enlazar el contenedor
 */
export async function startPreviewContainer(
  clientId: string,
  projectPath: string,
  port: number
): Promise<{ containerId: string; port: number; image: string }> {
  const containerName = `avialo-preview-${clientId}`;
  const absolutePath = path.resolve(projectPath);

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
  const isStatic = existsSync(path.join(absolutePath, "index.html")) && !existsSync(path.join(absolutePath, "package.json"));
  
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
    addJobLog(clientId, `🚀 Creando contenedor NGINX con puerto: ${port}`);
    const container = await docker.createContainer({
      Image,
      name: containerName,
      ExposedPorts,
      HostConfig: {
        Binds: [`${absolutePath}:/usr/share/nginx/html:ro`],
        PortBindings,
        Memory: 128 * 1024 * 1024, // 128MB
      },
    });
    await container.start();
    addJobLog(clientId, `✅ Contenedor NGINX iniciado con ID: ${container.id.substring(0, 12)}`);
    return { containerId: container.id, port, image: Image };
  }

  // FLUJO DINÁMICO ASIMÉTRICO (Node.js / Next.js)
  let buildCmd = ["sh", "-c", "cd /usr/src/app && npm install && npm run build"];
  let runtimeCmd = ["sh", "-c", "cd /usr/src/app && cp -r public .next/standalone/ 2>/dev/null || true && cp -r .next/static .next/standalone/.next/ 2>/dev/null || true && HOSTNAME=0.0.0.0 PORT=3000 node .next/standalone/server.js"];

  if (existsSync(path.join(absolutePath, "storefront"))) {
    buildCmd = ["sh", "-c", "cd /usr/src/app/storefront && npm install && npm run build"];
    runtimeCmd = ["sh", "-c", "cd /usr/src/app/storefront && cp -r public .next/standalone/ 2>/dev/null || true && cp -r .next/static .next/standalone/.next/ 2>/dev/null || true && HOSTNAME=0.0.0.0 PORT=3000 node .next/standalone/server.js"];
  }

  // Fase 1: BUILD CONTAINER (2GB RAM)
  addJobLog(clientId, `🏗️ [FASE 1] Lanzando contenedor efímero de Build (Límite: 2GB RAM)`);
  const buildContainer = await docker.createContainer({
    Image,
    Cmd: buildCmd,
    HostConfig: {
      Binds: [`${absolutePath}:/usr/src/app`],
      Memory: 2147483648, // 2GB
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
    const modulesPath = existsSync(path.join(absolutePath, "storefront")) 
      ? path.join(absolutePath, "storefront", "node_modules") 
      : path.join(absolutePath, "node_modules");
    await fs.rm(modulesPath, { recursive: true, force: true });
    addJobLog(clientId, `✅ [FASE 2] Limpieza completada.`);
  } catch (err: any) {
    addJobLog(clientId, `⚠️ [FASE 2] Aviso: No se pudo eliminar node_modules: ${err.message}`);
  }

  // Fase 3: RUNTIME CONTAINER (256MB RAM)
  addJobLog(clientId, `🚀 [FASE 3] Lanzando contenedor Runtime (Límite: 256MB RAM) en puerto ${port}`);
  const runtimeContainer = await docker.createContainer({
    Image,
    name: containerName,
    Cmd: runtimeCmd,
    ExposedPorts,
    HostConfig: {
      Binds: [`${absolutePath}:/usr/src/app`],
      PortBindings,
      Memory: 268435456, // 256MB RAM
    },
  });

  await runtimeContainer.start();
  addJobLog(clientId, `✅ [FASE 3] Contenedor de producción iniciado con ID: ${runtimeContainer.id.substring(0, 12)}`);

  return {
    containerId: runtimeContainer.id,
    port,
    image: Image,
  };
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
