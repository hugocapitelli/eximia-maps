// =============================================================================
// eximIA Maps — ProductContract + Stripe Adapter
// =============================================================================
// Single source of truth: what Maps sells.
// Everything else (gates, pricing, llms.txt) derives from this.
// =============================================================================

import type { ProductContract } from "./productization/types";
import { StripeAdapter } from "./productization/stripe-adapter";

export const contract: ProductContract = {
  app: "eximia-maps",
  version: "1.0.0",
  contract: "eximia-productization/v1",

  display: {
    name: "eximIA Maps",
    tagline: "Mapas mentais com IA — descreva em português, a IA entrega o mapa completo.",
    description:
      "eximIA Maps é uma plataforma de criação de mapas mentais inteligentes. " +
      "Descreva o tema em linguagem natural e a IA gera mapas estruturados com múltiplos " +
      "estilos (acadêmico, executivo, criativo). Importe fluxogramas, outlines e listas. " +
      "Exporte em PNG, PDF e SVG. Compartilhe com links públicos. Canvas interativo com React Flow.",
    url: "https://maps.eximiaventures.com.br",
  },

  gateway: {
    provider: "stripe",
    currencies: ["BRL", "USD"],
    primaryCurrency: "BRL",
    mode: "subscription",
    portalEnabled: true,
    promotionCodes: true,
  },

  plans: {
    free: {
      name: "Starter",
      slug: "free",
      order: 0,
      price: { BRL: 0, USD: 0 },
      description: "Para experimentar a plataforma",
      limits: {
        maps: 3,
        ai_generations: 5,
        nodes_per_map: 30,
      },
      features: ["import_text"],
    },

    pro: {
      name: "Pro",
      slug: "pro",
      order: 1,
      price: { BRL: 19.9, USD: 5 },
      stripePriceEnv: "STRIPE_PRICE_ID_PRO",
      description: "Para profissionais e estudantes",
      trialDays: 7,
      limits: {
        maps: 25,
        ai_generations: 50,
        nodes_per_map: 100,
      },
      features: [
        "import_text",
        "export_pdf",
        "export_svg",
        "templates",
        "share_link",
        "custom_styles",
      ],
    },

    business: {
      name: "Business",
      slug: "business",
      order: 2,
      price: { BRL: 49.9, USD: 10 },
      stripePriceEnv: "STRIPE_PRICE_ID_BUSINESS",
      highlighted: true,
      description: "Para empresas e equipes",
      limits: {
        maps: Infinity,
        ai_generations: 500,
        nodes_per_map: Infinity,
      },
      features: [
        "import_text",
        "export_pdf",
        "export_svg",
        "templates",
        "share_link",
        "custom_styles",
        "remove_branding",
      ],
    },
  },

  quotas: [
    {
      slug: "maps",
      label: "Mapas mentais",
      period: "total",
      inlineCount: {
        table: "mind_maps",
        countColumn: "id",
      },
    },
    {
      slug: "ai_generations",
      label: "Gerações com IA / mês",
      period: "monthly",
      trackingTable: "ai_usage",
      trackingColumn: "generation_count",
      periodColumn: "month",
    },
  ],

  features: [
    { slug: "import_text", label: "Importar texto/outline" },
    { slug: "export_pdf", label: "Exportar PDF", category: "export" },
    { slug: "export_svg", label: "Exportar SVG", category: "export" },
    { slug: "templates", label: "Templates de mapas" },
    { slug: "share_link", label: "Compartilhar com link" },
    { slug: "custom_styles", label: "Estilos (acadêmico, executivo, criativo)", category: "ai" },
    { slug: "remove_branding", label: "Sem marca d'água nos exports", category: "branding" },
  ],

  billing: {
    webhookEvents: [
      "checkout.session.completed",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_failed",
    ],
    emails: ["subscription_confirmed", "payment_failed"],
    trialDays: 7,
  },

  landing: {
    llmsTxt: true,
    pricingSection: true,
    anchoringPrice: 997,
    ctaUrl: "/admin/upgrade",
  },

  database: {
    provider: "supabase",
    userTable: "user_profiles",
    planColumn: "plan",
    customerIdColumn: "stripe_customer_id",
    subscriptionIdColumn: "stripe_subscription_id",
    statusColumn: "subscription_status",
    periodEndColumn: "current_period_end",
    priceIdColumn: "stripe_price_id",
    userIdColumn: "id",
    roleColumn: "role",
  },
};

// Stripe adapter — initialized lazily (server-side only)
export const stripeAdapter = new StripeAdapter({
  contract,
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  env: process.env as Record<string, string>,
});

// Re-export for convenience
export { checkQuota, isFeatureEnabled, buildQuotaUsage, getFeatureStatuses } from "./productization/plan-engine";
export { getUserPlan, getQuotaUsage, incrementQuota } from "./productization/quota-tracker";
export type { CheckResult, QuotaUsage, FeatureStatus, UsageReport } from "./productization/types";
