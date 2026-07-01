import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyTransaction, isPaystackConfigured } from "@/lib/paystack";
import { activatePlan } from "@/lib/subscription";
import { USER_FACING } from "@/lib/branding";
import type { PlanId } from "@/lib/plans";

export async function GET(request: NextRequest) {
  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  if (!isPaystackConfigured()) {
    return NextResponse.json({ error: USER_FACING.paymentUnavailable }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tx = await verifyTransaction(reference);
    if (tx.status !== "success") {
      return NextResponse.json({ error: "Payment not completed", status: tx.status }, { status: 402 });
    }

    const meta = tx.metadata as { user_id?: string; plan_id?: PlanId } | undefined;
    if (meta?.user_id && meta.user_id !== user.id) {
      return NextResponse.json({ error: "Payment user mismatch" }, { status: 403 });
    }

    const planId = meta?.plan_id ?? "graduate";
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const activation = await activatePlan(supabase, user.id, planId, {
      customer_code: tx.customer?.customer_code,
      period_end: periodEnd.toISOString(),
    });
    if (!activation.ok) {
      return NextResponse.json({ error: activation.error ?? "Plan activation failed" }, { status: 500 });
    }

    const { error: refError } = await supabase
      .from("companion_subscriptions")
      .update({
        paystack_reference: reference,
        current_period_end: periodEnd.toISOString(),
      })
      .eq("user_id", user.id);

    if (refError) console.error("[paystack/verify] reference update:", refError.message);

    return NextResponse.json({ ok: true, planId, reference });
  } catch (err) {
    console.error("[paystack/verify]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 500 }
    );
  }
}
