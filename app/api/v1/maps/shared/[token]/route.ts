import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Fetch map by share token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("mind_maps")
    .select("id, title, description, data, node_count, status")
    .eq("share_token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PUT: Update map by share token (anyone with token can edit)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = getAdminClient();
  const body = await request.json();

  // Verify token exists
  const { data: map } = await supabase
    .from("mind_maps")
    .select("id")
    .eq("share_token", token)
    .single();

  if (!map) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.data !== undefined) {
    updateData.data = body.data;
    updateData.node_count = body.data.nodes?.length || 0;
  }
  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("mind_maps")
    .update(updateData)
    .eq("id", map.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
