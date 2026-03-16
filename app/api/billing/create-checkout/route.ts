import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/helpers";
import { stripeAdapter } from "@/lib/productization";

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { plan } = await request.json();
    if (!plan) return NextResponse.json({ error: "Plan required" }, { status: 400 });

    // Get or create user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const result = await stripeAdapter.createCheckout({
      userId: user.id,
      email: user.email,
      planSlug: plan,
      customerId: profile?.stripe_customer_id ?? undefined,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/upgrade?success=true&plan=${plan}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/upgrade?canceled=true`,
    });

    // Persist customer ID if newly created
    if (!profile?.stripe_customer_id) {
      await supabase
        .from("user_profiles")
        .upsert({
          id: user.id,
          email: user.email,
          stripe_customer_id: result.customerId,
        }, { onConflict: "id" });
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("[checkout]", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
