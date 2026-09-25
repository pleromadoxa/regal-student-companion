import { requireAuthUser, getCompanionProfile } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
import { getUserSubscription, getAiUsageToday } from "@/lib/subscription";
import { ProfileClient } from "@/components/profile/ProfileClient";
import type { CompanionProfile } from "@/types";

export default async function ProfilePage() {
  const user = await requireAuthUser();
  const supabase = await createClient();

  const profile = await getCompanionProfile(user.id);
  if (!profile) {
    return (
      <p className="text-muted text-center py-12">
        Profile not found. Try refreshing the page.
      </p>
    );
  }

  const [
    { count: tasksCompleted },
    { count: focusSessions },
    { count: savedWords },
    { count: aheadCount },
  ] = await Promise.all([
    supabase
      .from("companion_tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "done"),
    supabase
      .from("companion_focus_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", true),
    supabase
      .from("companion_dictionary_bookmarks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("companion_profiles")
      .select("*", { count: "exact", head: true })
      .gt("engagement_points", profile.engagement_points),
  ]);

  const leaderboardRank =
    aheadCount != null ? aheadCount + 1 : null;

  const subscription = await getUserSubscription(supabase, user.id);
  const { planId, limits, row, regalPlanId, regalTierName, viaRegalOne, viaStudentPlan, expiresAt } =
    subscription;

  const aiUsage = await getAiUsageToday(supabase, user.id, subscription);
  const aiUsedToday = aiUsage.used;

  const monthStart = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}-01`;
  const voiceUsedMonth =
    row?.voice_sessions_reset_at === monthStart ? (row.voice_sessions_month ?? 0) : 0;

  return (
    <ProfileClient
      profile={profile as CompanionProfile}
      stats={{
        tasksCompleted: tasksCompleted ?? 0,
        focusSessions: focusSessions ?? 0,
        savedWords: savedWords ?? 0,
        leaderboardRank,
      }}
      subscription={{
        planId,
        limits,
        aiUsedToday,
        voiceUsedMonth,
        regalPlanId,
        regalTierName,
        viaRegalOne,
        viaStudentPlan,
        expiresAt,
      }}
    />
  );
}
