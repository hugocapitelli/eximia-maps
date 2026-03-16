"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/gate";
import { Card, Button, Badge } from "@/components/ui";
import { Check, X, Sparkles, Loader2, ExternalLink } from "lucide-react";

interface QuotaInfo {
  slug: string;
  label: string;
  used: number;
  limit: number;
  remaining: number;
  percent: number;
}

interface FeatureInfo {
  slug: string;
  label: string;
  enabled: boolean;
}

interface UsageData {
  plan: string;
  quotas: QuotaInfo[];
  features: FeatureInfo[];
}

const PLANS = [
  {
    slug: "free",
    name: "Starter",
    price: 0,
    description: "Para experimentar a plataforma",
    limits: { maps: "3", ai_generations: "5/mês", nodes_per_map: "30" },
    features: ["import_text"],
  },
  {
    slug: "pro",
    name: "Pro",
    price: 19.9,
    description: "Para profissionais e estudantes",
    trial: "7 dias grátis",
    limits: { maps: "25", ai_generations: "50/mês", nodes_per_map: "100" },
    features: ["import_text", "export_pdf", "export_svg", "templates", "share_link", "custom_styles"],
  },
  {
    slug: "business",
    name: "Business",
    price: 49.9,
    highlighted: true,
    description: "Para empresas e equipes",
    limits: { maps: "Ilimitados", ai_generations: "500/mês", nodes_per_map: "Ilimitados" },
    features: ["import_text", "export_pdf", "export_svg", "templates", "share_link", "custom_styles", "remove_branding"],
  },
];

const ALL_FEATURES = [
  { slug: "import_text", label: "Importar texto/outline" },
  { slug: "export_pdf", label: "Exportar PDF" },
  { slug: "export_svg", label: "Exportar SVG" },
  { slug: "templates", label: "Templates de mapas" },
  { slug: "share_link", label: "Compartilhar com link" },
  { slug: "custom_styles", label: "Estilos (acadêmico, executivo, criativo)" },
  { slug: "remove_branding", label: "Sem marca d'água" },
];

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Carregando...</div>}>
      <UpgradeContent />
    </Suspense>
  );
}

function UpgradeContent() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    authFetch("/api/v1/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setUsage(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCheckout(planSlug: string) {
    setCheckoutLoading(planSlug);
    try {
      const res = await authFetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planSlug }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    const res = await authFetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  const currentPlan = usage?.plan || "free";

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Planos & Upgrade</h1>
        <p className="text-sm text-muted mt-1">Escolha o plano ideal para sua necessidade</p>
      </div>

      {success && (
        <div className="mb-6 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
          Assinatura ativada com sucesso! Seu plano foi atualizado.
        </div>
      )}

      {canceled && (
        <div className="mb-6 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-400">
          Checkout cancelado. Você pode tentar novamente quando quiser.
        </div>
      )}

      {/* Current usage */}
      {usage && usage.quotas.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted mb-3">Seu uso atual — Plano {PLANS.find(p => p.slug === currentPlan)?.name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {usage.quotas.map((q) => (
              <Card key={q.slug} className="p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>{q.label}</span>
                  <span className="text-muted">
                    {q.used} / {q.limit === Infinity ? "∞" : q.limit}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(q.percent, 100)}%`,
                      backgroundColor: q.percent > 80 ? "#ef4444" : "#82B4C4",
                    }}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan) => {
          const isCurrent = plan.slug === currentPlan;
          const isHigher = PLANS.findIndex(p => p.slug === plan.slug) > PLANS.findIndex(p => p.slug === currentPlan);

          return (
            <Card
              key={plan.slug}
              className={`p-5 relative flex flex-col ${
                plan.highlighted ? "border-[#82B4C4]/40 ring-1 ring-[#82B4C4]/20" : ""
              }`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#82B4C4] text-black text-[10px] px-3">
                  Popular
                </Badge>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-xs text-muted mt-1">{plan.description}</p>
              </div>

              <div className="mb-5">
                <span className="text-3xl font-bold">
                  {plan.price === 0 ? "Grátis" : `R$${plan.price.toFixed(2).replace(".", ",")}`}
                </span>
                {plan.price > 0 && <span className="text-sm text-muted">/mês</span>}
                {plan.trial && (
                  <p className="text-xs text-[#82B4C4] mt-1">{plan.trial}</p>
                )}
              </div>

              {/* Limits */}
              <div className="space-y-2 mb-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Mapas</span>
                  <span>{plan.limits.maps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Gerações IA</span>
                  <span>{plan.limits.ai_generations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Nodes/mapa</span>
                  <span>{plan.limits.nodes_per_map}</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-1.5 mb-6 flex-1">
                {ALL_FEATURES.map((f) => {
                  const included = plan.features.includes(f.slug);
                  return (
                    <div key={f.slug} className="flex items-center gap-2 text-xs">
                      {included ? (
                        <Check size={14} className="text-green-500 shrink-0" />
                      ) : (
                        <X size={14} className="text-muted/30 shrink-0" />
                      )}
                      <span className={included ? "" : "text-muted/40"}>{f.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              {isCurrent ? (
                <Button disabled className="w-full" variant="outline">
                  Plano atual
                </Button>
              ) : isHigher ? (
                <Button
                  onClick={() => handleCheckout(plan.slug)}
                  disabled={checkoutLoading === plan.slug || loading}
                  className="w-full gap-2"
                >
                  {checkoutLoading === plan.slug ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {plan.price === 0 ? "Começar grátis" : `Upgrade para ${plan.name}`}
                </Button>
              ) : (
                <Button disabled variant="outline" className="w-full">
                  Downgrade
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Billing portal */}
      {currentPlan !== "free" && (
        <div className="text-center">
          <button
            onClick={handlePortal}
            className="text-sm text-muted hover:text-primary transition-colors inline-flex items-center gap-1.5"
          >
            <ExternalLink size={14} />
            Gerenciar assinatura (Stripe)
          </button>
        </div>
      )}
    </div>
  );
}
