// Types copied from @eximia/productization-hub/contract
// Adapted for local usage in eximia-maps

export interface ProductContract {
  app: string;
  version: string;
  contract: "eximia-productization/v1";
  display: ProductDisplay;
  gateway: GatewayConfig;
  plans: Record<string, PlanDefinition>;
  quotas: QuotaDefinition[];
  features: FeatureDefinition[];
  billing: BillingConfig;
  landing: LandingConfig;
  database: DatabaseConfig;
}

export interface ProductDisplay {
  name: string;
  tagline: string;
  description: string;
  url: string;
  docsUrl?: string;
  apiUrl?: string;
}

export interface GatewayConfig {
  provider: "stripe";
  currencies: Currency[];
  primaryCurrency: Currency;
  mode: "subscription" | "one-time" | "hybrid";
  portalEnabled: boolean;
  promotionCodes: boolean;
}

export type Currency = "BRL" | "USD" | "EUR";

export interface PlanDefinition {
  name: string;
  slug: string;
  order: number;
  price: Partial<Record<Currency, number>>;
  stripePriceEnv?: string;
  highlighted?: boolean;
  description?: string;
  limits: Record<string, number>;
  features: string[];
  trialDays?: number;
}

export interface QuotaDefinition {
  slug: string;
  label: string;
  period: "monthly" | "daily" | "total";
  trackingTable?: string;
  trackingColumn?: string;
  periodColumn?: string;
  inlineCount?: {
    table: string;
    countColumn: string;
    periodFilter?: string;
  };
}

export interface FeatureDefinition {
  slug: string;
  label: string;
  category?: string;
}

export interface BillingConfig {
  webhookEvents: WebhookEvent[];
  emails: EmailTrigger[];
  trialDays?: number;
  emailProvider?: "resend" | "sendgrid" | "ses";
}

export type WebhookEvent =
  | "checkout.session.completed"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.payment_failed"
  | "invoice.payment_succeeded"
  | "customer.subscription.trial_will_end";

export type EmailTrigger =
  | "subscription_confirmed"
  | "payment_failed"
  | "trial_ending"
  | "subscription_canceled"
  | "subscription_upgraded"
  | "subscription_downgraded";

export interface LandingConfig {
  llmsTxt: boolean;
  pricingSection: boolean;
  anchoringPrice?: number;
  ctaUrl?: string;
}

export interface DatabaseConfig {
  provider: "supabase" | "postgres" | "mysql";
  userTable: string;
  planColumn: string;
  customerIdColumn: string;
  subscriptionIdColumn: string;
  statusColumn: string;
  periodEndColumn: string;
  priceIdColumn?: string;
  userIdColumn: string;
  roleColumn?: string;
}

export interface CheckResult {
  allowed: boolean;
  reason?: string;
}

export interface UsageReport {
  plan: string;
  quotas: QuotaUsage[];
  features: FeatureStatus[];
}

export interface QuotaUsage {
  slug: string;
  label: string;
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  period: string;
}

export interface FeatureStatus {
  slug: string;
  label: string;
  enabled: boolean;
}

export interface WebhookResult {
  event: string;
  userId?: string;
  plan?: string;
  action: "activated" | "updated" | "canceled" | "failed" | "ignored";
  details?: Record<string, unknown>;
}

export interface CheckoutParams {
  userId: string;
  email: string;
  planSlug: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
  customerId: string;
}

export interface PortalParams {
  customerId: string;
  returnUrl: string;
}

export interface PortalResult {
  url: string;
}

export interface GatewayAdapter {
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  createPortal(params: PortalParams): Promise<PortalResult>;
  handleWebhook(body: string | Buffer, signature: string): Promise<WebhookResult>;
  createCustomer(email: string, metadata?: Record<string, string>): Promise<string>;
  resolvePlan(priceId: string): string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbClient = any;

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete"
  | "inactive";
