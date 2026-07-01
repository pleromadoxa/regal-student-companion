import { getCompanionProfile } from "@/lib/supabase/auth-server";
import { getDashboardStats } from "@/lib/dashboard-data";
import { DashboardFocusSection } from "@/components/dashboard/DashboardFocusSection";

export async function DashboardFocusLoader({ userId }: { userId: string }) {
  const [profile, stats] = await Promise.all([
    getCompanionProfile(userId),
    getDashboardStats(userId),
  ]);

  return (
    <DashboardFocusSection
      initialCompleted={stats.focusCount}
      initialFocusMinutes={profile?.focus_minutes ?? 0}
    />
  );
}
