import { getAuthUser, getCompanionProfile } from "@/lib/supabase/auth-server";
import { getDashboardStats } from "@/lib/dashboard-data";
import {
  buildBoostContext,
  buildEmpowermentBrief,
} from "@/lib/student-insights";
import { DashboardEmpowerment } from "@/components/dashboard/DashboardEmpowerment";

export async function DashboardEmpowermentLoader({ userId }: { userId: string }) {
  const [profile, stats, user] = await Promise.all([
    getCompanionProfile(userId),
    getDashboardStats(userId),
    getAuthUser(),
  ]);

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
