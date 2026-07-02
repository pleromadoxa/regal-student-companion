import { NextRequest, NextResponse } from "next/server";
import { isAdminGateError, requireAdminApi } from "@/lib/admin-api";
import { logAdminAction } from "@/lib/admin";

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

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.planId) patch.plan_id = body.planId;
  if (body.status) patch.status = body.status;
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

  await logAdminAction(user.id, "manual_plan_update", "subscription", body.userId, patch);
  return NextResponse.json({ ok: true });
}
