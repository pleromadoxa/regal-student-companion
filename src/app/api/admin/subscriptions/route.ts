import { NextRequest, NextResponse } from "next/server";
import { isAdminGateError, requireAdminApi } from "@/lib/admin-api";
import { logAdminAction } from "@/lib/admin";
import { isPlanId } from "@/lib/plans";

export async function GET() {
  const gate = await requireAdminApi();
  if (isAdminGateError(gate)) return gate.error;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("companion_subscriptions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscriptions: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireAdminApi();
  if (isAdminGateError(gate)) return gate.error;
  const { user, supabase } = gate;

  const body = (await request.json()) as {
    userId?: string;
    planId?: string;
    status?: string;
    resetAi?: boolean;
    resetVoice?: boolean;
  };

  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  if (body.planId && !isPlanId(body.planId)) {
    return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
  }
  if (
    body.status &&
    !["active", "cancelled", "past_due", "trialing", "expired"].includes(body.status)
  ) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Plan/status columns are privileged — go through the admin-gated RPC.
  if (body.planId || body.status) {
    const { error: rpcError } = await supabase.rpc("companion_admin_set_subscription", {
      p_user_id: body.userId,
      p_plan_id: body.planId ?? "scholar",
      p_status: body.status ?? "active",
    });
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.resetAi) {
    patch.ai_requests_today = 0;
    patch.ai_requests_reset_at = new Date().toISOString().slice(0, 10);
  }
  if (body.resetVoice) {
    patch.voice_sessions_month = 0;
    patch.voice_sessions_reset_at = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase.from("companion_subscriptions").update(patch).eq("user_id", body.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(user.id, "manual_plan_update", "subscription", body.userId, {
    planId: body.planId,
    status: body.status,
    resetAi: body.resetAi ?? false,
    resetVoice: body.resetVoice ?? false,
  });
  return NextResponse.json({ ok: true });
}
