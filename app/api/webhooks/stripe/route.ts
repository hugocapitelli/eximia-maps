import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { contract, stripeAdapter } from "@/lib/productization";
import { processWebhookResult } from "@/lib/productization/lifecycle";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const result = await stripeAdapter.handleWebhook(body, signature);
    const db = createAdminClient();

    await processWebhookResult(db, contract, result);

    return NextResponse.json({ received: true, action: result.action });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[stripe-webhook]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
