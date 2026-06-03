// ============================================
// SEGUIMIENTO DE COSTE DE IA + TECHO POR JOB
// ============================================
// Cada generación/edición gasta dinero real. Acumulamos el coste estimado por job y
// abortamos si supera un techo configurable (MAX_JOB_COST_USD) para evitar runaways.

// Precios aproximados por millón de tokens (USD). Ajustar según tarifas reales.
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "gemini-2.5-flash":  { in: 0.3, out: 2.5 },
  "deepseek-chat":     { in: 0.27, out: 1.1 },
  "deepseek-coder":    { in: 0.27, out: 1.1 },
  "gpt-4o":            { in: 2.5, out: 10 },
};
const DEFAULT_PRICING = { in: 3, out: 15 };

export const MAX_JOB_COST_USD = parseFloat(process.env.MAX_JOB_COST_USD || "2.0");

export interface UsageEvent {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] || DEFAULT_PRICING;
  return (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
}

/**
 * Acumulador de coste para un único job. Lanza si se supera el techo.
 */
export class JobCostTracker {
  private totalUsd = 0;
  private totalInput = 0;
  private totalOutput = 0;

  constructor(private readonly ceilingUsd: number = MAX_JOB_COST_USD) {}

  add(usage: UsageEvent): void {
    this.totalInput += usage.inputTokens;
    this.totalOutput += usage.outputTokens;
    this.totalUsd += estimateCostUsd(usage.model, usage.inputTokens, usage.outputTokens);
  }

  get cost(): number {
    return this.totalUsd;
  }

  get summary(): string {
    return `tokens in=${this.totalInput} out=${this.totalOutput} | coste≈$${this.totalUsd.toFixed(4)} / techo $${this.ceilingUsd.toFixed(2)}`;
  }

  /**
   * Devuelve true si se ha superado el techo de coste.
   */
  exceeded(): boolean {
    return this.totalUsd >= this.ceilingUsd;
  }
}
