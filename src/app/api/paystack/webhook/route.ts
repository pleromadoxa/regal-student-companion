import { NextRequest, NextResponse } from "next/server";
import { verifyPaystackSignature, verifyTransaction, paystackSecretKey } from "@/lib/paystack";
import { activatePlan } from "@/lib/subscription";
import { createServiceClientAsync, hasServiceRoleAsync } from "@/lib/supabase/service";
import { isPlanId, type PlanId } from "@/lib/plans";

export async function POST(request: NextRequest) {
  if (!paystackSecretKey()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    event: string;
    data: {
      reference?: string;
      status?: string;
      customer?: { customer_code?: string };
      metadata?: { user_id?: string; plan_id?: PlanId };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const reference = event.data.reference;
  const userId = event.data.metadata?.user_id;
  const planId = event.data.metadata?.plan_id;

  if (!reference || !userId || !planId) {
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }
  if (!isPlanId(planId) || planId === "scholar") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Plan writes require the service role — without it this event cannot be
  // applied, so tell Paystack to retry rather than silently dropping it.
  if (!(await hasServiceRoleAsync())) {
    return NextResponse.json(
      {
        error:
          "Billing activation is not configured on this server (missing SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 503 }
    );
  }
  const supabase = await createServiceClientAsync();

  try {
    const tx = await verifyTransaction(reference);
    if (tx.status !== "success") {
      return NextResponse.json({ received: true, skipped: true });
    }

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const activation = await activatePlan(supabase, userId, planId, {
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
      .eq("user_id", userId);

    if (refError) console.error("[paystack/webhook] reference update:", refError.message);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[paystack/webhook]", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
