import { NextResponse } from "next/server";
import { isAdminGateError, requireAdminApi } from "@/lib/admin-api";

export async function GET() {
  const gate = await requireAdminApi();
  if (isAdminGateError(gate)) return gate.error;
  const { supabase } = gate;

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
    supabase.from("companion_app_members").select("user_id", { count: "exact", head: true }),
    supabase
      .from("companion_app_members")
      .select("user_id", { count: "exact", head: true })
      .gte("last_seen_at", dayAgo),
    supabase
      .from("companion_app_members")
      .select("user_id", { count: "exact", head: true })
      .gte("last_seen_at", weekAgo),
    supabase
      .from("companion_support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("companion_subscriptions")
      .select("user_id", { count: "exact", head: true })
      .eq("plan_id", "graduate")
      .eq("status", "active"),
    supabase
      .from("companion_subscriptions")
      .select("user_id", { count: "exact", head: true })
      .eq("plan_id", "campus")
      .eq("status", "active"),
    supabase
      .from("companion_activity_log")
      .select("id, user_id, action, label, category, points_delta, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase.from("companion_activity_log").select("created_at").gte("created_at", weekAgo),
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
