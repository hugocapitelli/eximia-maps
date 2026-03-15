import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";

// POST /api/integrations/discover — Discovery proxy (fetch remote catalog)
export async function POST(request: NextRequest) {
  const result = await getCurrentUser();
  if (!result?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url: string; api_key: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.url?.trim() || !body.api_key?.trim()) {
    return Response.json({ error: "url and api_key are required" }, { status: 400 });
  }

  const catalogUrl = `${body.url.replace(/\/$/, "")}/api/v1/integration/catalog`;

  try {
    const res = await fetch(catalogUrl, {
      headers: {
        "x-eximia-api-key": body.api_key,
        "x-eximia-contract-version": "v1",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return Response.json(
        { error: `Remote returned ${res.status}` },
        { status: 502 }
      );
    }

    const catalog = await res.json();
    return Response.json(catalog);
  } catch {
    return Response.json({ error: "Failed to connect to remote app" }, { status: 502 });
  }
}
