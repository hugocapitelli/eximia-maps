import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashKey } from "./helpers";

export interface IntegrationAuth {
  keyId: string;
  appName: string;
  scopes: string[];
  ownerId: string;
}

export async function validateApiKey(request: NextRequest): Promise<IntegrationAuth | null> {
  const apiKey = request.headers.get("x-eximia-api-key");
  if (!apiKey) return null;

  const hash = hashKey(apiKey);
  const admin = createAdminClient();

  const { data: key } = await admin
    .from("integration_keys")
    .select("id, app_name, scopes, owner_id, status, expires_at")
    .eq("key_hash", hash)
    .single();

  if (!key || key.status !== "active") return null;

  if (key.expires_at && new Date(key.expires_at) < new Date()) return null;

  // Update last_used
  await admin
    .from("integration_keys")
    .update({ last_used: new Date().toISOString() })
    .eq("id", key.id);

  return {
    keyId: key.id,
    appName: key.app_name,
    scopes: key.scopes || ["read"],
    ownerId: key.owner_id,
  };
}

export function hasScope(auth: IntegrationAuth, scope: string): boolean {
  return auth.scopes.includes("admin") || auth.scopes.includes(scope);
}

export function errorResponse(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return Response.json({ error: message, code, details: details || {} }, { status });
}
