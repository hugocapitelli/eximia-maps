import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, hasScope, errorResponse, type IntegrationAuth } from "@/lib/integration/auth";
import { CATALOG } from "@/lib/integration/catalog";

// ── Logging helper ──

async function logRequest(
  auth: IntegrationAuth | null,
  method: string,
  endpoint: string,
  entity: string | null,
  statusCode: number,
  durationMs: number
) {
  try {
    const admin = createAdminClient();
    await admin.from("integration_logs").insert({
      direction: "inbound",
      method,
      endpoint,
      entity,
      status_code: statusCode,
      duration_ms: durationMs,
      remote_app: auth?.appName || "unknown",
      owner_id: auth?.ownerId || null,
    });
  } catch {
    // Silent — logging should never break the request
  }
}

// ── GET handler ──

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const start = Date.now();
  const { path } = await params;

  const auth = await validateApiKey(request);
  if (!auth) {
    await logRequest(null, "GET", path.join("/"), null, 401, Date.now() - start);
    return errorResponse("UNAUTHORIZED", "Missing or invalid API key", 401);
  }

  if (!hasScope(auth, "read")) {
    await logRequest(auth, "GET", path.join("/"), null, 403, Date.now() - start);
    return errorResponse("FORBIDDEN", "Key lacks required scope: read", 403);
  }

  // GET /catalog
  if (path.length === 1 && path[0] === "catalog") {
    await logRequest(auth, "GET", "catalog", null, 200, Date.now() - start);
    return Response.json(CATALOG);
  }

  // GET /:entity
  if (path.length === 1) {
    return handleListEntity(request, auth, path[0], start);
  }

  // GET /:entity/:id
  if (path.length === 2) {
    return handleGetEntity(auth, path[0], path[1], start);
  }

  await logRequest(auth, "GET", path.join("/"), null, 404, Date.now() - start);
  return errorResponse("ENTITY_NOT_FOUND", "Route not found", 404);
}

// ── POST handler ──

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const start = Date.now();
  const { path } = await params;

  const auth = await validateApiKey(request);
  if (!auth) {
    await logRequest(null, "POST", path.join("/"), null, 401, Date.now() - start);
    return errorResponse("UNAUTHORIZED", "Missing or invalid API key", 401);
  }

  if (!hasScope(auth, "write")) {
    await logRequest(auth, "POST", path.join("/"), null, 403, Date.now() - start);
    return errorResponse("FORBIDDEN", "Key lacks required scope: write", 403);
  }

  // POST /:entity
  if (path.length === 1) {
    return handleCreateEntity(request, auth, path[0], start);
  }

  await logRequest(auth, "POST", path.join("/"), null, 404, Date.now() - start);
  return errorResponse("ENTITY_NOT_FOUND", "Route not found", 404);
}

// ── PUT handler ──

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const start = Date.now();
  const { path } = await params;

  const auth = await validateApiKey(request);
  if (!auth) {
    await logRequest(null, "PUT", path.join("/"), null, 401, Date.now() - start);
    return errorResponse("UNAUTHORIZED", "Missing or invalid API key", 401);
  }

  if (!hasScope(auth, "write")) {
    await logRequest(auth, "PUT", path.join("/"), null, 403, Date.now() - start);
    return errorResponse("FORBIDDEN", "Key lacks required scope: write", 403);
  }

  // PUT /:entity/:id
  if (path.length === 2) {
    return handleUpdateEntity(request, auth, path[0], path[1], start);
  }

  await logRequest(auth, "PUT", path.join("/"), null, 404, Date.now() - start);
  return errorResponse("ENTITY_NOT_FOUND", "Route not found", 404);
}

// ── OPTIONS (CORS) ──

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-eximia-api-key, x-eximia-contract-version",
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// Entity Handlers
// ═══════════════════════════════════════════════════════════════

async function handleListEntity(request: NextRequest, auth: IntegrationAuth, entity: string, start: number) {
  const entityDef = CATALOG.entities[entity];
  if (!entityDef || !entityDef.operations.includes("list")) {
    await logRequest(auth, "GET", entity, entity, 404, Date.now() - start);
    return errorResponse("ENTITY_NOT_FOUND", `Entity '${entity}' not found or does not support list`, 404);
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;

  const admin = createAdminClient();
  const table = entityToTable(entity);

  let query = admin.from(table).select("*", { count: "exact" });

  if (entity === "maps") {
    query = query.eq("user_id", auth.ownerId);
  } else if (entity === "templates") {
    query = query.eq("is_public", true);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    await logRequest(auth, "GET", entity, entity, 500, Date.now() - start);
    return errorResponse("INTERNAL_ERROR", error.message, 500);
  }

  const total = count || 0;
  const result = {
    data: (data || []).map((r: Record<string, unknown>) => sanitizeRecord(r, entity)),
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };

  await logRequest(auth, "GET", entity, entity, 200, Date.now() - start);
  return Response.json(result);
}

async function handleGetEntity(auth: IntegrationAuth, entity: string, id: string, start: number) {
  const entityDef = CATALOG.entities[entity];
  if (!entityDef || !entityDef.operations.includes("get")) {
    await logRequest(auth, "GET", `${entity}/${id}`, entity, 404, Date.now() - start);
    return errorResponse("ENTITY_NOT_FOUND", `Entity '${entity}' not found or does not support get`, 404);
  }

  const admin = createAdminClient();
  const table = entityToTable(entity);

  const { data, error } = await admin
    .from(table)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    await logRequest(auth, "GET", `${entity}/${id}`, entity, 404, Date.now() - start);
    return errorResponse("RECORD_NOT_FOUND", "Record not found", 404);
  }

  // Verify ownership for maps
  if (entity === "maps" && (data as Record<string, unknown>).user_id !== auth.ownerId) {
    await logRequest(auth, "GET", `${entity}/${id}`, entity, 404, Date.now() - start);
    return errorResponse("RECORD_NOT_FOUND", "Record not found", 404);
  }

  await logRequest(auth, "GET", `${entity}/${id}`, entity, 200, Date.now() - start);
  return Response.json({ data: sanitizeRecord(data as Record<string, unknown>, entity) });
}

