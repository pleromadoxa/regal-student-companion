import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { getCompanionProfile } from "@/lib/supabase/auth-server";
import { getDashboardStats } from "@/lib/dashboard-data";
import { PageSkeleton } from "@/components/ui/Skeleton";

const AchievementVaultClient = dynamic(
  () =>
    import("@/components/achievements/AchievementVaultClient").then(
      (m) => m.AchievementVaultClient
    ),
  { loading: () => <PageSkeleton /> }
);

export const metadata: Metadata = {
  title: "Achievement Vault",
  description: "Unlock badges for your academic milestones.",
};

export default async function AchievementsPage() {
  const user = await requireAuthUser();
  const [profile, stats] = await Promise.all([
    getCompanionProfile(user.id),
    getDashboardStats(user.id),
  ]);

  return (
    <AchievementVaultClient
      userId={user.id}
      engagementPoints={profile?.engagement_points ?? 0}
      focusMinutes={profile?.focus_minutes ?? 0}
      streak={profile?.study_streak ?? 0}
      focusSessions={stats.focusCount}
      openTasks={stats.pendingTasks.length}
    />
  );
}
