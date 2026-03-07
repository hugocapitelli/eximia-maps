import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const { mapId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: original, error: fetchError } = await supabase
    .from("mind_maps")
    .select("*")
    .eq("id", mapId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const title = `${original.title} (copia)`;
  const { data, error } = await supabase
    .from("mind_maps")
    .insert({
      user_id: user.id,
      title,
      slug: slugify(title) + "-" + Date.now().toString(36),
      description: original.description,
      data: original.data,
      node_count: original.node_count,
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
