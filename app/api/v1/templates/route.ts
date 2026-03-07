import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get public templates + user's own templates
  let query = supabase
    .from("map_templates")
    .select("id, name, description, category, data, node_count, is_public, created_by, created_at")
    .order("created_at", { ascending: false });

  if (user) {
    query = query.or(`is_public.eq.true,created_by.eq.${user.id}`);
  } else {
    query = query.eq("is_public", true);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, category, data } = body;

  if (!name || !data) {
    return NextResponse.json({ error: "Name and data are required" }, { status: 400 });
  }

  const nodeCount = data?.nodes?.length || 0;

  const { data: template, error } = await supabase
    .from("map_templates")
    .insert({
      name,
      description: description || "",
      category: category || "custom",
      data,
      node_count: nodeCount,
      is_public: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(template);
}
