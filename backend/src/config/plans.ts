// ============================================
// PLANES SaaS — fuente única de verdad
// ============================================
// Mapea cada plan a su asignación mensual de créditos de IA.
// Usado por el webhook de Stripe (activación) y por el reseteo mensual de créditos.

export const PLAN_CREDITS: Record<string, number> = {
  none: 50,
  basic: 50,
  corporativa: 50,
  pro: 200,
  dinamica: 200,
  ecommerce: 500,
};

export const DEFAULT_PLAN_CREDITS = 50;

/**
 * Devuelve los créditos mensuales correspondientes a un plan.
 */
export function creditsForPlan(plan?: string | null): number {
  if (!plan) return DEFAULT_PLAN_CREDITS;
  return PLAN_CREDITS[plan] ?? DEFAULT_PLAN_CREDITS;
}

/**
 * Calcula la fecha del próximo reseteo de créditos (30 días desde ahora).
 */
export function nextCreditsResetDate(from: Date = new Date()): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + 30);
  return next;
}
