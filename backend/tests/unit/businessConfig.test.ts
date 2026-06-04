import { describe, it, expect } from "vitest";
import {
  defaultBusinessConfig,
  renderBusinessTs,
  mergeEditableConfig,
  normalizeConfig,
  type SiteConfig,
} from "../../src/scaffolding/businessConfig.js";

const sample: SiteConfig = defaultBusinessConfig({
  businessName: "Bar Pepe",
  sector: "restaurante",
  city: "Madrid",
  primaryColor: "#ff0000",
  dominio: "barpepe.avialo.app",
});

describe("defaultBusinessConfig", () => {
  it("construye la config con los datos del onboarding", () => {
    expect(sample.name).toBe("Bar Pepe");
    expect(sample.city).toBe("Madrid");
    expect(sample.theme.primaryColor).toBe("#ff0000");
    expect(sample.contact.email).toContain("barpepe.avialo.app");
    expect(sample.services.length).toBeGreaterThan(0);
    expect(sample.seo).toEqual({ title: "", description: "" });
    expect(sample.forms).toEqual({ provider: "none", email: "" });
  });
});

describe("renderBusinessTs", () => {
  it("emite TS con un objeto JSON válido y fiel a la config", () => {
    const ts = renderBusinessTs(sample);
    expect(ts).toContain("export const businessConfig =");
    const json = ts.slice(ts.indexOf("{"), ts.lastIndexOf("}") + 1);
    expect(JSON.parse(json)).toEqual(sample);
  });

  it("escapa valores con comillas/saltos sin romper el archivo", () => {
    const tricky = mergeEditableConfig(sample, { name: 'A"B\nC', seo: { description: 'Línea1\n"x"' } });
    const ts = renderBusinessTs(tricky);
    const json = ts.slice(ts.indexOf("{"), ts.lastIndexOf("}") + 1);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json).name).toBe('A"B\nC');
  });
});

describe("mergeEditableConfig (whitelist)", () => {
  it("aplica solo campos permitidos y saneados", () => {
    const next = mergeEditableConfig(sample, {
      name: "  Nuevo Nombre  ",
      contact: { email: "hola@bar.es" },
      seo: { title: "Mi título" },
      forms: { provider: "formsubmit", email: "dueno@bar.es" },
    });
    expect(next.name).toBe("Nuevo Nombre");
    expect(next.contact.email).toBe("hola@bar.es");
    expect(next.contact.phone).toBe(sample.contact.phone); // no tocado
    expect(next.seo.title).toBe("Mi título");
    expect(next.forms).toEqual({ provider: "formsubmit", email: "dueno@bar.es" });
  });

  it("ignora campos NO permitidos (sector, theme, services)", () => {
    const next = mergeEditableConfig(sample, { sector: "hackeado", theme: { primaryColor: "#000" }, services: [] } as any);
    expect(next.sector).toBe(sample.sector);
    expect(next.theme.primaryColor).toBe(sample.theme.primaryColor);
    expect(next.services).toEqual(sample.services);
  });

  it("normaliza provider inválido a 'none'", () => {
    const next = mergeEditableConfig(sample, { forms: { provider: "smtp_hack" as any } });
    expect(next.forms.provider).toBe("none");
  });
});

describe("normalizeConfig", () => {
  it("rellena seo/forms ausentes desde el fallback (sitios antiguos)", () => {
    const old = { name: "Viejo", contact: { phone: "1", email: "a@b.c", address: "x" } };
    const norm = normalizeConfig(old, sample);
    expect(norm.name).toBe("Viejo");
    expect(norm.seo).toEqual({ title: "", description: "" });
    expect(norm.forms.provider).toBe("none");
    expect(norm.services).toEqual(sample.services); // heredado del fallback
  });
});
