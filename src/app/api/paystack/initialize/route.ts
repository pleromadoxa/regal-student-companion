import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlanId, planRank, PLANS, type PlanId } from "@/lib/plans";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";
import { getUserSubscription } from "@/lib/subscription";
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
    if (!isPlanId(planId) || planId === "scholar") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Hybrid entitlements: never charge for a tier the account already has
    // through Regal One or an active student plan.
    const subscription = await getUserSubscription(supabase, user.id);
    if (planRank(subscription.planId) >= planRank(planId)) {
      return NextResponse.json(
        {
          error: subscription.viaRegalOne
            ? `Already included with your ${subscription.regalTierName} plan.`
            : "You already have this plan.",
          alreadyEntitled: true,
        },
        { status: 409 }
      );
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

    // Store the payment reference only — plan_id/status are privileged columns
    // (activated later by Paystack verify/webhook with the service role).
    const nowIso = new Date().toISOString();
    const { data: existingRow } = await supabase
      .from("companion_subscriptions")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const refWrite = existingRow
      ? await supabase
          .from("companion_subscriptions")
          .update({ paystack_reference: reference, updated_at: nowIso })
          .eq("user_id", user.id)
      : await supabase
          .from("companion_subscriptions")
          .insert({ user_id: user.id, paystack_reference: reference, updated_at: nowIso });
    if (refWrite.error) {
      console.error("[paystack/initialize] reference write:", refWrite.error.message);
    }

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
