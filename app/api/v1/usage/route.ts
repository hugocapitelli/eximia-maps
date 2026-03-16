import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  contract,
  getUserPlan,
  getQuotaUsage,
  buildQuotaUsage,
  getFeatureStatuses,
} from "@/lib/productization";

const QUOTA_SLUGS = ["maps", "ai_generations"];

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient();
    const plan = await getUserPlan(db, contract, auth.user.id);

    const counts: Record<string, number> = {};
    for (const slug of QUOTA_SLUGS) {
      counts[slug] = await getQuotaUsage(db, contract, auth.user.id, slug);
    }

    return NextResponse.json({
      plan,
      quotas: buildQuotaUsage(contract, plan, counts),
      features: getFeatureStatuses(contract, plan),
    });
  } catch (error) {
    console.error("[usage]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
