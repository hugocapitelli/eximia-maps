// =============================================================================
// Stripe Gateway Adapter — Concrete implementation for Stripe
// =============================================================================
// Derived from eximia-forms production patterns:
//   - lib/stripe.ts (client setup, price mapping)
//   - api/billing/create-checkout/route.ts (checkout flow)
//   - api/billing/portal/route.ts (portal flow)
//   - api/webhooks/stripe/route.ts (webhook handling)
// =============================================================================

import Stripe from "stripe";
import type { ProductContract, CheckoutParams, CheckoutResult, PortalParams, PortalResult, WebhookResult, GatewayAdapter } from "./types";
import { planFromPriceId } from "./plan-engine";

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class StripeAdapter implements GatewayAdapter {
  private stripe: Stripe;
  private contract: ProductContract;
  private env: Record<string, string | undefined>;
  private webhookSecret: string;

  constructor(config: {
    contract: ProductContract;
    secretKey: string;
    webhookSecret: string;
    env: Record<string, string | undefined>;
    apiVersion?: string;
  }) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: (config.apiVersion ?? "2025-12-18.acacia") as Stripe.LatestApiVersion,
      typescript: true,
    });
    this.contract = config.contract;
    this.env = config.env;
    this.webhookSecret = config.webhookSecret;
  }

  // -------------------------------------------------------------------------
  // Checkout
  // -------------------------------------------------------------------------

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    // Get or validate price ID
    const plan = this.contract.plans[params.planSlug];
    if (!plan) throw new Error(`Plan "${params.planSlug}" not found in contract`);

    const priceId = plan.stripePriceEnv ? this.env[plan.stripePriceEnv] : undefined;
    if (!priceId) throw new Error(`Stripe Price ID not configured for plan "${params.planSlug}"`);

    // Ensure customer exists
    let customerId = params.customerId;
    if (!customerId) {
      customerId = await this.createCustomer(params.email, {
        supabase_user_id: params.userId,
      });
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: this.contract.gateway.mode === "one-time" ? "payment" : "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      allow_promotion_codes: this.contract.gateway.promotionCodes,
      subscription_data:
        this.contract.gateway.mode !== "one-time"
          ? {
              metadata: {
                supabase_user_id: params.userId,
                plan: params.planSlug,
              },
              ...(plan.trialDays
                ? { trial_period_days: plan.trialDays }
                : this.contract.billing.trialDays
                  ? { trial_period_days: this.contract.billing.trialDays }
                  : {}),
            }
          : undefined,
    });

    return {
      url: session.url!,
      sessionId: session.id,
      customerId,
    };
  }

  // -------------------------------------------------------------------------
  // Portal
  // -------------------------------------------------------------------------

  async createPortal(params: PortalParams): Promise<PortalResult> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
    return { url: session.url };
  }

  // -------------------------------------------------------------------------
  // Webhooks
  // -------------------------------------------------------------------------

  async handleWebhook(body: string | Buffer, signature: string): Promise<WebhookResult> {
    const event = this.stripe.webhooks.constructEvent(
      body,
      signature,
      this.webhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed":
        return this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);

      case "customer.subscription.updated":
        return this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);

      case "customer.subscription.deleted":
        return this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);

      case "invoice.payment_failed":
        return this.handlePaymentFailed(event.data.object as Stripe.Invoice);

      default:
        return { event: event.type, action: "ignored" };
    }
  }

  // -------------------------------------------------------------------------
  // Customer
  // -------------------------------------------------------------------------

  async createCustomer(email: string, metadata?: Record<string, string>): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      metadata: metadata ?? {},
    });
    return customer.id;
  }

  // -------------------------------------------------------------------------
  // Price Resolution
  // -------------------------------------------------------------------------

  resolvePlan(priceId: string): string | null {
    return planFromPriceId(this.contract, priceId, this.env);
  }

  // -------------------------------------------------------------------------
  // Internal Webhook Handlers
  // -------------------------------------------------------------------------

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session
  ): Promise<WebhookResult> {
    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      return { event: "checkout.session.completed", action: "ignored" };
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    const plan = priceId ? this.resolvePlan(priceId) : null;
    const userId =
      subscription.metadata?.supabase_user_id ||
      (await this.resolveUserFromCustomer(session.customer as string));

    return {
      event: "checkout.session.completed",
      userId: userId ?? undefined,
      plan: plan ?? undefined,
      action: "activated",
      details: {
        subscriptionId,
        priceId,
        status: subscription.status,
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
        customerId: session.customer as string,
      },
    };
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription
  ): Promise<WebhookResult> {
    const priceId = subscription.items.data[0]?.price.id;
    const plan = priceId ? this.resolvePlan(priceId) : null;
    const userId =
      subscription.metadata?.supabase_user_id ||
      (await this.resolveUserFromCustomer(subscription.customer as string));

    return {
      event: "customer.subscription.updated",
      userId: userId ?? undefined,
      plan: plan ?? undefined,
      action: "updated",
      details: {
        subscriptionId: subscription.id,
        priceId,
        status: subscription.status,
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    };
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription
  ): Promise<WebhookResult> {
    const userId =
      subscription.metadata?.supabase_user_id ||
      (await this.resolveUserFromCustomer(subscription.customer as string));

    const freePlan = Object.values(this.contract.plans)
      .sort((a, b) => a.order - b.order)[0];

    return {
      event: "customer.subscription.deleted",
      userId: userId ?? undefined,
      plan: freePlan?.slug ?? "free",
      action: "canceled",
      details: {
        subscriptionId: subscription.id,
        previousStatus: subscription.status,
      },
    };
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<WebhookResult> {
    const customerId = invoice.customer as string;
    const userId = await this.resolveUserFromCustomer(customerId);

    return {
      event: "invoice.payment_failed",
      userId: userId ?? undefined,
      action: "failed",
      details: {
        invoiceId: invoice.id,
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        attemptCount: invoice.attempt_count,
      },
    };
  }

  private async resolveUserFromCustomer(customerId: string): Promise<string | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) return null;
      return (customer as Stripe.Customer).metadata?.supabase_user_id ?? null;
    } catch {
      return null;
    }
  }
}
