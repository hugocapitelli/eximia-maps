import { contract } from "@/lib/productization";

function generateLlmsTxt(): string {
  const lines: string[] = [];

  lines.push(`# ${contract.display.name}`);
  lines.push("");
  lines.push(`> ${contract.display.tagline}`);
  lines.push("");
  lines.push(contract.display.description);
  lines.push("");
  lines.push("## Links");
  lines.push("");
  lines.push(`- [Website](${contract.display.url}): Main product page`);
  lines.push("");
  lines.push("## Pricing");
  lines.push("");

  const plans = Object.values(contract.plans).sort((a, b) => a.order - b.order);

  for (const plan of plans) {
    const price = plan.price.BRL ?? 0;
    const priceStr = price === 0 ? "Free" : `R$${price.toFixed(2).replace(".", ",")}`;
    lines.push(`### ${plan.name} — ${priceStr}/mo`);
    if (plan.description) lines.push(plan.description);

    for (const quota of contract.quotas) {
      const limit = plan.limits[quota.slug];
      if (limit !== undefined) {
        const limitStr = limit === Infinity ? "Unlimited" : limit.toLocaleString("en-US");
        lines.push(`- ${quota.label}: ${limitStr}`);
      }
    }

    const enabledFeatures = contract.features.filter((f) => plan.features.includes(f.slug));
    for (const f of enabledFeatures) {
      lines.push(`- ${f.label}: Yes`);
    }
    lines.push("");
  }

  lines.push("## Usage Limits");
  lines.push("");
  lines.push("| Resource | " + plans.map((p) => p.name).join(" | ") + " |");
  lines.push("| --- | " + plans.map(() => "---").join(" | ") + " |");
  for (const quota of contract.quotas) {
    const cells = plans.map((p) => {
      const limit = p.limits[quota.slug];
      return limit === Infinity ? "Unlimited" : (limit?.toLocaleString("en-US") ?? "0");
    });
    lines.push(`| ${quota.label} | ${cells.join(" | ")} |`);
  }
  lines.push("");

  lines.push("## Integration");
  lines.push("");
  lines.push(`- Payment: ${contract.gateway.provider}`);
  lines.push(`- Currencies: ${contract.gateway.currencies.join(", ")}`);
  lines.push(`- Billing: ${contract.gateway.mode}`);
  if (contract.billing.trialDays) {
    lines.push(`- Free trial: ${contract.billing.trialDays} days`);
  }
  lines.push("");

  return lines.join("\n");
}

const content = generateLlmsTxt();

export function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
