import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/integration/helpers";

// GET /api/integrations/connections — List outbound connections
export async function GET() {
  const result = await getCurrentUser();
  if (!result?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("integration_outbound")
    .select("id, remote_app, remote_url, status, entities, catalog_cache, last_sync, last_error, created_at")
    .eq("owner_id", result.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data || []);
}

// POST /api/integrations/connections — Create outbound connection
export async function POST(request: NextRequest) {
  const result = await getCurrentUser();
  if (!result?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { remote_app: string; remote_url: string; api_key: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.remote_app?.trim() || !body.remote_url?.trim() || !body.api_key?.trim()) {
    return Response.json({ error: "remote_app, remote_url, and api_key are required" }, { status: 400 });
  }

  // Validate URL format
  try {
    new URL(body.remote_url);
  } catch {
    return Response.json({ error: "Invalid remote_url format" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Test connection by fetching catalog
  const catalogUrl = `${body.remote_url.replace(/\/$/, "")}/api/v1/integration/catalog`;
  let catalogCache = null;
  let entities: string[] = [];
  let status = "pending";

  try {
    const res = await fetch(catalogUrl, {
      headers: {
        "x-eximia-api-key": body.api_key,
        "x-eximia-contract-version": "v1",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      catalogCache = await res.json();
      entities = Object.keys(catalogCache.entities || {});
      status = "active";
    } else {
      status = "error";
    }
  } catch {
    status = "pending";
  }

  const { data, error } = await admin
    .from("integration_outbound")
    .insert({
      owner_id: result.user.id,
      remote_app: body.remote_app.trim(),
      remote_url: body.remote_url.trim().replace(/\/$/, ""),
      api_key_encrypted: encrypt(body.api_key.trim()),
      status,
      entities,
      catalog_cache: catalogCache,
      last_sync: status === "active" ? new Date().toISOString() : null,
    })
    .select("id, remote_app, remote_url, status, entities, catalog_cache, last_sync, created_at")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
