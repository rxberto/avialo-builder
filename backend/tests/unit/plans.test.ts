import { describe, it, expect } from "vitest";
import {
  creditsForPlan,
  isAssignablePlan,
  ASSIGNABLE_PLAN_IDS,
  PLAN_CATALOG,
  DEFAULT_PLAN_CREDITS,
} from "../../src/config/plans.js";

describe("creditsForPlan", () => {
  it("devuelve el cupo canónico por plan", () => {
    expect(creditsForPlan("corporativa")).toBe(800);
    expect(creditsForPlan("dinamica")).toBe(1500);
    expect(creditsForPlan("ecommerce")).toBe(3000);
  });

  it("respeta los alias legacy (basic/pro)", () => {
    expect(creditsForPlan("basic")).toBe(800);
    expect(creditsForPlan("pro")).toBe(1500);
  });

  it("cae al valor por defecto si el plan es desconocido o nulo", () => {
    expect(creditsForPlan(undefined)).toBe(DEFAULT_PLAN_CREDITS);
    expect(creditsForPlan("inventado")).toBe(DEFAULT_PLAN_CREDITS);
    expect(creditsForPlan("none")).toBe(50);
  });
});

describe("isAssignablePlan", () => {
  it("acepta solo los planes canónicos asignables", () => {
    expect(isAssignablePlan("ecommerce")).toBe(true);
    expect(isAssignablePlan("dinamica")).toBe(true);
    expect(isAssignablePlan("none")).toBe(true);
  });

  it("rechaza alias legacy y valores inválidos", () => {
    expect(isAssignablePlan("pro")).toBe(false);    // legacy, no asignable desde el panel
    expect(isAssignablePlan("enterprise")).toBe(false); // plan fantasma del bug original
    expect(isAssignablePlan("")).toBe(false);
    expect(isAssignablePlan(null)).toBe(false);
  });

  it("ecommerce está en el catálogo (regresión del bug del panel admin)", () => {
    expect(ASSIGNABLE_PLAN_IDS).toContain("ecommerce");
    expect(PLAN_CATALOG.find((p) => p.id === "ecommerce")?.credits).toBe(3000);
  });
});
