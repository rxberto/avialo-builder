import { generateCode } from "./client.js";
import { writeSandboxFile, runSandboxCommand } from "./executor.js";
import { SYSTEM_PROMPT } from "../prompts/system-base.js";
import { addJobLog } from "../queue/logs.js";

export interface FileChange {
  relativePath: string;
  content: string;
}

/**
 * Parsea el output de texto del LLM para extraer los bloques de archivos estructurados.
 * Formato esperado del LLM: [ARCHIVO: ruta/al/archivo.ts] seguido del código completo.
 * 
 * @param llmOutput Texto sin procesar devuelto por el modelo
 */
export function parseFileChanges(llmOutput: string): FileChange[] {
  const changes: FileChange[] = [];
  
  // Expresión regular para capturar la cabecera del archivo de forma limpia
  const fileRegex = /\[ARCHIVO:\s*([^\]\s]+)\]/g;
  
  const matches: { index: number; relativePath: string }[] = [];
  let match;
  
  while ((match = fileRegex.exec(llmOutput)) !== null) {
    matches.push({
      index: match.index,
      relativePath: match[1].trim(),
    });
  }

  // Extraer el contenido de cada archivo entre cabeceras consecutivas
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    
    // El inicio del contenido del archivo es justo después de la cabecera actual
    const headerOffset = `[ARCHIVO: ${current.relativePath}]`.length;
    
    const start = current.index + headerOffset;
    const end = next ? next.index : llmOutput.length;
    
    let content = llmOutput.substring(start, end).trim();

    // Limpieza de bloques de código de markdown opcionales que el LLM inyecte por error
    if (content.startsWith("```")) {
      content = content.replace(/^```[a-zA-Z0-9-]*\n/, "").replace(/\n```$/, "");
    }

    changes.push({
      relativePath: current.relativePath,
      content,
    });
  }

  return changes;
}

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

  addJobLog(jobId, `🧠 Iniciando bucle de generación de IA para pyme "${clientData.businessName}"`);

  // Prompt base para guiar al modelo
  let userPrompt = `
  Hola Claude. Necesito que personalices el código del boilerplate para un nuevo cliente.
  
  DATOS DE LA PYME:
  - Nombre Comercial: "${clientData.businessName}"
  - Sector/Industria: "${clientData.sector}"
  - Ubicación/Ciudad: "${clientData.city}"
  - Color de Marca Primario: "${clientData.primaryColor || '#2563EB'}"
  - Páginas requeridas: [${(clientData.pages || []).join(", ")}]

  TAREA:
  1. Personaliza la página de inicio (Hero con título e imagen ilustrativa, servicios específicos de su sector, sección de testimonios comerciales).
  2. Ajusta el aviso legal, aviso de cookies y sitemaps.
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
      // Llamar al cliente unificado LLM (Claude como principal)
      const llmOutput = await generateCode(userPrompt, SYSTEM_PROMPT, "claude");
      
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

      addJobLog(jobId, `🔧 Validando compilación mediante 'npm run build' en el sandbox...`);
      
      // Ejecutar build asíncrono
      const buildResult = await runSandboxCommand(clientData.clientId, "npm run build");

      if (buildResult.success) {
        addJobLog(jobId, `✅ Compilación completada con éxito en el intento ${attempts}!`);
        return { success: true, attempts };
      } else {
        lastBuildError = buildResult.stderr || buildResult.stdout || "Error de compilación desconocido.";
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
