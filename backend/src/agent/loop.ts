import { generateCode } from "./client.js";
import { writeSandboxFile, runSandboxCommand } from "./executor.js";
import { SYSTEM_PROMPT } from "../prompts/system-base.js";
import { addJobLog } from "../queue/logs.js";
import { MODELS } from "../models/router.js";
import { JobCostTracker } from "./cost.js";
import { recordJobUsage } from "./usageLog.js";
import { renderSectorDirectives } from "../prompts/sectorProfiles.js";

// Ficheros que la IA NO debe tocar: el boilerplate ya trae una base de Next.js que compila,
// y los datos del cliente los inyecta el scaffold. La IA rompe estos archivos una y otra vez
// (config truncada, globals.css inválido, layout roto, business.ts machacado) impidiendo que
// el build converja. Los ignoramos SIEMPRE y conservamos los del boilerplate/scaffold.
export const PROTECTED_FILES = new Set([
  // Configuración del proyecto
  "next.config.mjs", "next.config.js", "next.config.ts",
  "package.json", "package-lock.json",
  "tsconfig.json", "postcss.config.js", "postcss.config.mjs",
  "tailwind.config.ts", "tailwind.config.js",
  // Datos reales del cliente inyectados por el scaffold (no regenerar)
  "src/config/business.ts",
  // Estructura y estilos base: romperlos tumba todo el build
  "src/app/globals.css", "src/app/layout.tsx", "src/app/CookieBanner.tsx", "src/app/SiteHeader.tsx",
  // BACKEND FUNCIONAL (auth, paneles, reservas): si la IA lo toca, lo rompe.
  "src/auth.ts", "src/auth.config.ts", "src/lib/db.ts",
  "src/app/login/page.tsx", "src/app/register/page.tsx",
  "src/app/admin/page.tsx", "src/app/dashboard/page.tsx", "src/app/dashboard/reservar/page.tsx",
  "src/app/actions/auth.ts", "src/app/actions/booking.ts",
  // ECOMMERCE (storefront Medusa): el cableado con el Store API, carrito y pago con Stripe.
  // Si la IA reescribe estos ficheros rompe la tienda (campos del SDK, sesión de pago, etc.).
  "src/lib/medusa.ts", "src/lib/store.ts", "src/lib/cart-context.tsx",
  "src/lib/format.ts", "src/lib/brand.ts", "src/lib/tenantDb.ts", "src/lib/tenantApi.ts",
  "src/lib/promoCode.ts",
  "src/components/SiteHeader.tsx", "src/components/CookieBanner.tsx",
  "src/components/AddToCartButton.tsx", "src/components/ProductCard.tsx",
  "src/components/ProductPurchase.tsx", "src/components/StripePayment.tsx",
  "src/components/LegalPage.tsx",
  // Storefront movido al route group (store) para que /admin no herede la cabecera de la tienda.
  "src/app/(store)/layout.tsx",
  "src/app/(store)/carrito/page.tsx", "src/app/(store)/checkout/page.tsx",
  "src/app/(store)/producto/[handle]/page.tsx", "src/app/(store)/productos/page.tsx",
  "src/app/(store)/pedido/[id]/page.tsx",
  // ECOMMERCE — panel del dueño (auth NextAuth + gestión de productos vía el orquestador).
  "src/auth.ts", "src/auth.config.ts", "src/middleware.ts",
  "src/app/login/page.tsx",
  "src/app/admin/layout.tsx", "src/app/admin/page.tsx", "src/app/admin/productos/page.tsx",
  "src/app/admin/productos/nuevo/page.tsx", "src/app/admin/productos/[id]/page.tsx",
  "src/app/admin/pedidos/page.tsx", "src/app/admin/pedidos/[id]/page.tsx",
  "src/app/admin/clientes/page.tsx", "src/app/admin/clientes/[id]/page.tsx",
  "src/app/admin/colecciones/page.tsx", "src/app/admin/colecciones/[id]/page.tsx",
  "src/app/admin/categorias/page.tsx", "src/app/admin/categorias/[id]/page.tsx",
  "src/app/admin/etiquetas/page.tsx", "src/app/admin/etiquetas/[id]/page.tsx",
  "src/app/admin/descuentos/page.tsx", "src/app/admin/descuentos/[id]/page.tsx",
  "src/app/admin/ajustes/page.tsx",
  "src/app/factura/[id]/page.tsx",
  "src/components/admin/CollectionCreate.tsx", "src/components/admin/CollectionDetailView.tsx",
  "src/components/admin/CategoryCreate.tsx", "src/components/admin/CategoryDetailView.tsx",
  "src/components/admin/TagCreate.tsx", "src/components/admin/TagDetailView.tsx",
  "src/components/admin/AdminNav.tsx", "src/components/admin/ProductList.tsx",
  "src/components/admin/ProductEditor.tsx", "src/components/admin/ProductDetailView.tsx",
  "src/components/admin/OrderDetailView.tsx",
  "src/components/admin/PromotionCreate.tsx", "src/components/admin/PromotionDetailView.tsx",
  "src/components/admin/SettingsForm.tsx", "src/components/admin/PrintButton.tsx",
  "src/components/admin/PaymentsPanel.tsx", "src/components/RedsysRedirect.tsx",
  "src/components/admin/LogoutButton.tsx", "src/components/admin/AdminUserMenu.tsx",
  "src/lib/orderLabels.ts", "src/lib/promoLabels.ts", "src/lib/utils.ts",
  "src/components/ui/button.tsx", "src/components/ui/input.tsx", "src/components/ui/textarea.tsx",
  "src/components/ui/label.tsx", "src/components/ui/badge.tsx", "src/components/ui/card.tsx",
  "src/components/ui/select.tsx", "src/components/ui/switch.tsx", "src/components/ui/table.tsx",
  "src/components/ui/dropdown-menu.tsx", "src/components/ui/sheet.tsx",
  "src/app/api/auth/[...nextauth]/route.ts",
  "src/app/api/admin/products/route.ts", "src/app/api/admin/products/[id]/route.ts",
  "src/app/api/admin/orders/route.ts", "src/app/api/admin/orders/[id]/route.ts",
  "src/app/api/admin/orders/[id]/capture/route.ts",
  "src/app/api/admin/orders/[id]/fulfill/route.ts",
  "src/app/api/admin/orders/[id]/cancel/route.ts",
  "src/app/api/admin/orders/[id]/fulfillments/[fid]/ship/route.ts",
  "src/app/api/admin/collections/route.ts", "src/app/api/admin/collections/[id]/route.ts",
  "src/app/api/admin/collections/[id]/products/route.ts",
  "src/app/api/admin/categories/route.ts", "src/app/api/admin/categories/[id]/route.ts",
  "src/app/api/admin/categories/[id]/products/route.ts",
  "src/app/api/admin/tags/route.ts", "src/app/api/admin/tags/[id]/route.ts",
  "src/app/api/admin/tags/[id]/products/route.ts",
  "src/app/api/admin/promotions/route.ts", "src/app/api/admin/promotions/[id]/route.ts",
  "src/app/api/admin/settings/route.ts",
  "src/app/api/admin/uploads/route.ts",
  "src/app/api/admin/payments/status/route.ts",
  "src/app/api/admin/payments/connect/route.ts",
  "src/app/api/admin/payments/dashboard/route.ts",
  "src/app/api/admin/payments/settings/route.ts",
  "src/app/api/admin/payments/provider/route.ts",
  "src/app/api/admin/payments/redsys/route.ts",
  "src/app/api/store/payment-config/route.ts",
]);

