import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

// Generate or get share token for a map
export async function POST(
  request: Request,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const { mapId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check ownership
  const { data: map } = await supabase
    .from("mind_maps")
    .select("id, share_token, user_id")
    .eq("id", mapId)
    .single();

  if (!map || map.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If already has token, return it
  if (map.share_token) {
    return NextResponse.json({ share_token: map.share_token });
  }

  // Generate new token
  const token = randomBytes(16).toString("hex");
  const { error } = await supabase
    .from("mind_maps")
    .update({ share_token: token })
    .eq("id", mapId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ share_token: token });
}

// Revoke share token
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const { mapId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("mind_maps")
    .update({ share_token: null })
    .eq("id", mapId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
