// =============================================================================
// Billing Lifecycle — Subscription state machine + orchestration
// =============================================================================
// Processes webhook results and syncs state to the database.
// Derived from eximia-forms webhook handler patterns.
// =============================================================================

import type { ProductContract, WebhookResult, DbClient, SubscriptionStatus } from "./types";
import { syncSubscription } from "./quota-tracker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LifecycleHandlers {
  /** Called when a subscription is activated (checkout completed) */
  onActivated?: (userId: string, plan: string, details: Record<string, unknown>) => Promise<void>;

  /** Called when a subscription is updated (upgrade/downgrade/renewal) */
  onUpdated?: (userId: string, plan: string, details: Record<string, unknown>) => Promise<void>;

  /** Called when a subscription is canceled */
  onCanceled?: (userId: string, details: Record<string, unknown>) => Promise<void>;

  /** Called when a payment fails */
  onPaymentFailed?: (userId: string, details: Record<string, unknown>) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

/**
 * Process a webhook result: sync to DB and trigger lifecycle handlers.
 * This is the main integration point between gateway webhooks and your app.
 */
export async function processWebhookResult(
  db: DbClient,
  contract: ProductContract,
  result: WebhookResult,
  handlers?: LifecycleHandlers
): Promise<void> {
  if (result.action === "ignored" || !result.userId) return;

  const details = result.details ?? {};

  switch (result.action) {
    case "activated": {
      await syncSubscription(db, contract, result.userId, {
        plan: result.plan!,
        subscriptionId: details.subscriptionId as string,
        priceId: details.priceId as string,
        status: (details.status as string) ?? "active",
        periodEnd: details.currentPeriodEnd as string,
      });
      await handlers?.onActivated?.(result.userId, result.plan!, details);
      break;
    }

    case "updated": {
      await syncSubscription(db, contract, result.userId, {
        plan: result.plan!,
        subscriptionId: details.subscriptionId as string,
        priceId: details.priceId as string,
        status: (details.status as string) ?? "active",
        periodEnd: details.currentPeriodEnd as string,
      });
      await handlers?.onUpdated?.(result.userId, result.plan!, details);
      break;
    }

    case "canceled": {
      const freePlan = Object.values(contract.plans)
        .sort((a, b) => a.order - b.order)[0];

      await syncSubscription(db, contract, result.userId, {
        plan: freePlan?.slug ?? "free",
        status: "canceled",
      });
      await handlers?.onCanceled?.(result.userId, details);
      break;
    }

    case "failed": {
      await syncSubscription(db, contract, result.userId, {
        plan: result.plan ?? (await getCurrentPlan(db, contract, result.userId)),
        status: "past_due",
      });
      await handlers?.onPaymentFailed?.(result.userId, details);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Subscription Status
// ---------------------------------------------------------------------------

/** Valid status transitions */
const VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  inactive: ["active", "trialing"],
  trialing: ["active", "canceled", "past_due"],
  active: ["canceled", "past_due", "active"], // active→active = renewal/upgrade
  past_due: ["active", "canceled"],
  canceled: ["active", "trialing"], // re-subscribe
  incomplete: ["active", "canceled"],
};

/** Check if a status transition is valid */
export function isValidTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCurrentPlan(
  db: DbClient,
  contract: ProductContract,
  userId: string
): Promise<string> {
  const { userTable, planColumn, userIdColumn } = contract.database;
  const result = await db
    .from(userTable)
    .select(planColumn)
    .eq(userIdColumn, userId)
    .single();

  return (result.data?.[planColumn] as string) ?? "free";
}
