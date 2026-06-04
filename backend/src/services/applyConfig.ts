import { readFile, writeFile, copyFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { sandboxPath } from "../config/sandbox.js";
import {
  type SiteConfig,
  type EditableConfigPatch,
  defaultBusinessConfig,
  renderBusinessTs,
  mergeEditableConfig,
  normalizeConfig,
} from "../scaffolding/businessConfig.js";
import { runSandboxCommand } from "../agent/executor.js";
import { restartPreviewContainer } from "../docker/dockerode.js";
import { setJobStatus, getJobStatus } from "../queue/jobState.js";
import { addJobLog } from "../queue/logs.js";
import { prisma } from "../database/client.js";

// ============================================
// APLICAR CONFIGURACIÓN DEL SITIO (FASE 7) — edición determinista, sin IA
// ============================================

const CONFIG_SIDECAR = "avialo.config.json";

/** Resuelve la ruta del boilerplate corporate (local o ../) para refrescar archivos de plataforma. */
function resolveCorporateBoilerplate(): string | null {
  for (const p of ["boilerplates/corporate", path.join("..", "boilerplates", "corporate")]) {
    if (existsSync(p)) return p;
  }
  return null;
}

function slugify(name: string): string {
  return (name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}

/**
 * Lee la config estructurada del sitio desde el sidecar JSON. Si no existe (sitios generados
 * antes de la Fase 7), la reconstruye desde los datos del job (idéntico a lo que generó el
 * scaffold), de forma que el panel muestra exactamente los valores actuales.
 */
export async function readSiteConfig(clientId: string, jobData: any): Promise<SiteConfig> {
  const base = sandboxPath(clientId);
  const dominio = `${slugify(jobData?.businessName || "sitio")}.avialo.app`;
  const fallback = defaultBusinessConfig({
    businessName: jobData?.businessName || "Mi negocio",
    sector: jobData?.sector || "",
    city: jobData?.city || "",
    primaryColor: jobData?.primaryColor,
    dominio,
    fullClientData: jobData?.fullClientData,
  });

  try {
    const raw = await readFile(path.join(base, CONFIG_SIDECAR), "utf-8");
    return normalizeConfig(JSON.parse(raw), fallback);
  } catch {
    return fallback; // sin sidecar → valores reconstruidos del onboarding
  }
}

/**
 * Escribe la config (determinista): regenera business.ts + sidecar y refresca los archivos de
 * plataforma (layout, ContactForm) desde el boilerplate para que sitios antiguos lean los
 * campos nuevos (seo/forms). NO toca page.tsx ni componentes generados por la IA.
 */
export async function writeSiteConfig(clientId: string, merged: SiteConfig): Promise<void> {
  const base = sandboxPath(clientId);
  const configDir = path.join(base, "src", "config");
  if (!existsSync(configDir)) await mkdir(configDir, { recursive: true });

  await writeFile(path.join(configDir, "business.ts"), renderBusinessTs(merged));
  await writeFile(path.join(base, CONFIG_SIDECAR), JSON.stringify(merged, null, 2));

  // Refrescar archivos de plataforma (protegidos = idénticos al boilerplate) para que sitios
  // antiguos soporten seo/forms. Best-effort: si falta el boilerplate, no rompemos.
  const boiler = resolveCorporateBoilerplate();
  if (boiler) {
    const refreshables = [
      ["src/app/layout.tsx", "src/app/layout.tsx"],
      ["src/app/contacto/ContactForm.tsx", "src/app/contacto/ContactForm.tsx"],
    ];
    for (const [from, to] of refreshables) {
      const src = path.join(boiler, from);
      const dest = path.join(base, to);
      // Solo refrescamos si el destino ya existe (no añadimos páginas que el sitio no tenía).
      if (existsSync(src) && existsSync(dest)) {
        await copyFile(src, dest).catch(() => {});
      }
    }
  }
}

/**
 * Aplica un patch de configuración del panel y recompila el sitio en segundo plano,
 * actualizando el estado del job para que el IDE recargue el preview.
 */
export async function applySiteConfig(
  jobId: string,
  clientId: string,
  jobData: any,
  patch: EditableConfigPatch,
  userId?: number
): Promise<{ success: boolean; error?: string }> {
  // 1) Leer + mezclar + escribir (rápido, determinista).
  const current = await readSiteConfig(clientId, jobData);
  const merged = mergeEditableConfig(current, patch);
  await writeSiteConfig(clientId, merged);
  addJobLog(jobId, `⚙️ Configuración actualizada por el cliente. Recompilando para aplicar los cambios...`);

  // 2) Rebuild + restart (lento). Estado del job para el overlay del IDE.
  const prev = await getJobStatus(jobId);
  await setJobStatus({ jobId, state: "building", progress: 40, previewUrl: prev?.previewUrl, port: prev?.port, updatedAt: new Date().toISOString() });
  if (userId) await prisma.user.update({ where: { id: userId }, data: { siteStatus: "generating" } }).catch(() => {});

  const build = await runSandboxCommand(clientId, "npm install --no-audit --no-fund --prefer-offline && npm run build");
  if (!build.success) {
    addJobLog(jobId, `❌ La recompilación tras el cambio de configuración falló.`);
    await setJobStatus({ jobId, state: "deployed", progress: 100, previewUrl: prev?.previewUrl, port: prev?.port, updatedAt: new Date().toISOString() });
    if (userId) await prisma.user.update({ where: { id: userId }, data: { siteStatus: "deployed" } }).catch(() => {});
    return { success: false, error: "No se pudo recompilar el sitio con la nueva configuración." };
  }

  await restartPreviewContainer(clientId).catch(() => {});
  await setJobStatus({ jobId, state: "deployed", progress: 100, previewUrl: prev?.previewUrl, port: prev?.port, updatedAt: new Date().toISOString() });
  if (userId) await prisma.user.update({ where: { id: userId }, data: { siteStatus: "deployed" } }).catch(() => {});
  addJobLog(jobId, `✅ Configuración aplicada y sitio actualizado.`);
  return { success: true };
}
