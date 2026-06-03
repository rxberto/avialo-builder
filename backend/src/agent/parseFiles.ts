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

  // 1) Si hay una valla de código markdown, quedarnos SOLO con su interior. Esto descarta
  //    de un plumazo cualquier prosa/encabezado que el modelo ponga antes o después
  //    (DeepSeek suele escribir "### archivo" + ```tsx ... ``` alrededor del código).
  const fenced = content.match(/```[a-zA-Z0-9_-]*[ \t]*\n([\s\S]*?)\n?```/);
  if (fenced) content = fenced[1];
  content = content.trim();

  // 2) Quitar líneas de ruido markdown sueltas al principio y al final: encabezados (#..),
  //    separadores (---, ***), negritas sueltas (**), y vallas residuales (```).
  const isNoise = (line: string): boolean => {
    const t = line.trim();
    return t === "" || /^#{1,6}\s/.test(t) || /^[-*_]{3,}$/.test(t) || /^\*{1,3}$/.test(t) || /^```/.test(t);
  };
  const lines = content.split("\n");
  while (lines.length && isNoise(lines[0])) lines.shift();
  while (lines.length && isNoise(lines[lines.length - 1])) lines.pop();

  return lines.join("\n").trim();
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
