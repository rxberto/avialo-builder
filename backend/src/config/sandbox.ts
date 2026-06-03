import path from "path";

// ============================================
// RUTAS DEL SANDBOX (con soporte Docker-in-Docker)
// ============================================
// El worker corre dentro de un contenedor y crea contenedores HERMANOS hablando con el
// Docker del host vía socket. Por eso hay DOS rutas distintas para cada proyecto:
//
//   - sandboxPath()      -> ruta DENTRO del proceso/worker. Se usa para leer/escribir
//                           ficheros (fs) y para existsSync/rm.
//   - sandboxHostPath()  -> ruta EN EL HOST. Se usa SOLO en los `Binds` de Docker, porque
//                           el daemon del host resuelve los binds contra su propio FS.
//
// En desarrollo (worker en el host) ambas coinciden, así que sin configurar nada funciona.
// En producción (worker en contenedor con `../sandbox:/app/sandbox`):
//   SANDBOX_DIR=/app/sandbox            (lo que ve el worker)
//   SANDBOX_HOST_DIR=/ruta/host/sandbox (lo que ve el daemon del host)

// Base del sandbox tal como la ve el proceso del worker.
export const SANDBOX_DIR = process.env.SANDBOX_DIR || "./projects";

// Base del sandbox tal como la ve el daemon de Docker del host.
// Por defecto = ruta absoluta de SANDBOX_DIR (correcto cuando worker y daemon comparten FS).
export const SANDBOX_HOST_DIR = process.env.SANDBOX_HOST_DIR || path.resolve(SANDBOX_DIR);

/** Ruta del proyecto del cliente para acceso a ficheros desde el proceso. */
export function sandboxPath(clientId: string): string {
  return path.resolve(SANDBOX_DIR, clientId);
}

/** Ruta del proyecto del cliente EN EL HOST, para los binds de contenedores Docker. */
export function sandboxHostPath(clientId: string): string {
  return path.join(SANDBOX_HOST_DIR, clientId);
}
