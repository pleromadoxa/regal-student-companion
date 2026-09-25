import { getCompanionProfile } from "@/lib/supabase/auth-server";
import { getDashboardStats, type DashboardStats } from "@/lib/dashboard-data";
import { DashboardFocusSection } from "@/components/dashboard/DashboardFocusSection";

export async function DashboardFocusLoader({ userId }: { userId: string }) {
  let profile: Awaited<ReturnType<typeof getCompanionProfile>> = null;
  let stats: DashboardStats = { pendingTasks: [], upcomingEvents: [], focusCount: 0 };

  try {
    [profile, stats] = await Promise.all([
      getCompanionProfile(userId),
      getDashboardStats(userId),
    ]);
  } catch (e) {
    console.error("[DashboardFocusLoader] data fetch failed:", e);
  }

  return (
    <DashboardFocusSection
      initialCompleted={stats.focusCount}
      initialFocusMinutes={profile?.focus_minutes ?? 0}
    />
  );
}
