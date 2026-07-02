import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-server";
import { isCompanionAdmin, logAdminAction } from "@/lib/admin";
import { createServiceClient, hasServiceRole } from "@/lib/supabase/service";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isCompanionAdmin(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasServiceRole()) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("companion_subscriptions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscriptions: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isCompanionAdmin(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasServiceRole()) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

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

  const service = createServiceClient();
  const { error } = await service.from("companion_subscriptions").update(patch).eq("user_id", body.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(user.id, "manual_plan_update", "subscription", body.userId, patch);
  return NextResponse.json({ ok: true });
}
