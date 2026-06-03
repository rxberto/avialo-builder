import { existsSync } from "fs";
import path from "path";
import { generateCode } from "./client.js";
import { writeSandboxFile, runSandboxCommand } from "./executor.js";
import { SYSTEM_PROMPT } from "../prompts/system-base.js";
import { addJobLog } from "../queue/logs.js";
import { MODELS } from "../models/router.js";
import { JobCostTracker } from "./cost.js";
import { recordJobUsage } from "./usageLog.js";
import { renderSectorDirectives } from "../prompts/sectorProfiles.js";
import { sandboxPath } from "../config/sandbox.js";

// Ficheros de configuración que el boilerplate ya trae funcionando. La IA tiende a
// regenerarlos truncados/rotos (p.ej. next.config.mjs incompleto -> el build ni arranca),
// así que si ya existen, IGNORAMOS la versión de la IA y conservamos la del boilerplate.
const PROTECTED_CONFIG = new Set([
  "next.config.mjs", "next.config.js", "next.config.ts",
  "package.json", "package-lock.json",
  "tsconfig.json", "postcss.config.js", "postcss.config.mjs",
  "tailwind.config.ts", "tailwind.config.js",
]);

// Elimina secuencias de escape ANSI (colores/control) del output de npm/vite:
// ESC (27) + "[" + parametros + byte final. Ensucian logs e impiden que el modelo
// entienda el error de build en el prompt de correccion.
const ANSI_REGEX = new RegExp(String.fromCharCode(27) + "\[[0-9;?]*[0-9A-PR-TZcf-ntqry=><]", "g");
function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, "");
}

/**
 * Limpia el output de un build (npm/next/vite): quita ANSI, frames del spinner de npm
 * (\ | / -), avisos "npm notice" y líneas vacías. Deja solo el error útil para el modelo.
 */
function cleanBuildOutput(text: string): string {
  return stripAnsi(text)
    .replace(/\r/g, "\n")                       // los \r del spinner separan frames
    .split("\n")
    .map((l) => l.replace(/[\\|/-]{2,}/g, "").trimEnd()) // residuo del spinner
    .filter((l) => l.trim() && !/^npm notice/.test(l.trim()))
    .join("\n")
    .trim();
}

/** Devuelve los últimos n caracteres (la cola es donde suele estar el error real). */
function tail(text: string, n: number): string {
  return text.length > n ? "…" + text.slice(-n) : text;
}

// parseFileChanges vive en un módulo sin efectos secundarios (testeable). Se re-exporta
// aquí para no romper los imports existentes (editLoop.ts).
export { parseFileChanges, type FileChange } from "./parseFiles.js";
import { parseFileChanges } from "./parseFiles.js";
import type { FileChange } from "./parseFiles.js";

/**
 * Orquesta el bucle de autocorrección autónomo de hasta 5 iteraciones.
 * Invoca a la IA, parsea los archivos, corre 'npm run build' y corrige errores de forma iterativa.
 * 
 * @param jobId ID del trabajo de generación
 * @param clientData Parámetros del onboarding del cliente
 */
