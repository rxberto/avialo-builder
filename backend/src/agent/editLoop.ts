import { generateCode } from "./client.js";
import { writeSandboxFile, runSandboxCommand } from "./executor.js";
import { listSandboxFiles, getSandboxFileContent } from "../scaffolding/fileHelper.js";
import { SYSTEM_PROMPT } from "../prompts/system-base.js";
import { addJobLog, jobLogEmitter } from "../queue/logs.js";
import { jobStatuses } from "../queue/worker.js";
import { parseFileChanges } from "./loop.js";
import { prisma } from "../database/client.js";

export async function runEditAutocorrectionLoop(
  jobId: string,
  clientId: string,
  userPrompt: string,
  userId?: number
): Promise<{ success: boolean; error?: string }> {
  let attempts = 0;
  const maxAttempts = 5;
  let lastBuildError = "";
  
  // Actualizar el estado de progreso
  const updateProgress = (state: string, progress: number) => {
    const current = jobStatuses.get(jobId);
    const updated = {
      jobId,
      state: state as any,
      progress,
      previewUrl: current?.previewUrl,
      port: current?.port,
      updatedAt: new Date().toISOString(),
    };
    jobStatuses.set(jobId, updated);
    // Emitir por SSE
    jobLogEmitter.emit(`progress:${jobId}`, {
      status: state,
      progress,
      previewUrl: current?.previewUrl,
    });
  };

  addJobLog(jobId, `🤖 [Taller Mágico]: Iniciando procesamiento del prompt de edición del cliente.`);
  addJobLog(jobId, `📝 Solicitud del usuario: "${userPrompt}"`);
  updateProgress("generating", 20);

  // 1. Escanear todos los archivos del sandbox para dar contexto completo
  addJobLog(jobId, `🔍 Escaneando archivos en el sandbox del proyecto...`);
  const allFiles = await listSandboxFiles(clientId);
  const sourceFiles = allFiles.filter(
    (f) => !f.isDir && /\.(tsx|ts|jsx|js|css|json)$/.test(f.path)
  );

  // Cargar contenidos de los archivos
  const contextFiles: Array<{ path: string; content: string }> = [];
  for (const file of sourceFiles) {
    try {
      const content = await getSandboxFileContent(clientId, file.path);
      // Evitar archivos gigantescos por si acaso
      if (content.length < 30000) {
        contextFiles.push({ path: file.path, content });
      }
    } catch (e) {}
  }

  addJobLog(jobId, `📁 Contexto del proyecto cargado: ${contextFiles.length} archivos de código.`);

  // Generar prompt
  let finalLLMPrompt = `
  El usuario desea realizar cambios en su página web B2B activa.
  
  INSTRUCCIÓN DE EDICIÓN DEL USUARIO:
  "${userPrompt}"
  
  CÓDIGO FUENTE ACTUAL DEL PROYECTO:
  A continuación tienes la lista completa de todos los archivos del proyecto con su ruta relativa y su contenido de código actual.
  Analízalos con total cuidado para entender el flujo, los componentes y la estructura visual.
  
  ${contextFiles
    .map(
      (f) => `
  [ARCHIVO: ${f.path}]
  ${f.content}
  `
    )
    .join("\n")}
  
  TAREA DEL ASISTENTE DE IA:
  1. Modifica exclusivamente los archivos necesarios para cumplir fielmente con la instrucción del usuario.
  2. Ofrece un diseño premium con estética Silicon Valley (estilo Lovable/v0), animaciones de calidad, paleta HSL impecable y textos en estricto español B2B profesional.
  3. Devuelve los archivos modificados con su código completo utilizando OBLIGATORIAMENTE la cabecera:
     [ARCHIVO: ruta/relativa/archivo]
     <código completo corregido>
  `;

  while (attempts < maxAttempts) {
    attempts++;
    addJobLog(jobId, `⚙️  [Edición - Intento ${attempts}/${maxAttempts}] Invocando modelo de IA...`);

    if (attempts > 1) {
      finalLLMPrompt = `
      El build de la iteración anterior ha fallado. Corrige los errores inmediatamente.
      
      ❌ ERROR DEL COMPILADOR / LINTER:
      ${lastBuildError}

      INSTRUCCIONES DE CORRECCIÓN:
      1. Revisa los archivos que causaron el error y corrige la sintaxis de TypeScript, declaraciones ausentes, rutas de imports rotas o etiquetas JSX desalineadas.
      2. Devuelve únicamente los archivos corregidos con la misma estructura:
         [ARCHIVO: ruta/relativa/archivo]
         <código completo corregido>
      `;
    }

    try {
      const llmOutput = await generateCode(finalLLMPrompt, SYSTEM_PROMPT, "claude");
      const fileChanges = parseFileChanges(llmOutput);

      if (fileChanges.length === 0) {
        addJobLog(jobId, `⚠️  Advertencia: El modelo no retornó bloques de archivos modificados.`);
        lastBuildError = "No se encontraron bloques de archivos formateados con la cabecera [ARCHIVO: ruta].";
        continue;
      }

      addJobLog(jobId, `💾 Aplicando cambios a ${fileChanges.length} archivo(s) del sandbox...`);
      updateProgress("building", 50);

      for (const change of fileChanges) {
        addJobLog(jobId, `   ✍️  Sobrescribiendo: ${change.relativePath}`);
        await writeSandboxFile(clientId, change.relativePath, change.content);
      }

      addJobLog(jobId, `🔧 Validando estabilidad del build ('npm run build')...`);
      const buildResult = await runSandboxCommand(clientId, "npm run build");

      if (buildResult.success) {
        addJobLog(jobId, `✅ ¡Cambios aplicados y validados con éxito en la iteración ${attempts}!`);
        updateProgress("deployed", 100);

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { siteStatus: "deployed" }
          }).catch(err => console.error("⚠️ Error al actualizar siteStatus a deployed en DB:", err));
        }

        return { success: true };
      } else {
        lastBuildError = buildResult.stderr || buildResult.stdout || "Error de compilación desconocido.";
        addJobLog(jobId, `⚠️  Error de compilación en el build: ${lastBuildError.substring(0, 150)}...`);
      }

    } catch (error: any) {
      lastBuildError = error.message || "Error desconocido al procesar con IA.";
      addJobLog(jobId, `⚠️  Fallo de comunicación con IA: ${lastBuildError}`);
    }
  }

  addJobLog(jobId, `❌ El bucle de edición asíncrono no pudo compilar tras ${maxAttempts} intentos.`);
  updateProgress("failed", 100);

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { siteStatus: "failed" }
    }).catch(err => console.error("⚠️ Error al actualizar siteStatus a failed en DB:", err));
  }

  return {
    success: false,
    error: `No se pudo compilar el build tras ${maxAttempts} intentos. Último error: ${lastBuildError.substring(0, 200)}`,
  };
}
