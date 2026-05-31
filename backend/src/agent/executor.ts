import { readFile, writeFile } from "fs/promises";
import path from "path";
import { runCommandInContainer } from "../docker/dockerode.js";

const PROJECTS_DIR = "./projects";

/**
 * Resuelve y valida una ruta dentro del sandbox de forma segura para evitar ataques de Path Traversal
 */
function resolveSandboxPath(clientId: string, relativePath: string): string {
  const base = path.resolve(PROJECTS_DIR, clientId);
  const resolved = path.resolve(base, relativePath);

  // Seguridad: Validamos que la ruta resultante esté contenida estrictamente en la carpeta del sandbox del cliente
  if (!resolved.startsWith(base)) {
    throw new Error(`🚫 Violación de Seguridad: Intento de Path Traversal fuera del sandbox (${relativePath})`);
  }

  return resolved;
}

/**
 * Lee un archivo de texto en el sandbox del cliente
 */
export async function readSandboxFile(clientId: string, relativePath: string): Promise<string> {
  const fullPath = resolveSandboxPath(clientId, relativePath);
  return await readFile(fullPath, "utf-8");
}

/**
 * Escribe un archivo de texto en el sandbox del cliente
 */
export async function writeSandboxFile(clientId: string, relativePath: string, content: string): Promise<void> {
  const fullPath = resolveSandboxPath(clientId, relativePath);
  await writeFile(fullPath, content, "utf-8");
}

/**
 * Ejecuta un comando dentro del sandbox del cliente, SIEMPRE confinado en un contenedor
 * Docker aislado (nunca en el proceso host).
 *
 * SEGURIDAD: el código generado por la IA puede contener scripts arbitrarios (build,
 * postinstall, next.config). Ejecutarlos en el host sería una RCE directa sobre el
 * orquestador (que además monta docker.sock). Por eso delegamos en runCommandInContainer.
 *
 * @param clientId ID del cliente
 * @param command Comando a ejecutar (ej. 'npm run build')
 */
export async function runSandboxCommand(
  clientId: string,
  command: string
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  console.log(`🔨 [Sandbox: ${clientId}]: Ejecutando comando en contenedor aislado: "${command}"`);
  // El build de Next/instalación de dependencias puede tardar — timeout generoso de 5 min.
  return runCommandInContainer(clientId, command, 5 * 60 * 1000);
}
