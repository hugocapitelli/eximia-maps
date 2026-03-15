import { getCurrentUser } from "@/lib/auth/helpers";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/integrations/logs — List integration logs for current user
export async function GET() {
  const result = await getCurrentUser();
  if (!result?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("integration_logs")
    .select("*")
    .eq("owner_id", result.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data || []);
}
