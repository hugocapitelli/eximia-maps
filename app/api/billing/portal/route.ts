import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/helpers";
import { stripeAdapter } from "@/lib/productization";

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account" }, { status: 400 });
    }

    const result = await stripeAdapter.createPortal({
      customerId: profile.stripe_customer_id,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/upgrade`,
    });

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("[portal]", error);
    return NextResponse.json({ error: "Portal failed" }, { status: 500 });
  }
}
