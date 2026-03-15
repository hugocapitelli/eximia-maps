import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/integration/helpers";

// DELETE /api/integrations/connections/:id — Remove connection
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getCurrentUser();
  if (!result?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("integration_outbound")
    .delete()
    .eq("id", id)
    .eq("owner_id", result.user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

// POST /api/integrations/connections/:id — Test connection (re-fetch catalog)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getCurrentUser();
  if (!result?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("integration_outbound")
    .select("*")
    .eq("id", id)
    .eq("owner_id", result.user.id)
    .single();

  if (!conn) {
    return Response.json({ error: "Connection not found" }, { status: 404 });
  }

  const apiKey = decrypt(conn.api_key_encrypted);
  const catalogUrl = `${conn.remote_url}/api/v1/integration/catalog`;

  try {
    const res = await fetch(catalogUrl, {
      headers: {
        "x-eximia-api-key": apiKey,
        "x-eximia-contract-version": "v1",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const catalog = await res.json();
      await admin
        .from("integration_outbound")
        .update({
          status: "active",
          catalog_cache: catalog,
          entities: Object.keys(catalog.entities || {}),
          last_sync: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", id);

      return Response.json({ ok: true, status: "active", catalog });
    } else {
      const errText = await res.text().catch(() => "Unknown error");
      await admin
        .from("integration_outbound")
        .update({ status: "error", last_error: `HTTP ${res.status}: ${errText}` })
        .eq("id", id);

      return Response.json({ ok: false, status: "error", error: `HTTP ${res.status}` }, { status: 502 });
    }
  } catch (err) {
    await admin
      .from("integration_outbound")
      .update({ status: "error", last_error: String(err) })
      .eq("id", id);

    return Response.json({ ok: false, status: "error", error: "Connection failed" }, { status: 502 });
  }
}
