import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth-server";
import { isCompanionAdmin, logAdminAction } from "@/lib/admin";
import { createServiceClient, hasServiceRole } from "@/lib/supabase/service";

async function guardAdmin() {
  const user = await getAuthUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const ok = await isCompanionAdmin(user);
  if (!ok) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  if (!hasServiceRole()) {
    return { error: NextResponse.json({ error: "Service role not configured" }, { status: 503 }) };
  }
  return { user, service: createServiceClient() };
}

export async function GET() {
  const gate = await guardAdmin();
  if ("error" in gate && gate.error) return gate.error;
  const { service } = gate as { user: { id: string }; service: ReturnType<typeof createServiceClient> };

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const dayAgo = new Date(Date.now() - 86400000).toISOString();

  const [
    { count: totalMembers },
    { count: activeToday },
    { count: activeWeek },
    { count: openTickets },
    { count: graduatePlans },
    { count: campusPlans },
    { data: recentActivity },
    { data: dailyActivity },
  ] = await Promise.all([
    service.from("companion_app_members").select("user_id", { count: "exact", head: true }),
    service.from("companion_app_members").select("user_id", { count: "exact", head: true }).gte("last_seen_at", dayAgo),
    service.from("companion_app_members").select("user_id", { count: "exact", head: true }).gte("last_seen_at", weekAgo),
    service.from("companion_support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
    service.from("companion_subscriptions").select("user_id", { count: "exact", head: true }).eq("plan_id", "graduate").eq("status", "active"),
    service.from("companion_subscriptions").select("user_id", { count: "exact", head: true }).eq("plan_id", "campus").eq("status", "active"),
    service
      .from("companion_activity_log")
      .select("id, user_id, action, label, category, points_delta, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    service
      .from("companion_activity_log")
      .select("created_at")
      .gte("created_at", weekAgo),
  ]);

  const byDay: Record<string, number> = {};
  for (const row of dailyActivity ?? []) {
    const d = (row.created_at as string).slice(0, 10);
    byDay[d] = (byDay[d] ?? 0) + 1;
  }

  return NextResponse.json({
    stats: {
      totalMembers: totalMembers ?? 0,
      activeToday: activeToday ?? 0,
      activeWeek: activeWeek ?? 0,
      openTickets: openTickets ?? 0,
      paidPlans: (graduatePlans ?? 0) + (campusPlans ?? 0),
      graduatePlans: graduatePlans ?? 0,
      campusPlans: campusPlans ?? 0,
    },
    recentActivity: recentActivity ?? [],
    activityByDay: Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
  });
}

export async function PATCH(request: NextRequest) {
  const gate = await guardAdmin();
  if ("error" in gate && gate.error) return gate.error;
  const { user, service } = gate as { user: { id: string }; service: ReturnType<typeof createServiceClient> };

  const body = (await request.json()) as {
    targetUserId?: string;
    planId?: string;
    status?: string;
    resetAiUsage?: boolean;
  };

  if (!body.targetUserId) {
    return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.planId) patch.plan_id = body.planId;
  if (body.status) patch.status = body.status;
  if (body.resetAiUsage) {
    patch.ai_requests_today = 0;
    patch.ai_requests_reset_at = new Date().toISOString().slice(0, 10);
  }

  const { error } = await service
    .from("companion_subscriptions")
    .update(patch)
    .eq("user_id", body.targetUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(user.id, "subscription_update", "user", body.targetUserId, patch);
  return NextResponse.json({ ok: true });
}
