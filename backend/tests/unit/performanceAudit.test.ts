import { describe, it, expect, beforeEach, vi } from "vitest";
import { runSiteAudit } from "../../src/services/performanceAudit.js";

function psiResponse() {
  return {
    ok: true,
    json: async () => ({
      lighthouseResult: {
        categories: {
          performance: { score: 0.92 },
          seo: { score: 1 },
          accessibility: { score: 0.88 },
          "best-practices": { score: 0.95 },
        },
        audits: {
          "largest-contentful-paint": { displayValue: "1.2 s" },
          "cumulative-layout-shift": { displayValue: "0.01" },
          "first-contentful-paint": { displayValue: "0.8 s" },
        },
      },
    }),
  };
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(psiResponse());
  vi.stubGlobal("fetch", fetchMock);
});

describe("runSiteAudit", () => {
  it("parsea los scores de Lighthouse a 0..100", async () => {
    const s = await runSiteAudit("https://parse-test.avialo.app");
    expect(s.performance).toBe(92);
    expect(s.seo).toBe(100);
    expect(s.accessibility).toBe(88);
    expect(s.bestPractices).toBe(95);
    expect(s.metrics.lcp).toBe("1.2 s");
    expect(s.metrics.cls).toBe("0.01");
  });

  it("cachea por URL (no vuelve a llamar a PSI dentro del TTL)", async () => {
    const url = "https://cache-test.avialo.app";
    await runSiteAudit(url);
    await runSiteAudit(url);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refresh=true ignora la caché y re-mide", async () => {
    const url = "https://refresh-test.avialo.app";
    await runSiteAudit(url);
    await runSiteAudit(url, true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lanza error claro si Google no devuelve lighthouseResult", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await expect(runSiteAudit("https://nolh-test.avialo.app")).rejects.toThrow(/analizar/i);
  });

  it("propaga el error de la API si responde !ok", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: { message: "cuota excedida" } }) });
    await expect(runSiteAudit("https://err-test.avialo.app")).rejects.toThrow(/cuota excedida/);
  });
});
