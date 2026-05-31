import { generateCode } from "./client.js";
import { routeUnknownTask, MODELS } from "../models/router.js";
import { writeSandboxFile, runSandboxCommand } from "./executor.js";
import { listSandboxFiles, getSandboxFileContent } from "../scaffolding/fileHelper.js";
import { SYSTEM_PROMPT } from "../prompts/system-base.js";
import { addJobLog } from "../queue/logs.js";
import { getJobStatus, setJobStatus } from "../queue/jobState.js";
import { parseFileChanges } from "./loop.js";
import { prisma } from "../database/client.js";
import { JobCostTracker } from "./cost.js";
import { recordJobUsage } from "./usageLog.js";

// Presupuesto máximo de contexto (caracteres) para no inflar el prompt de edición.
const EDIT_CONTEXT_BUDGET_CHARS = 60000;

// Archivos que casi siempre son relevantes para una edición visual/estructural.
const PRIORITY_FILE_PATTERNS = [/layout\.(tsx|jsx)/, /globals\.css/, /config\/business/, /page\.(tsx|jsx)/, /tailwind\.config/];

/**
 * Selecciona los archivos más relevantes para el prompt dentro de un presupuesto de caracteres,
 * en lugar de enviar TODO el código fuente (ahorro de tokens / coste).
 */
function selectRelevantFiles(
  files: Array<{ path: string; content: string }>,
  prompt: string,
  budgetChars: number
): Array<{ path: string; content: string }> {
  const terms = prompt.toLowerCase().split(/\W+/).filter((t) => t.length > 3);

  const scored = files.map((f) => {
    let score = 0;
    const hay = `${f.path}\n${f.content}`.toLowerCase();
    for (const t of terms) if (hay.includes(t)) score += 1;
    if (PRIORITY_FILE_PATTERNS.some((re) => re.test(f.path))) score += 5;
    return { f, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected: Array<{ path: string; content: string }> = [];
  let used = 0;
  for (const { f } of scored) {
    if (selected.length > 0 && used + f.content.length > budgetChars) continue;
    selected.push(f);
    used += f.content.length;
    if (used >= budgetChars) break;
  }
  return selected;
}

export async function runEditAutocorrectionLoop(
  jobId: string,
  clientId: string,
  userPrompt: string,
  userId?: number,
  forcedModel?: "claude" | "gemini" | "deepseek"
): Promise<{ success: boolean; error?: string }> {
  let attempts = 0;
  const maxAttempts = 5;
  let lastBuildError = "";
  
  // Actualizar el estado de progreso (persistido en Redis; setJobStatus publica el SSE).
  const updateProgress = async (state: string, progress: number) => {
    const current = await getJobStatus(jobId);
    await setJobStatus({
      jobId,
      state: state as any,
      progress,
      previewUrl: current?.previewUrl,
      port: current?.port,
      updatedAt: new Date().toISOString(),
    });
  };

  addJobLog(jobId, `🤖 [Taller Mágico]: Iniciando procesamiento del prompt de edición del cliente.`);
  addJobLog(jobId, `📝 Solicitud del usuario: "${userPrompt}"`);
  await updateProgress("generating", 20);

  // Clasificar la tarea para usar el modelo más económico y adecuado
  let preferredModel: "claude" | "gemini" | "deepseek" = forcedModel || "deepseek";
  if (!forcedModel) {
    try {
      const routing = await routeUnknownTask(userPrompt);
      preferredModel = (routing.model === "gemini" || routing.model === "gpt") ? "gemini" : "claude";
    } catch (err) {
      console.warn("⚠️ No se pudo clasificar el prompt de edición, usando Claude por defecto:", err);
      preferredModel = "claude";
    }
  }
  
  addJobLog(jobId, `🔀 Tarea de edición clasificada: Usando modelo preferido ${preferredModel.toUpperCase()} para optimizar costes.`);

  // 1. Escanear todos los archivos del sandbox para dar contexto completo
  addJobLog(jobId, `🔍 Escaneando archivos en el sandbox del proyecto...`);
  const allFiles = await listSandboxFiles(clientId);
  const sourceFiles = allFiles.filter(
    (f) => !f.isDir && /\.(tsx|ts|jsx|js|css|json)$/.test(f.path)
  );

  // Cargar contenidos de los archivos
  const loadedFiles: Array<{ path: string; content: string }> = [];
  for (const file of sourceFiles) {
    try {
      const content = await getSandboxFileContent(clientId, file.path);
      // Evitar archivos gigantescos por si acaso
      if (content.length < 30000) {
        loadedFiles.push({ path: file.path, content });
      }
    } catch (e) {}
  }

  // Selección dirigida: solo los archivos relevantes al prompt dentro del presupuesto.
  const contextFiles = selectRelevantFiles(loadedFiles, userPrompt, EDIT_CONTEXT_BUDGET_CHARS);

  addJobLog(jobId, `📁 Contexto dirigido: ${contextFiles.length}/${loadedFiles.length} archivos seleccionados por relevancia (presupuesto ${EDIT_CONTEXT_BUDGET_CHARS} chars).`);

  // Seguimiento de coste con techo por job (aborta runaways) + persistencia contable.
  const costTracker = new JobCostTracker();
  const onUsage = (u: { model: string; inputTokens: number; outputTokens: number }) => {
    costTracker.add(u);
    recordJobUsage({ jobId, userId, kind: "edit", ...u });
  };

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
      const editModelId = preferredModel === "claude" ? MODELS.CLAUDE : MODELS.GEMINI;
      const llmOutput = await generateCode(finalLLMPrompt, SYSTEM_PROMPT, preferredModel, editModelId, undefined, onUsage);
      addJobLog(jobId, `💰 Coste IA: ${costTracker.summary}`);

      // Techo de coste: abortar runaways antes de seguir gastando.
      if (costTracker.exceeded()) {
        addJobLog(jobId, `🛑 Techo de coste alcanzado (${costTracker.summary}). Abortando edición.`);
        await updateProgress("failed", 100);
        if (userId) {
          await prisma.user.update({ where: { id: userId }, data: { siteStatus: "failed" } }).catch(() => {});
        }
        return { success: false, error: "Se alcanzó el límite de coste de IA para esta edición." };
      }

      const fileChanges = parseFileChanges(llmOutput);

      if (fileChanges.length === 0) {
        addJobLog(jobId, `⚠️  Advertencia: El modelo no retornó bloques de archivos modificados.`);
        lastBuildError = "No se encontraron bloques de archivos formateados con la cabecera [ARCHIVO: ruta].";
        continue;
      }

      addJobLog(jobId, `💾 Aplicando cambios a ${fileChanges.length} archivo(s) del sandbox...`);
      await updateProgress("building", 50);

      for (const change of fileChanges) {
        addJobLog(jobId, `   ✍️  Sobrescribiendo: ${change.relativePath}`);
        await writeSandboxFile(clientId, change.relativePath, change.content);
      }

      addJobLog(jobId, `🔧 Validando estabilidad del build en contenedor aislado ('npm install && npm run build')...`);
      const buildResult = await runSandboxCommand(clientId, "npm install --no-audit --no-fund --prefer-offline && npm run build");

      if (buildResult.success) {
        addJobLog(jobId, `✅ ¡Cambios aplicados y validados con éxito en la iteración ${attempts}!`);
        await updateProgress("deployed", 100);

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
  await updateProgress("failed", 100);

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
