import { generateCode } from "./client.js";
import { writeSandboxFile, runSandboxCommand } from "./executor.js";
import { SYSTEM_PROMPT } from "../prompts/system-base.js";
import { addJobLog } from "../queue/logs.js";
import { MODELS } from "../models/router.js";
import { JobCostTracker } from "./cost.js";
import { recordJobUsage } from "./usageLog.js";
import { renderSectorDirectives } from "../prompts/sectorProfiles.js";

// Elimina secuencias de escape ANSI (colores/control) del output de npm/vite:
// ESC (27) + "[" + parametros + byte final. Ensucian logs e impiden que el modelo
// entienda el error de build en el prompt de correccion.
const ANSI_REGEX = new RegExp(String.fromCharCode(27) + "\[[0-9;?]*[0-9A-PR-TZcf-ntqry=><]", "g");
function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, "");
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
      for (const change of fileChanges) {
        addJobLog(jobId, `   ✍️  Modificando: ${change.relativePath}`);
        await writeSandboxFile(clientData.clientId, change.relativePath, change.content);
      }

      // Guardar de forma persistente los últimos archivos modificados para retroalimentación
      lastTouchedFiles = fileChanges;

      addJobLog(jobId, `🔧 Validando compilación en contenedor aislado ('npm install && npm run build')...`);

      // Ejecutar build en contenedor aislado. node_modules persiste en el bind mount,
      // por lo que la instalación solo es lenta en el primer intento.
      const buildResult = await runSandboxCommand(clientData.clientId, "npm install --no-audit --no-fund --prefer-offline && npm run build");

      if (buildResult.success) {
        addJobLog(jobId, `✅ Compilación completada con éxito en el intento ${attempts}!`);
        return { success: true, attempts };
      } else {
        // Limpiar códigos de color ANSI: ensucian los logs y, sobre todo, impiden que el
        // modelo entienda el error en el prompt de corrección del siguiente intento.
        lastBuildError = stripAnsi(buildResult.stderr || buildResult.stdout || "Error de compilación desconocido.");
        addJobLog(jobId, `⚠️  Fallo en la validación: ${lastBuildError.substring(0, 200)}...`);
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
    error: `Se alcanzó el número máximo de intentos (${maxAttempts}). Último error: ${lastBuildError.substring(0, 300)}`,
  };
}
