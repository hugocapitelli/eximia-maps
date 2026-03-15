import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GATE_URL = process.env.GATE_URL || "";
const APP_SLUG = "maps";

// ─── Original function (backwards compat for integrations routes) ───

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data;
}

// ─── Dual-mode auth for API routes ───

export interface AuthContext {
  user: { id: string; email: string; name: string; role: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
}

/**
 * Dual-mode auth for API routes.
 * Gate mode (GATE_URL set): verifies Bearer token via Gate API, returns admin Supabase client.
 * Standalone mode: uses Supabase cookie auth, returns authenticated client.
 */
export async function getAuthContext(
  req: Request
): Promise<AuthContext | null> {
  // Gate mode: check Authorization header
  if (GATE_URL) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const res = await fetch(`${GATE_URL}/api/v1/gate/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.apps_allowed.includes(APP_SLUG)) return null;
          return { user: data.user, supabase: createAdminClient() };
        }
      } catch {
        // Gate unavailable — fall through to Supabase
      }
      return null;
    }
  }

  // Standalone: Supabase cookie auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    user: {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.email!.split("@")[0],
      role: "admin",
    },
    supabase,
  };
}
