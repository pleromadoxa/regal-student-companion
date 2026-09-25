import { getAuthUser, getCompanionProfile } from "@/lib/supabase/auth-server";
import { getDashboardStats, type DashboardStats } from "@/lib/dashboard-data";
import {
  buildBoostContext,
  buildEmpowermentBrief,
} from "@/lib/student-insights";
import { DashboardEmpowerment } from "@/components/dashboard/DashboardEmpowerment";

export async function DashboardEmpowermentLoader({ userId }: { userId: string }) {
  let profile: Awaited<ReturnType<typeof getCompanionProfile>> = null;
  let stats: DashboardStats = { pendingTasks: [], upcomingEvents: [], focusCount: 0 };
  let user: Awaited<ReturnType<typeof getAuthUser>> = null;

  try {
    [profile, stats, user] = await Promise.all([
      getCompanionProfile(userId),
      getDashboardStats(userId),
      getAuthUser(),
    ]);
  } catch (e) {
    console.error("[DashboardEmpowermentLoader] data fetch failed:", e);
  }

  const displayName =
    profile?.display_name ?? user?.email?.split("@")[0] ?? "Student";

  const brief = buildEmpowermentBrief({
    displayName,
    engagementPoints: profile?.engagement_points ?? 0,
    focusMinutes: profile?.focus_minutes ?? 0,
    streak: profile?.study_streak ?? 0,
    major: profile?.major ?? null,
    pendingTasks: stats.pendingTasks,
    upcomingEvents: stats.upcomingEvents,
  });

  const boostContext = buildBoostContext({
    displayName,
    engagementPoints: profile?.engagement_points ?? 0,
    focusMinutes: profile?.focus_minutes ?? 0,
    streak: profile?.study_streak ?? 0,
    major: profile?.major ?? null,
    pendingTaskCount: stats.pendingTasks.length,
    upcomingEventCount: stats.upcomingEvents.length,
  });

  return <DashboardEmpowerment brief={brief} boostContext={boostContext} />;
}
