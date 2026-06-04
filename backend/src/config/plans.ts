// ============================================
// PLANES SaaS — fuente única de verdad
// ============================================
// Mapea cada plan a su asignación mensual de créditos de IA.
// Usado por el webhook de Stripe (activación) y por el reseteo mensual de créditos.

export const PLAN_CREDITS: Record<string, number> = {
  none: 50, // Pequeño bono inicial freemium si se desea
  basic: 800,
  corporativa: 800, // Alias legacy
  pro: 1500,
  dinamica: 1500, // Alias legacy
  ecommerce: 3000,
};

export const DEFAULT_PLAN_CREDITS = 50;

/**
 * Catálogo canónico de planes ASIGNABLES (los que el admin puede dar y que coinciden con
 * los productos facturables del checkout). `basic`/`pro` siguen existiendo en PLAN_CREDITS
 * como alias legacy para usuarios antiguos, pero ya no se asignan desde el panel.
 */
export interface PlanInfo {
  id: string;
  label: string;
  credits: number;
  billable: boolean;
}

export const PLAN_CATALOG: PlanInfo[] = [
  { id: "none",        label: "Sin plan",            credits: PLAN_CREDITS.none,        billable: false },
  { id: "corporativa", label: "Corporativa (Basic)", credits: PLAN_CREDITS.corporativa, billable: true },
  { id: "dinamica",    label: "Dinámica (Pro)",      credits: PLAN_CREDITS.dinamica,    billable: true },
  { id: "ecommerce",   label: "Ecommerce",           credits: PLAN_CREDITS.ecommerce,   billable: true },
];

/** Ids de planes que el panel admin puede asignar a un usuario. */
export const ASSIGNABLE_PLAN_IDS = PLAN_CATALOG.map((p) => p.id);

/** Valida que un plan sea uno de los asignables canónicos. */
export function isAssignablePlan(plan?: string | null): boolean {
  return !!plan && ASSIGNABLE_PLAN_IDS.includes(plan);
}

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