async function handleCreateEntity(request: NextRequest, auth: IntegrationAuth, entity: string, start: number) {
  const entityDef = CATALOG.entities[entity];
  if (!entityDef || !entityDef.operations.includes("create")) {
    await logRequest(auth, "POST", entity, entity, 404, Date.now() - start);
    return errorResponse("ENTITY_NOT_FOUND", `Entity '${entity}' not found or does not support create`, 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    await logRequest(auth, "POST", entity, entity, 422, Date.now() - start);
    return errorResponse("VALIDATION_ERROR", "Invalid JSON body", 422);
  }

  // Validate required fields
  const missing = Object.entries(entityDef.schema)
    .filter(([, def]) => def.required && !def.readonly)
    .filter(([key]) => body[key] === undefined || body[key] === null)
    .map(([key]) => key);

  if (missing.length > 0) {
    await logRequest(auth, "POST", entity, entity, 422, Date.now() - start);
    return errorResponse("VALIDATION_ERROR", `Missing required fields: ${missing.join(", ")}`, 422, { missing });
  }

  // Strip readonly fields and build writeable body
  const writeableBody: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(entityDef.schema)) {
    if (!def.readonly && body[key] !== undefined) {
      writeableBody[key] = body[key];
    }
  }

  // Set ownership
  if (entity === "maps") {
    writeableBody.user_id = auth.ownerId;
    // Generate slug from title
    const title = writeableBody.title as string;
    writeableBody.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    // Count nodes
    const data = writeableBody.data as { nodes?: unknown[] } | undefined;
    writeableBody.node_count = data?.nodes?.length || 0;
  }

  const admin = createAdminClient();
  const table = entityToTable(entity);

  const { data, error } = await admin
    .from(table)
    .insert(writeableBody)
    .select()
    .single();

  if (error) {
    await logRequest(auth, "POST", entity, entity, 500, Date.now() - start);
    return errorResponse("INTERNAL_ERROR", error.message, 500);
  }

  await logRequest(auth, "POST", entity, entity, 201, Date.now() - start);
  return Response.json({ data: sanitizeRecord(data as Record<string, unknown>, entity) }, { status: 201 });
}

async function handleUpdateEntity(request: NextRequest, auth: IntegrationAuth, entity: string, id: string, start: number) {
  const entityDef = CATALOG.entities[entity];
  if (!entityDef || !entityDef.operations.includes("update")) {
    await logRequest(auth, "PUT", `${entity}/${id}`, entity, 404, Date.now() - start);
    return errorResponse("ENTITY_NOT_FOUND", `Entity '${entity}' not found or does not support update`, 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    await logRequest(auth, "PUT", `${entity}/${id}`, entity, 422, Date.now() - start);
    return errorResponse("VALIDATION_ERROR", "Invalid JSON body", 422);
  }

  const admin = createAdminClient();
  const table = entityToTable(entity);

  // Check existence & ownership
  const { data: existing } = await admin.from(table).select("*").eq("id", id).single();
  if (!existing) {
    await logRequest(auth, "PUT", `${entity}/${id}`, entity, 404, Date.now() - start);
    return errorResponse("RECORD_NOT_FOUND", "Record not found", 404);
  }

  if (entity === "maps" && (existing as Record<string, unknown>).user_id !== auth.ownerId) {
    await logRequest(auth, "PUT", `${entity}/${id}`, entity, 404, Date.now() - start);
    return errorResponse("RECORD_NOT_FOUND", "Record not found", 404);
  }

  // Strip readonly fields
  const writeableBody: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(entityDef.schema)) {
    if (!def.readonly && body[key] !== undefined) {
      writeableBody[key] = body[key];
    }
  }

  // Recalculate node_count if data changed
  if (entity === "maps" && writeableBody.data) {
    const data = writeableBody.data as { nodes?: unknown[] };
    writeableBody.node_count = data?.nodes?.length || 0;
  }

  const { data, error } = await admin
    .from(table)
    .update(writeableBody)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    await logRequest(auth, "PUT", `${entity}/${id}`, entity, 500, Date.now() - start);
    return errorResponse("INTERNAL_ERROR", error.message, 500);
  }

  await logRequest(auth, "PUT", `${entity}/${id}`, entity, 200, Date.now() - start);
  return Response.json({ data: sanitizeRecord(data as Record<string, unknown>, entity) });
}

// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════

function entityToTable(entity: string): string {
  const map: Record<string, string> = {
    maps: "mind_maps",
    templates: "map_templates",
  };
  return map[entity] || entity;
}

function sanitizeRecord(record: Record<string, unknown>, entity: string): Record<string, unknown> {
  const schema = CATALOG.entities[entity]?.schema;
  if (!schema) return record;

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(schema)) {
    if (record[key] !== undefined) {
      result[key] = record[key];
    }
  }
  return result;
}
