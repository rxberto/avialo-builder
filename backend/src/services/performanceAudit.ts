// ============================================
// AUDITORÍA DE RENDIMIENTO REAL (FASE 5)
// ============================================
// Mide el rendimiento/SEO REAL del sitio desplegado usando la PageSpeed Insights API de
// Google (Lighthouse en la nube). No requiere infraestructura propia (ni Chrome headless en
// el droplet). Antes el dashboard mostraba un "94" hardcodeado aunque el sitio fallara.
//
// La PSI API funciona sin clave (con cuota limitada). Si se define PAGESPEED_API_KEY se usa
// para subir el límite. El sitio debe ser PÚBLICAMENTE accesible (las previews lo son vía
// Traefik HTTPS en *.avialo.app); en local no es alcanzable por Google → error claro.

export interface AuditScores {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  metrics: {
    lcp?: string;
    fcp?: string;
    cls?: string;
    tbt?: string;
    speedIndex?: string;
  };
  url: string;
  fetchedAt: string;
}

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h: PSI es lento y la web no cambia tan a menudo.
const PSI_TIMEOUT_MS = 30000;

const cache = new Map<string, { data: AuditScores; ts: number }>();

/** Pasa un score 0..1 de Lighthouse a 0..100 entero (o null si no viene). */
function toScore(value: unknown): number | null {
  return typeof value === "number" ? Math.round(value * 100) : null;
}

/**
 * Ejecuta una auditoría real del sitio (cacheada 1h por URL). `refresh` ignora la caché.
 * Lanza Error si Google no puede analizar la URL (p.ej. sitio no accesible públicamente).
 */
export async function runSiteAudit(url: string, refresh = false): Promise<AuditScores> {
  const cached = cache.get(url);
  if (!refresh && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const params = new URLSearchParams({ url, strategy: "mobile" });
  for (const c of ["performance", "seo", "accessibility", "best-practices"]) {
    params.append("category", c);
  }
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (apiKey) params.set("key", apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);

  let json: any;
  try {
    const res = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, { signal: controller.signal });
    json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message || `PageSpeed devolvió HTTP ${res.status}.`;
      throw new Error(msg);
    }
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("La auditoría tardó demasiado y se canceló.");
    throw new Error(err.message || "No se pudo ejecutar la auditoría.");
  } finally {
    clearTimeout(timer);
  }

  const lh = json?.lighthouseResult;
  if (!lh?.categories) {
    throw new Error("Google no pudo analizar el sitio (¿es accesible públicamente?).");
  }

  const cat = lh.categories;
  const audits = lh.audits || {};
  const data: AuditScores = {
    performance: toScore(cat.performance?.score),
    seo: toScore(cat.seo?.score),
    accessibility: toScore(cat.accessibility?.score),
    bestPractices: toScore(cat["best-practices"]?.score),
    metrics: {
      lcp: audits["largest-contentful-paint"]?.displayValue,
      fcp: audits["first-contentful-paint"]?.displayValue,
      cls: audits["cumulative-layout-shift"]?.displayValue,
      tbt: audits["total-blocking-time"]?.displayValue,
      speedIndex: audits["speed-index"]?.displayValue,
    },
    url,
    fetchedAt: new Date().toISOString(),
  };

  cache.set(url, { data, ts: Date.now() });
  return data;
}
