import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "./helpers";

interface FetchOptions {
  connectionId: string;
  method: "GET" | "POST" | "PUT";
  path: string;
  body?: unknown;
  ownerId: string;
}

interface IntegrationResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export async function integrationFetch<T = unknown>(opts: FetchOptions): Promise<IntegrationResponse<T>> {
  const admin = createAdminClient();
  const start = Date.now();

  const { data: conn } = await admin
    .from("integration_outbound")
    .select("*")
    .eq("id", opts.connectionId)
    .single();

  if (!conn) {
    throw new Error("Connection not found");
  }

  const apiKey = decrypt(conn.api_key_encrypted);
  const url = `${conn.remote_url.replace(/\/$/, "")}/api/v1/integration/${opts.path}`;

  const headers: Record<string, string> = {
    "x-eximia-api-key": apiKey,
    "x-eximia-contract-version": "v1",
    "Content-Type": "application/json",
  };

  const fetchOpts: RequestInit = {
    method: opts.method,
    headers,
  };

  if (opts.body && (opts.method === "POST" || opts.method === "PUT")) {
    fetchOpts.body = JSON.stringify(opts.body);
  }

  let status = 0;
  let responseData: T;

  try {
    const res = await fetch(url, fetchOpts);
    status = res.status;
    responseData = (await res.json()) as T;
  } catch (err) {
    const duration = Date.now() - start;

    await admin.from("integration_logs").insert({
      direction: "outbound",
      method: opts.method,
      endpoint: opts.path,
      entity: opts.path.split("/")[0] || null,
      status_code: 0,
      duration_ms: duration,
      remote_app: conn.remote_app,
      owner_id: opts.ownerId,
    });

    await admin
      .from("integration_outbound")
      .update({ status: "error", last_error: String(err) })
      .eq("id", conn.id);

    throw err;
  }

  const duration = Date.now() - start;

  await admin.from("integration_logs").insert({
    direction: "outbound",
    method: opts.method,
    endpoint: opts.path,
    entity: opts.path.split("/")[0] || null,
    status_code: status,
    duration_ms: duration,
    remote_app: conn.remote_app,
    owner_id: opts.ownerId,
  });

  if (status >= 200 && status < 300) {
    await admin
      .from("integration_outbound")
      .update({ status: "active", last_sync: new Date().toISOString(), last_error: null })
      .eq("id", conn.id);
  }

  return { ok: status >= 200 && status < 300, status, data: responseData };
}
