import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // Templates GET supports both authenticated and public access
  const auth = await getAuthContext(request);

  // If authenticated, show public + user's own templates
  if (auth) {
    const { user, supabase } = auth;
    const { data, error } = await supabase
      .from("map_templates")
      .select("id, name, description, category, data, node_count, is_public, created_by, created_at")
      .or(`is_public.eq.true,created_by.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Public access: only public templates
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("map_templates")
    .select("id, name, description, category, data, node_count, is_public, created_by, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

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
