import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { getAuthUser, getCompanionProfile } from "@/lib/supabase/auth-server";
import { getDashboardStats } from "@/lib/dashboard-data";
import { PageSkeleton } from "@/components/ui/Skeleton";

const RegalMentorClient = dynamic(
  () => import("@/components/regal-mentor/RegalMentorClient").then((m) => m.RegalMentorClient),
  { loading: () => <PageSkeleton /> }
);

export const metadata: Metadata = {
  title: "Regal Mentor",
  description: "Your context-aware AI academic coach.",
};

export default async function RegalMentorPage() {
  const user = await requireAuthUser();
  const [profile, stats, authUser] = await Promise.all([
    getCompanionProfile(user.id),
    getDashboardStats(user.id),
    getAuthUser(),
  ]);

  const displayName =
    profile?.display_name ?? authUser?.email?.split("@")[0] ?? "Student";

  return (
    <RegalMentorClient
      userId={user.id}
      displayName={displayName}
      major={profile?.major ?? null}
      engagementPoints={profile?.engagement_points ?? 0}
      focusMinutes={profile?.focus_minutes ?? 0}
      streak={profile?.study_streak ?? 0}
      openTasks={stats.pendingTasks.length}
      focusSessions={stats.focusCount}
    />
  );
}
