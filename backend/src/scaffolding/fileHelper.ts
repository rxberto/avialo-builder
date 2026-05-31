import { readdir, stat, readFile } from "fs/promises";
import path from "path";

const PROJECTS_DIR = "./projects";

/**
 * Resuelve y valida una ruta dentro del sandbox de forma segura para evitar ataques de Path Traversal
 */
export function resolveSandboxPath(clientId: string, relativePath: string): string {
  const base = path.resolve(PROJECTS_DIR, clientId);
  const resolved = path.resolve(base, relativePath);

  // Seguridad: Validamos que la ruta resultante esté contenida estrictamente en la carpeta del sandbox del cliente
  if (!resolved.startsWith(base)) {
    throw new Error(`🚫 Violación de Seguridad: Intento de Path Traversal fuera del sandbox (${relativePath})`);
  }

  return resolved;
}

export interface SandboxFileInfo {
  path: string;       // Ruta relativa (ej: 'src/App.jsx')
  name: string;       // Nombre del archivo (ej: 'App.jsx')
  isDir: boolean;     // Si es carpeta
  size?: number;      // Tamaño en bytes (si es archivo)
}

/**
 * Lista recursivamente todos los archivos de un sandbox excluyendo directorios pesados/sistemas
 */
export async function listSandboxFiles(
  clientId: string,
  dirName: string = ""
): Promise<SandboxFileInfo[]> {
  const sandboxBase = path.resolve(PROJECTS_DIR, clientId);
  const currentPath = dirName ? path.resolve(sandboxBase, dirName) : sandboxBase;

  // Evitar Path Traversal
  if (!currentPath.startsWith(sandboxBase)) {
    throw new Error(`🚫 Violación de Seguridad: Fuera del sandbox`);
  }

  const results: SandboxFileInfo[] = [];
  
  // Exclusiones estándar de carpetas de desarrollo y archivos pesados
  const EXCLUDED_DIRS = new Set([
    "node_modules",
    ".next",
    "dist",
    ".git",
    ".gemini",
    "build",
    "package-lock.json"
  ]);

  let items;
  try {
    items = await readdir(currentPath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []; // El sandbox no ha sido inicializado aún o está vacío
    }
    throw error;
  }

  for (const item of items) {
    if (EXCLUDED_DIRS.has(item)) continue;

    const absoluteItemPath = path.join(currentPath, item);
    const itemStat = await stat(absoluteItemPath);
    const relativeItemPath = path.relative(sandboxBase, absoluteItemPath).replace(/\\/g, "/");

    if (itemStat.isDirectory()) {
      // Registrar el directorio en sí
      results.push({
        path: relativeItemPath,
        name: item,
        isDir: true
      });
      // Recursión
      const subFiles = await listSandboxFiles(clientId, relativeItemPath);
      results.push(...subFiles);
    } else {
      // Registrar el archivo
      results.push({
        path: relativeItemPath,
        name: item,
        isDir: false,
        size: itemStat.size
      });
    }
  }

  // Ordenar primero carpetas, luego archivos alfabéticamente
  return results.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.path.localeCompare(b.path);
  });
}

/**
 * Lee el contenido de un archivo de texto en el sandbox del cliente
 */
export async function getSandboxFileContent(clientId: string, relativePath: string): Promise<string> {
  const fullPath = resolveSandboxPath(clientId, relativePath);
  return await readFile(fullPath, "utf-8");
}
