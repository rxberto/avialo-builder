export interface FileChange {
  relativePath: string;
  content: string;
}

/**
 * Parsea el output de texto del LLM para extraer los bloques de archivos estructurados.
 * Formato esperado del LLM: [ARCHIVO: ruta/al/archivo.ts] seguido del código completo.
 *
 * Módulo SIN efectos secundarios (no importa Docker/Redis/SDKs) para ser fácilmente testeable.
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
