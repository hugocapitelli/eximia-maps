import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("mind_maps")
    .select("id, title, description, slug, data, node_count, created_at, updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
