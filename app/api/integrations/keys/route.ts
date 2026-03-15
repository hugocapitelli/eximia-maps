import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey } from "@/lib/integration/helpers";

// GET /api/integrations/keys — List all keys for current user
export async function GET() {
  const result = await getCurrentUser();
  if (!result?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("integration_keys")
    .select("id, app_name, key_prefix, scopes, status, last_used, expires_at, created_at")
    .eq("owner_id", result.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data || []);
}

// POST /api/integrations/keys — Create new API key
export async function POST(request: NextRequest) {
  const result = await getCurrentUser();
  if (!result?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { app_name: string; scopes?: string[]; expires_at?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.app_name?.trim()) {
    return Response.json({ error: "app_name is required" }, { status: 400 });
  }

  const validScopes = ["read", "write", "admin"];
  const scopes = (body.scopes || ["read"]).filter((s) => validScopes.includes(s));

  const slug = body.app_name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
  const { raw, prefix, hash } = generateApiKey(slug);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("integration_keys")
    .insert({
      owner_id: result.user.id,
      app_name: body.app_name.trim(),
      key_prefix: prefix,
      key_hash: hash,
      scopes,
      expires_at: body.expires_at || null,
    })
    .select("id, app_name, key_prefix, scopes, status, created_at")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Return raw key ONLY on creation — never stored or retrievable again
  return Response.json({ ...data, key: raw }, { status: 201 });
}
