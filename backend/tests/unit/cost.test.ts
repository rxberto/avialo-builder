import { describe, it, expect } from "vitest";
import { estimateCostUsd, JobCostTracker } from "../../src/agent/cost.js";

describe("estimateCostUsd", () => {
  it("calcula el coste por tokens según el modelo", () => {
    // claude-sonnet-4-6: $3/M in, $15/M out
    const cost = estimateCostUsd("claude-sonnet-4-6", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(18, 5);
  });

  it("usa pricing por defecto para modelos desconocidos", () => {
    const cost = estimateCostUsd("modelo-desconocido", 1_000_000, 0);
    expect(cost).toBeCloseTo(3, 5);
  });
});

describe("JobCostTracker", () => {
  it("acumula coste y detecta cuando se supera el techo", () => {
    const tracker = new JobCostTracker(0.05);
    expect(tracker.exceeded()).toBe(false);
    tracker.add({ model: "claude-sonnet-4-6", inputTokens: 5_000, outputTokens: 5_000 });
    // 5k in * $3/M + 5k out * $15/M = 0.015 + 0.075 = 0.09 > 0.05
    expect(tracker.exceeded()).toBe(true);
  });
});
