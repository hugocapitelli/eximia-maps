// =============================================================================
// Plan Engine — Pure logic for plan checking (no DB calls)
// =============================================================================
// Given a ProductContract + a plan slug, answers:
//   - What are the limits?
//   - Is feature X enabled?
//   - What's the quota for Y?
//   - Is user over their limit? (given current usage)
// =============================================================================

import type {
  ProductContract,
  PlanDefinition,
  CheckResult,
  QuotaUsage,
  FeatureStatus,
  FeatureDefinition,
  QuotaDefinition,
} from "./types";

// ---------------------------------------------------------------------------
// Plan Resolution
// ---------------------------------------------------------------------------

/** Get a plan definition by slug, falling back to the first plan (free tier) */
export function getPlan(contract: ProductContract, planSlug: string): PlanDefinition {
  const plan = contract.plans[planSlug];
  if (plan) return plan;

  // Fallback to lowest-order plan
  const plans = Object.values(contract.plans).sort((a, b) => a.order - b.order);
  return plans[0];
}

/** Get all plans sorted by order */
export function getPlans(contract: ProductContract): PlanDefinition[] {
  return Object.values(contract.plans).sort((a, b) => a.order - b.order);
}

/** Get the free tier plan (order = 0 or price = 0) */
export function getFreePlan(contract: ProductContract): PlanDefinition | undefined {
  const plans = getPlans(contract);
  return plans.find(
    (p) =>
      Object.values(p.price).every((v) => v === 0) ||
      p.slug === "free" ||
      p.order === 0
  );
}

// ---------------------------------------------------------------------------
// Feature Checks
// ---------------------------------------------------------------------------

/** Check if a feature is enabled for a given plan */
export function isFeatureEnabled(
  contract: ProductContract,
  planSlug: string,
  featureSlug: string
): boolean {
  const plan = getPlan(contract, planSlug);
  return plan.features.includes(featureSlug);
}

/** Get all feature statuses for a plan */
export function getFeatureStatuses(
  contract: ProductContract,
  planSlug: string
): FeatureStatus[] {
  const plan = getPlan(contract, planSlug);
  return contract.features.map((f: FeatureDefinition) => ({
    slug: f.slug,
    label: f.label,
    enabled: plan.features.includes(f.slug),
  }));
}

// ---------------------------------------------------------------------------
// Quota Checks
// ---------------------------------------------------------------------------

/** Get the limit for a specific quota on a given plan */
export function getQuotaLimit(
  contract: ProductContract,
  planSlug: string,
  quotaSlug: string
): number {
  const plan = getPlan(contract, planSlug);
  return plan.limits[quotaSlug] ?? 0;
}

/** Check if a quota action is allowed given current usage */
export function checkQuota(
  contract: ProductContract,
  planSlug: string,
  quotaSlug: string,
  currentUsage: number
): CheckResult {
  const plan = getPlan(contract, planSlug);
  const limit = plan.limits[quotaSlug];

  if (limit === undefined) {
    return { allowed: false, reason: `Quota "${quotaSlug}" not defined for plan "${plan.name}"` };
  }

  if (limit === Infinity) {
    return { allowed: true };
  }

  if (currentUsage >= limit) {
    const quota = contract.quotas.find((q: QuotaDefinition) => q.slug === quotaSlug);
    const label = quota?.label ?? quotaSlug;
    return {
      allowed: false,
      reason: `Limite de ${limit.toLocaleString("pt-BR")} ${label.toLowerCase()} atingido no plano ${plan.name}. Faça upgrade para continuar.`,
    };
  }

  return { allowed: true };
}

/** Build a full quota usage report given current counts */
export function buildQuotaUsage(
  contract: ProductContract,
  planSlug: string,
  currentCounts: Record<string, number>
): QuotaUsage[] {
  const plan = getPlan(contract, planSlug);

  return contract.quotas.map((q: QuotaDefinition) => {
    const limit = plan.limits[q.slug] ?? 0;
    const used = currentCounts[q.slug] ?? 0;
    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
    const percent = limit === Infinity || limit === 0 ? 0 : Math.round((used / limit) * 100);

    return {
      slug: q.slug,
      label: q.label,
      used,
      limit,
      remaining,
      percent,
      period: q.period,
    };
  });
}

// ---------------------------------------------------------------------------
// Plan Comparison
// ---------------------------------------------------------------------------

/** Check if planA is higher tier than planB (by order) */
export function isHigherPlan(
  contract: ProductContract,
  planASlug: string,
  planBSlug: string
): boolean {
  const planA = getPlan(contract, planASlug);
  const planB = getPlan(contract, planBSlug);
  return planA.order > planB.order;
}

/** Get the next upgrade plan from a given plan */
export function getNextUpgrade(
  contract: ProductContract,
  currentPlanSlug: string
): PlanDefinition | undefined {
  const current = getPlan(contract, currentPlanSlug);
  const plans = getPlans(contract);
  return plans.find((p) => p.order > current.order);
}

// ---------------------------------------------------------------------------
// Stripe Price Mapping
// ---------------------------------------------------------------------------

/** Map a Stripe Price ID to a plan slug using env var names from contract */
export function planFromPriceId(
  contract: ProductContract,
  priceId: string,
  env: Record<string, string | undefined>
): string | null {
  for (const plan of Object.values(contract.plans)) {
    if (plan.stripePriceEnv && env[plan.stripePriceEnv] === priceId) {
      return plan.slug;
    }
  }
  return null;
}

/** Map a plan slug to its Stripe Price ID */
export function priceIdFromPlan(
  contract: ProductContract,
  planSlug: string,
  env: Record<string, string | undefined>
): string | null {
  const plan = contract.plans[planSlug];
  if (!plan?.stripePriceEnv) return null;
  return env[plan.stripePriceEnv] ?? null;
}