export async function runAutocorrectionLoop(
  jobId: string,
  clientData: any
): Promise<{ success: boolean; attempts: number; error?: string }> {
  let attempts = 0;
  const maxAttempts = 5;
  let lastBuildError = "";
  let lastTouchedFiles: FileChange[] = [];

  // Seguimiento de coste con techo por job (aborta runaways de IA) + persistencia contable.
  const costTracker = new JobCostTracker();
  const onUsage = (u: { model: string; inputTokens: number; outputTokens: number }) => {
    costTracker.add(u);
    recordJobUsage({ jobId, userId: clientData.userId, kind: "generation", ...u });
  };

  addJobLog(jobId, `🧠 Iniciando bucle de generación de IA para pyme "${clientData.businessName}"`);

  // Directrices de diseño según el sector (el cliente no es diseñador → defaults sólidos).
  const sectorDirectives = renderSectorDirectives(clientData.sector, clientData.primaryColor);
  addJobLog(jobId, `🎨 Aplicando perfil de diseño para sector "${clientData.sector}".`);

  // Prompt base para guiar al modelo
  let userPrompt = `
  Hola. Necesito que personalices el código del boilerplate para un nuevo cliente.

  DATOS DE LA PYME:
  - Nombre Comercial: "${clientData.businessName}"
  - Sector/Industria: "${clientData.sector}"
  - Ubicación/Ciudad: "${clientData.city}"
  - Color de Marca Primario: "${clientData.primaryColor || '#2563EB'}"
  - Páginas requeridas: [${(clientData.pages || []).join(", ")}]

  ${sectorDirectives}

  ¡ATENCIÓN! IMPORTANTE PARA AHORRAR TIEMPO:
  Ya hemos inyectado automáticamente el archivo 'src/config/business.ts' que exporta \`businessConfig\`. Este archivo contiene todos los datos reales y de facturación del cliente (como su CIF/NIF, teléfono y dirección exactos recabados durante el checkout).
  Por favor, IMPORTA y UTILIZA siempre los datos de \`src/config/business.ts\` (ej. import { businessConfig } from '@/config/business') en el Footer, el Aviso Legal y las páginas de Contacto en lugar de inventar números de teléfono o direcciones aleatorias.

  ⛔ NO MODIFIQUES NI DEVUELVAS ARCHIVOS DE CONFIGURACIÓN: el proyecto ya viene con Next.js 14 + TypeScript + Tailwind CONFIGURADOS Y FUNCIONANDO. NO incluyas en tu respuesta 'next.config.mjs', 'package.json', 'package-lock.json', 'tsconfig.json', 'postcss.config.js' ni 'tailwind.config.ts' (serán ignorados). Usa solo las dependencias ya instaladas. Limítate a archivos de contenido y UI dentro de 'src/app/' y 'src/components/'.
  📦 FORMATO: devuelve el código de cada archivo EN CRUDO justo tras su cabecera, SIN vallas de markdown (nada de \`\`\` ni \`\`\`tsx) y SIN texto extra antes o después.

  TAREA:
  1. Personaliza la página de inicio (Hero con título e imagen ilustrativa, servicios específicos de su sector, sección de testimonios comerciales).
  2. Ajusta el aviso legal, aviso de cookies y sitemaps para consumir el CIF de 'src/config/business.ts'.
  3. Si es de tipo corporativa con Next.js, escribe archivos TSX/CSS necesarios bajo la carpeta 'src/app/' para darle un estilo modernizado y premium.
  4. Si es de tipo ecommerce, edita el storefront para amoldar la paleta de colores.
  
  Devuelve la lista completa de archivos a modificar utilizando obligatoriamente la cabecera:
  [ARCHIVO: ruta/relativa/archivo]
  <código completo>
  `;

  while (attempts < maxAttempts) {
    attempts++;
    addJobLog(jobId, `⚙️  [Intento ${attempts}/${maxAttempts}] Llamando al modelo de IA...`);

    if (attempts > 1) {
      // Prompt correctivo con feedback de errores
      userPrompt = `
      El build de la iteración anterior ha fallado. Necesitamos corregir los errores de compilación o linter inmediatamente.
      
      ❌ ERROR DEL COMPILADOR / LINTER:
      ${lastBuildError}

      📁 ARCHIVOS QUE MODIFICASTE EN EL INTENTO ANTERIOR:
      ${lastTouchedFiles.map(f => `\n[ARCHIVO: ${f.relativePath}]\n${f.content}\n`).join("\n")}

      INSTRUCCIONES DE CORRECCIÓN:
      1. Revisa los archivos que causaron el error y corrige la sintaxis de TypeScript, declaraciones ausentes, rutas de imports rotas o etiquetas desalineadas.
      2. Devuelve únicamente los archivos corregidos con la misma estructura:
         [ARCHIVO: ruta/relativa/archivo]
         <código completo>
      `;
    }

    try {
      // Optimizar costes usando Gemini para webs sencillas (corporativa/landing) y Claude para complejas
      const preferredModel = (clientData.webType === "ecommerce" || clientData.webType === "dinamica")
        ? "claude"
        : "gemini";

      // El modelId concreto procede del router (MODELS), fuente única de verdad.
      const modelId = preferredModel === "claude" ? MODELS.CLAUDE : MODELS.GEMINI;
      // Nota: si LLM_PRIMARY está fijado, la cascada (generateCode) usa ese proveedor;
      // este es solo el tier "preferido" según el tipo de web.
      addJobLog(jobId, `🤖 Tier preferido ${preferredModel.toUpperCase()} para tipo ${clientData.webType} (el proveedor real lo decide la cascada/LLM_PRIMARY).`);

      const llmOutput = await generateCode(userPrompt, SYSTEM_PROMPT, preferredModel, modelId, undefined, onUsage);
      addJobLog(jobId, `💰 Coste IA: ${costTracker.summary}`);

      // Techo de coste: abortar antes de seguir gastando.
      if (costTracker.exceeded()) {
        addJobLog(jobId, `🛑 Techo de coste alcanzado (${costTracker.summary}). Abortando generación.`);
        return { success: false, attempts, error: "Se alcanzó el límite de coste de IA para esta generación." };
      }

      // Parsear bloques de archivos
      const fileChanges = parseFileChanges(llmOutput);

      if (fileChanges.length === 0) {
        addJobLog(jobId, `⚠️  Advertencia: El modelo no devolvió ningún archivo formateado con [ARCHIVO:...].`);
        // Si es la primera iteración, forzamos reintento simulado. De lo contrario fallamos.
        lastBuildError = "No se encontraron bloques de archivos formateados con la cabecera [ARCHIVO: ruta].";
        continue;
      }

      addJobLog(jobId, `💾 Escribiendo ${fileChanges.length} archivo(s) modificado(s) en el sandbox...`);
      const writtenChanges: FileChange[] = [];
      for (const change of fileChanges) {
        const rel = change.relativePath.replace(/^\.?\//, "");
        // Proteger los ficheros de config del boilerplate (ya funcionan) frente a
        // versiones rotas/truncadas de la IA.
        if (PROTECTED_CONFIG.has(rel) && existsSync(path.join(sandboxPath(clientData.clientId), rel))) {
          addJobLog(jobId, `   ⏭️  Conservando config del boilerplate (ignoro cambio de la IA): ${rel}`);
          continue;
        }
        // No sobrescribir con un archivo vacío (p.ej. si la IA solo devolvió ruido markdown
        // que al limpiarse quedó en nada): rompería el build (package.json vacío, etc.).
        if (!change.content.trim()) {
          addJobLog(jobId, `   ⏭️  Ignorando archivo vacío devuelto por la IA: ${rel}`);
          continue;
        }
        addJobLog(jobId, `   ✍️  Modificando: ${change.relativePath}`);
        await writeSandboxFile(clientData.clientId, change.relativePath, change.content);
        writtenChanges.push(change);
      }

      // Guardar de forma persistente los últimos archivos modificados para retroalimentación
      lastTouchedFiles = writtenChanges;

      addJobLog(jobId, `🔧 Validando compilación en contenedor aislado ('npm install && npm run build')...`);

      // Ejecutar build en contenedor aislado. node_modules persiste en el bind mount,
      // por lo que la instalación solo es lenta en el primer intento.
      const buildResult = await runSandboxCommand(clientData.clientId, "npm install --no-audit --no-fund --prefer-offline && npm run build");

      if (buildResult.success) {
        addJobLog(jobId, `✅ Compilación completada con éxito en el intento ${attempts}!`);
        return { success: true, attempts };
      } else {
        // Limpiar ANSI + ruido de npm para que el log y el prompt de corrección muestren
        // el error real de Next/Vite (que suele estar al FINAL del output).
        lastBuildError = cleanBuildOutput(buildResult.stderr || buildResult.stdout || "Error de compilación desconocido.");
        addJobLog(jobId, `⚠️  Fallo en la validación (intento ${attempts}): ${tail(lastBuildError, 600)}`);
      }

    } catch (err: any) {
      lastBuildError = err.message || "Error al comunicarse con la API de IA.";
      addJobLog(jobId, `⚠️  Error de comunicación con la IA: ${lastBuildError}`);
    }
  }

  // Si agotamos los intentos
  addJobLog(jobId, `❌ El bucle de autocorrección se completó sin éxito tras ${maxAttempts} intentos.`);
  return {
    success: false,
    attempts,
    error: `Se alcanzó el número máximo de intentos (${maxAttempts}). Último error: ${tail(lastBuildError, 400)}`,
  };
}