/**
 * Rutas que en una tienda (ecommerce) NO debe crear la IA porque rompen el build del
 * boilerplate Next: el route group `(store)` ya define la home en `/`, así que un
 * `src/app/page.tsx` colisiona ("two parallel pages resolve to the same path"); y las
 * páginas `src/app/auth/*` son patrón de web corporativa (la tienda usa /login + (store)).
 */
function isForbiddenEcommercePath(rel: string): boolean {
  const p = rel.replace(/^\.?\//, "");
  return (
    p === "src/app/page.tsx" ||
    p === "src/app/page.jsx" ||
    p === "src/app/page.js" ||
    p.startsWith("src/app/auth/")
  );
}

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
export function cleanBuildOutput(text: string): string {
  return stripAnsi(text)
    .replace(/\r/g, "\n")                       // los \r del spinner separan frames
    .split("\n")
    .map((l) => l.replace(/[\\|/-]{2,}/g, "").trimEnd()) // residuo del spinner
    .filter((l) => l.trim() && !/^npm notice/.test(l.trim()))
    .join("\n")
    .trim();
}

/** Devuelve los últimos n caracteres (la cola es donde suele estar el error real). */
export function tail(text: string, n: number): string {
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
  // Si el cliente subió sus propias fotos (clientData.userImages), tienen prioridad sobre el stock.
  const userImages: string[] = Array.isArray(clientData.userImages) ? clientData.userImages : [];
  const sectorDirectives = renderSectorDirectives(clientData.sector, clientData.primaryColor, userImages);
  addJobLog(jobId, `🎨 Aplicando perfil de diseño para sector "${clientData.sector}".`);
  if (userImages.length) {
    addJobLog(jobId, `🖼️  Usando ${userImages.length} foto(s) propia(s) del negocio subidas por el cliente.`);
  }

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

  El proyecto YA es un Next.js 14 + TypeScript + Tailwind COMPLETO y que COMPILA. El LAYOUT ya
  incluye el HEADER (con menú responsive/hamburguesa) y el FOOTER, y YA EXISTEN las páginas
  '/servicios', '/sobre-nosotros', '/contacto', '/aviso-legal', '/privacidad' y '/cookies'.
  Tu trabajo es SOLO personalizar el contenido visible de la página de INICIO. Menos archivos = mejor.

  ⛔ PROHIBIDO devolver estos archivos (se ignorarán y solo gastan tiempo): cualquier archivo de
  configuración (next.config.*, package.json, tsconfig.json, postcss.config.*, tailwind.config.*),
  'src/config/business.ts', 'src/app/globals.css', 'src/app/layout.tsx' y 'src/app/CookieBanner.tsx'.
  NO crees ni modifiques páginas legales, /servicios, /contacto, /sobre-nosotros, login/admin/dashboard.
  NO añadas tu propio header, navbar ni footer en page.tsx: el layout ya los pone (saldrían duplicados).

  ✅ TAREA (haz SOLO esto):
  1. Reescribe 'src/app/page.tsx' (la home) con un diseño PREMIUM tipo Lovable/v0 y TOTALMENTE RESPONSIVE
     (mobile-first: px-4 sm:px-6 lg:px-8, text-3xl sm:text-5xl lg:text-6xl, grid-cols-1 md:grid-cols-3...).
     Calidad alta: mucho espacio en blanco, jerarquía tipográfica fuerte, tarjetas con rounded-2xl y
     shadow, gradientes sutiles, badges, iconos de lucide-react, secciones bien separadas (py-16 sm:py-24).
     Incluye en este orden: HERO impactante (con FOTO de fondo o lateral usando las imágenes reales de
     las directrices, titular + subtítulo + 2 CTAs), franja de confianza/estadísticas, SERVICIOS del
     sector (grid de tarjetas con icono), una sección con imagen + texto, TESTIMONIOS, y CTA final.
     NO repitas header ni footer (ya están en el layout); empieza por el <section> del hero.
  2. Usa las IMÁGENES REALES indicadas en las directrices con <img ... className="object-cover" /> (NO
     next/image). Toda imagen con alt descriptivo. Nada de placeholders grises ni "[imagen]".
     RENDIMIENTO: la imagen del hero con fetchPriority="high"; el RESTO de imágenes con loading="lazy"
     y decoding="async". No repitas la misma foto en todas las secciones.
  3. Color de marca: usa las clases del tema (bg-primary, text-primary, hover:bg-primary/90,
     border-primary, from-primary...) — YA están con el color del cliente. NO edites globals.css.
  4. Si troceas en componentes, créalos en 'src/components/' (TSX válido) e impórtalos con '@/components/...'.
     Importa SOLO componentes que crees en esta misma respuesta (no referencies inexistentes).
  5. Datos reales: import { businessConfig } from '@/config/business' (businessConfig.name, .sector,
     .contact.phone/email/address, y businessConfig.services -> lista {name, price, duration} reservables
     del negocio: úsalos en la sección de servicios para que coincidan con el sistema de reservas).
     NO inventes datos.

  REGLAS DE FORMATO ESTRICTAS:
  - TypeScript/TSX válido y COMPLETO por archivo (todas las llaves/etiquetas cerradas).
  - Usa SOLO dependencias ya instaladas (React, next, tailwind, lucide-react).
  - Devuelve el código EN CRUDO tras la cabecera, SIN vallas markdown (nada de \`\`\`), SIN encabezados
    (#, ##), SIN negritas (**) y SIN texto antes o después del código.

  Formato de cada archivo (obligatorio):
  [ARCHIVO: src/app/page.tsx]
  <código completo del archivo>
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
        // Bloquear SIEMPRE los ficheros protegidos: el boilerplate/scaffold trae los válidos.
        // (p.ej. la IA creando next.config.js sin output:standalone, o un globals.css roto,
        // tumbaba el build en todos los intentos).
        if (PROTECTED_FILES.has(rel)) {
          addJobLog(jobId, `   ⏭️  Protegido (ignoro la versión de la IA): ${rel}`);
          continue;
        }
        // ECOMMERCE: rutas que ROMPEN el build del boilerplate (conflicto de rutas con el
        // route group (store)). `src/app/page.tsx` resuelve a "/" IGUAL que `(store)/page.tsx`
        // → Next falla con "two parallel pages resolve to the same path". `src/app/auth/*` es
        // patrón de web corporativa; la tienda usa /login + el panel (store)/admin. La home de
        // la tienda se personaliza editando `src/app/(store)/page.tsx`, NO creando una raíz.
        if (clientData.webType === "ecommerce" && isForbiddenEcommercePath(rel)) {
          addJobLog(jobId, `   ⏭️  Ruta no válida en tienda (rompería el build): ${rel}. La home es src/app/(store)/page.tsx.`);
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
