import { NextResponse, type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { contract, getUserPlan, getQuotaUsage, checkQuota } from "@/lib/productization";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data, error } = await supabase
    .from("mind_maps")
    .select("id, title, description, status, node_count, data, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  // Quota gate: total maps
  const db = createAdminClient();
  const plan = await getUserPlan(db, contract, user.id);
  const mapsUsage = await getQuotaUsage(db, contract, user.id, "maps");
  const mapsCheck = checkQuota(contract, plan, "maps", mapsUsage);
  if (!mapsCheck.allowed) {
    return NextResponse.json(
      { error: mapsCheck.reason, code: "PLAN_LIMIT" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const title = body.title || "Mapa sem titulo";

  const { data, error } = await supabase
    .from("mind_maps")
    .insert({
      user_id: user.id,
      title,
      slug: slugify(title) + "-" + Date.now().toString(36),
      description: body.description || null,
      data: body.data || { nodes: [], edges: [] },
      node_count: body.node_count || 0,
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
