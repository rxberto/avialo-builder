import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { priceIdForPlan, planFromPriceId } from "../../src/config/stripe.js";

// priceIdForPlan/planFromPriceId leen process.env en cada llamada, así que basta con
// fijar las variables antes de cada test.
const ENV_KEYS = ["STRIPE_PRICE_CORPORATIVA", "STRIPE_PRICE_DINAMICA", "STRIPE_PRICE_ECOMMERCE"];

describe("stripe price mapping", () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_CORPORATIVA = "price_corp_123";
    process.env.STRIPE_PRICE_DINAMICA = "price_dina_456";
    process.env.STRIPE_PRICE_ECOMMERCE = "price_eco_789";
  });
  afterEach(() => {
    for (const k of ENV_KEYS) delete process.env[k];
  });

  it("priceIdForPlan devuelve el Price ID por plan", () => {
    expect(priceIdForPlan("corporativa")).toBe("price_corp_123");
    expect(priceIdForPlan("dinamica")).toBe("price_dina_456");
    expect(priceIdForPlan("ecommerce")).toBe("price_eco_789");
  });

  it("priceIdForPlan devuelve undefined para planes no facturables o desconocidos", () => {
    expect(priceIdForPlan("none")).toBeUndefined();
    expect(priceIdForPlan(null)).toBeUndefined();
    expect(priceIdForPlan("inexistente")).toBeUndefined();
  });

  it("priceIdForPlan ignora valores de env que no son Price IDs", () => {
    process.env.STRIPE_PRICE_CORPORATIVA = "sk_test_oops";
    expect(priceIdForPlan("corporativa")).toBeUndefined();
  });

  it("planFromPriceId hace el mapeo inverso", () => {
    expect(planFromPriceId("price_corp_123")).toBe("corporativa");
    expect(planFromPriceId("price_dina_456")).toBe("dinamica");
    expect(planFromPriceId("price_eco_789")).toBe("ecommerce");
  });

  it("planFromPriceId devuelve null para precios desconocidos o vacíos", () => {
    expect(planFromPriceId("price_unknown")).toBeNull();
    expect(planFromPriceId(undefined)).toBeNull();
    expect(planFromPriceId(null)).toBeNull();
  });

  it("ida y vuelta consistente para todos los planes facturables", () => {
    for (const plan of ["corporativa", "dinamica", "ecommerce"]) {
      const id = priceIdForPlan(plan);
      expect(id).toBeDefined();
      expect(planFromPriceId(id)).toBe(plan);
    }
  });
});
