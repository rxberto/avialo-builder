import { readFile, writeFile } from "fs/promises";
import path from "path";
import { exec } from "child_process";

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
 * Ejecuta un comando de forma segura dentro de la carpeta del sandbox del cliente
 * 
 * @param clientId ID del cliente
 * @param command Comando a ejecutar (ej. 'npm run build')
 */
export async function runSandboxCommand(
  clientId: string,
  command: string
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  const sandboxDir = path.resolve(PROJECTS_DIR, clientId);

  console.log(`🔨 [Sandbox: ${clientId}]: Ejecutando comando "${command}"`);

  return new Promise((resolve) => {
    // Especificamos cwd para restringir la ejecución exclusivamente a la carpeta del sandbox
    exec(command, { cwd: sandboxDir, timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        console.warn(`⚠️  Comando falló en sandbox: ${command}`, error.message);
        return resolve({
          success: false,
          stdout: stdout.toString(),
          stderr: stderr.toString() || error.message,
        });
      }

      resolve({
        success: true,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
      });
    });
  });
}
