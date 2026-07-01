import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/plans";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";
import { USER_FACING } from "@/lib/branding";
import { SITE } from "@/lib/site";
import { clientIp, rateLimitMemory } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    if (!isPaystackConfigured()) {
      return NextResponse.json(
        { error: USER_FACING.paymentUnavailable },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in to upgrade your plan" }, { status: 401 });
    }

    if (!rateLimitMemory(`paystack-init:${user.id}:${clientIp(request)}`, 5, 60_000)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = (await request.json().catch(() => null)) as { planId?: PlanId } | null;
    const planId = body?.planId;
    if (!planId || !PLANS[planId] || planId === "scholar") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const plan = PLANS[planId];
    const reference = `rc_${planId}_${user.id.slice(0, 8)}_${Date.now()}`;

    const data = await initializeTransaction({
      email: user.email,
      amountCents: plan.amountCents,
      currency: plan.currency,
      reference,
      callbackUrl: `${SITE.url}/pricing/callback`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        product: "regal-companion",
      },
    });

    const { error: upsertError } = await supabase.from("companion_subscriptions").upsert(
      {
        user_id: user.id,
        plan_id: planId,
        status: "trialing",
        paystack_reference: reference,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (upsertError) console.error("[paystack/initialize] upsert:", upsertError.message);

    return NextResponse.json({
      authorization_url: data.authorization_url,
      reference: data.reference,
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    });
  } catch (err) {
    console.error("[paystack/initialize]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment initialization failed" },
      { status: 500 }
    );
  }
}
