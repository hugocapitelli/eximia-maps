// =============================================================================
// Webhook Handler Factory — Creates a Next.js API route handler from contract
// =============================================================================
// Usage in your app:
//
//   import { createWebhookHandler } from "@/lib/productization";
//   export const POST = createWebhookHandler({ contract, adapter, db, handlers });
//
// =============================================================================

import type { ProductContract, GatewayAdapter, DbClient } from "./types";
import { processWebhookResult } from "./lifecycle";
import type { LifecycleHandlers } from "./lifecycle";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebhookHandlerConfig {
  contract: ProductContract;
  adapter: GatewayAdapter;
  db: DbClient;
  handlers?: LifecycleHandlers;
  signatureHeader?: string; // Default: "stripe-signature"
}

/** Generic request interface (compatible with Next.js Request) */
interface WebhookRequest {
  text(): Promise<string>;
  headers: { get(name: string): string | null };
}

/** Generic response constructor */
interface WebhookResponse {
  status: number;
  body: string;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a webhook handler function compatible with Next.js App Router.
 *
 * @example
 * // app/api/webhooks/stripe/route.ts
 * import { createWebhookHandler } from "@/lib/productization";
 * import { contract } from "@/lib/product-contract";
 * import { stripeAdapter } from "@/lib/stripe";
 * import { adminDb } from "@/lib/supabase/admin";
 *
 * export const POST = createWebhookHandler({
 *   contract,
 *   adapter: stripeAdapter,
 *   db: adminDb,
 *   handlers: {
 *     onActivated: async (userId, plan) => {
 *       await sendSubscriptionEmail(userId, plan);
 *     },
 *     onPaymentFailed: async (userId) => {
 *       await sendPaymentFailedEmail(userId);
 *     },
 *   },
 * });
 */
export function createWebhookHandler(config: WebhookHandlerConfig) {
  const sigHeader = config.signatureHeader ?? "stripe-signature";

  return async function handler(request: WebhookRequest): Promise<WebhookResponse> {
    try {
      const body = await request.text();
      const signature = request.headers.get(sigHeader);

      if (!signature) {
        return { status: 400, body: JSON.stringify({ error: "Missing signature" }) };
      }

      // Verify and parse webhook
      const result = await config.adapter.handleWebhook(body, signature);

      // Process: sync to DB + trigger handlers
      await processWebhookResult(config.db, config.contract, result, config.handlers);

      return { status: 200, body: JSON.stringify({ received: true, action: result.action }) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[productization-hub] Webhook error:", message);
      return { status: 400, body: JSON.stringify({ error: message }) };
    }
  };
}
