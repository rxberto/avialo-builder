import { describe, it, expect } from "vitest";
import { buildAssistantSystemPrompt } from "../../src/prompts/assistant.js";

describe("buildAssistantSystemPrompt", () => {
  it("web dinámica: describe panel admin con la URL real del sitio", () => {
    const out = buildAssistantSystemPrompt({
      businessName: "Bar Pepe",
      sector: "restaurante",
      city: "Madrid",
      siteType: "dinamica",
      siteDomain: "barpepe.avialo.app",
      plan: "dinamica",
    });
    expect(out).toContain("Bar Pepe");
    expect(out).toContain("DINÁMICA");
    expect(out).toContain("https://barpepe.avialo.app/login");
    expect(out).toContain("modo \"Desarrollo\"");
  });

  it("web estática: no ofrece login y menciona FormSubmit", () => {
    const out = buildAssistantSystemPrompt({
      businessName: "Abogados X",
      siteType: "corporativa",
      siteDomain: "abogadosx.avialo.app",
      plan: "corporativa",
    });
    expect(out).toContain("ESTÁTICA");
    expect(out).toContain("FormSubmit");
    expect(out).not.toContain("/login");
  });

  it("normaliza el dominio aunque venga con esquema (sin https://https://)", () => {
    const out = buildAssistantSystemPrompt({
      businessName: "Tienda",
      siteType: "ecommerce",
      siteDomain: "https://tienda.avialo.app",
    });
    expect(out).toContain("https://tienda.avialo.app");
    expect(out).not.toContain("https://https://");
  });
});
