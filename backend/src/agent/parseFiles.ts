export interface FileChange {
  relativePath: string;
  content: string;
}

/**
 * Limpia el contenido de un archivo del ruido markdown que algunos modelos (sobre todo
 * DeepSeek) añaden: vallas de código ```lang ... ``` y líneas sueltas de "**"/"__".
 * Sin esto, un package.json puede acabar con "**" o "```json" dentro -> JSON inválido.
 */
export function cleanFileContent(raw: string): string {
  let content = raw.trim();

  // Quitar líneas que sean solo marcadores markdown (**, __, ---) al principio y al final.
  content = content.replace(/^(?:[*_-]{1,3}[ \t]*\n)+/, "");
  content = content.replace(/(?:\n[ \t]*[*_-]{1,3}[ \t]*)+$/, "");
  content = content.trim();

  // Si todo el contenido está envuelto en una valla de código, extraer el interior.
  const fenced = content.match(/^```[a-zA-Z0-9_-]*[ \t]*\n([\s\S]*?)\n?```[ \t]*$/);
  if (fenced) return fenced[1].trim();

  // Vallas de apertura/cierre sueltas (sin la pareja detectable).
  content = content.replace(/^```[a-zA-Z0-9_-]*[ \t]*\n/, "").replace(/\n?```[ \t]*$/, "");

  return content.trim();
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

    const content = cleanFileContent(llmOutput.substring(start, end));

    changes.push({
      relativePath: current.relativePath,
      content,
    });
  }

  return changes;
}
