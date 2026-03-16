// =============================================================================
// Quota Tracker — Database-aware usage tracking
// =============================================================================
// Provides the DB interaction layer for quota management.
// Works with Supabase (default) — the contract.database config drives queries.
// =============================================================================

import type {
  ProductContract,
  QuotaDefinition,
  DbClient,
} from "./types";

// ---------------------------------------------------------------------------
// User Plan Resolution
// ---------------------------------------------------------------------------

/** Get the current plan slug for a user */
export async function getUserPlan(
  db: DbClient,
  contract: ProductContract,
  userId: string
): Promise<string> {
  const { userTable, planColumn, userIdColumn, roleColumn } = contract.database;

  const result = await db
    .from(userTable)
    .select([planColumn, roleColumn].filter(Boolean).join(", "))
    .eq(userIdColumn, userId)
    .single();

  if (!result.data) return getDefaultPlan(contract);
  return (result.data[planColumn] as string) || getDefaultPlan(contract);
}

/** Check if user is super_admin (bypasses all limits) */
export async function isSuperAdmin(
  db: DbClient,
  contract: ProductContract,
  userId: string
): Promise<boolean> {
  const { userTable, userIdColumn, roleColumn } = contract.database;
  if (!roleColumn) return false;

  const result = await db
    .from(userTable)
    .select(roleColumn)
    .eq(userIdColumn, userId)
    .single();

  return result.data?.[roleColumn] === "super_admin";
}

// ---------------------------------------------------------------------------
// Quota Counting
// ---------------------------------------------------------------------------

/** Get current usage count for a quota */
export async function getQuotaUsage(
  db: DbClient,
  contract: ProductContract,
  userId: string,
  quotaSlug: string
): Promise<number> {
  const quota = contract.quotas.find((q: QuotaDefinition) => q.slug === quotaSlug);
  if (!quota) return 0;

  // Separate tracking table (e.g., ai_usage)
  if (quota.trackingTable && quota.trackingColumn) {
    return getTrackingTableCount(db, quota, userId);
  }

  // Inline count (e.g., count forms in forms table)
  if (quota.inlineCount) {
    return getInlineCount(db, quota, userId);
  }

  return 0;
}

/** Increment a quota's usage counter (for tracking-table quotas) */
export async function incrementQuota(
  db: DbClient,
  contract: ProductContract,
  userId: string,
  quotaSlug: string
): Promise<void> {
  const quota = contract.quotas.find((q: QuotaDefinition) => q.slug === quotaSlug);
  if (!quota?.trackingTable || !quota.trackingColumn) return;

  const periodKey = getPeriodKey(quota.period);

  if (quota.periodColumn) {
    // Upsert: try update, fallback to insert
    const result = await db
      .from(quota.trackingTable)
      .select(quota.trackingColumn)
      .eq("user_id", userId)
      .eq(quota.periodColumn, periodKey)
      .single();

    if (result.data) {
      const currentCount = (result.data[quota.trackingColumn] as number) || 0;
      await db
        .from(quota.trackingTable)
        .update({ [quota.trackingColumn]: currentCount + 1 })
        .eq("user_id", userId)
        .eq(quota.periodColumn, periodKey);
    } else {
      await db
        .from(quota.trackingTable)
        .insert({
          user_id: userId,
          [quota.periodColumn]: periodKey,
          [quota.trackingColumn]: 1,
        });
    }
  }
}

// ---------------------------------------------------------------------------
// Stripe Customer Sync
// ---------------------------------------------------------------------------

/** Get or create Stripe customer ID for a user */
export async function getOrCreateCustomerId(
  db: DbClient,
  contract: ProductContract,
  userId: string,
  createCustomer: (userId: string) => Promise<string>
): Promise<string> {
  const { userTable, customerIdColumn, userIdColumn } = contract.database;

  const result = await db
    .from(userTable)
    .select(customerIdColumn)
    .eq(userIdColumn, userId)
    .single();

  const existingId = result.data?.[customerIdColumn] as string | undefined;
  if (existingId) return existingId;

  // Create via gateway
  const newCustomerId = await createCustomer(userId);

  // Persist
  await db
    .from(userTable)
    .update({ [customerIdColumn]: newCustomerId })
    .eq(userIdColumn, userId);

  return newCustomerId;
}

/** Update user profile after subscription change */
export async function syncSubscription(
  db: DbClient,
  contract: ProductContract,
  userId: string,
  data: {
    plan: string;
    subscriptionId?: string;
    priceId?: string;
    status?: string;
    periodEnd?: string;
  }
): Promise<void> {
  const {
    userTable,
    userIdColumn,
    planColumn,
    subscriptionIdColumn,
    statusColumn,
    periodEndColumn,
    priceIdColumn,
  } = contract.database;

  const update: Record<string, unknown> = {
    [planColumn]: data.plan,
    [statusColumn]: data.status ?? "active",
  };

  if (data.subscriptionId) update[subscriptionIdColumn] = data.subscriptionId;
  if (data.periodEnd) update[periodEndColumn] = data.periodEnd;
  if (data.priceId && priceIdColumn) update[priceIdColumn] = data.priceId;

  await db
    .from(userTable)
    .update(update)
    .eq(userIdColumn, userId);
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function getDefaultPlan(contract: ProductContract): string {
  const plans = Object.values(contract.plans).sort((a, b) => a.order - b.order);
  return plans[0]?.slug ?? "free";
}

function getPeriodKey(period: string): string {
  const now = new Date();
  switch (period) {
    case "monthly":
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    case "daily":
      return now.toISOString().split("T")[0];
    default:
      return "total";
  }
}

async function getTrackingTableCount(
  db: DbClient,
  quota: QuotaDefinition,
  userId: string
): Promise<number> {
  const periodKey = getPeriodKey(quota.period);

  let query = db
    .from(quota.trackingTable!)
    .select(quota.trackingColumn!)
    .eq("user_id", userId);

  if (quota.periodColumn) {
    query = query.eq(quota.periodColumn, periodKey);
  }

  const result = await query.single();
  return (result.data?.[quota.trackingColumn!] as number) || 0;
}

async function getInlineCount(
  db: DbClient,
  quota: QuotaDefinition,
  userId: string
): Promise<number> {
  const { table, countColumn } = quota.inlineCount!;

  let query = db
    .from(table)
    .select(countColumn, { count: "exact", head: true })
    .eq("owner_id", userId);

  if (quota.period === "monthly" && quota.inlineCount!.periodFilter) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    query = query.gte(quota.inlineCount!.periodFilter, monthStart);
  }

  return new Promise((resolve) => {
    query.then((result: { count?: number }) => {
      resolve(result.count ?? 0);
    });
  });
}
