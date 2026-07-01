import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { requireAuthUser, getAuthUser, getCompanionProfile } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const authUser = await getAuthUser();

  const [profile, { count: openTaskCount }, { count: focusCount }] = await Promise.all([
    getCompanionProfile(user.id),
    supabase
      .from("companion_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "done"),
    supabase
      .from("companion_focus_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
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
      openTasks={openTaskCount ?? 0}
      focusSessions={focusCount ?? 0}
    />
  );
}
