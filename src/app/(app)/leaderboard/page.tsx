import type { Metadata } from "next";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardClient } from "@/components/leaderboard/LeaderboardClient";
import type { CompanionProfile } from "@/types";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Top students by engagement, streak, and focus time.",
};

export default async function LeaderboardPage() {
  const user = await requireAuthUser();
  const supabase = await createClient();

  const [{ data: leaders }, { data: myProfileRow }] = await Promise.all([
    supabase
      .from("companion_leaderboard_public")
      .select("id, display_name, avatar_url, engagement_points, focus_minutes, study_streak")
      .order("engagement_points", { ascending: false })
      .limit(50),
    supabase
      .from("companion_profiles")
      .select("id, display_name, avatar_url, engagement_points, focus_minutes, study_streak, email")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  let profiles = (leaders ?? []) as CompanionProfile[];

  if (profiles.length === 0) {
    const fallback = await supabase
      .from("companion_profiles")
      .select("id, display_name, avatar_url, engagement_points, focus_minutes, study_streak")
      .not("display_name", "is", null)
      .order("engagement_points", { ascending: false })
      .limit(50);
    profiles = (fallback.data ?? []) as CompanionProfile[];
  }

  const myProfile = (myProfileRow ?? profiles.find((p) => p.id === user.id)) as
    | CompanionProfile
    | undefined;

  let myRank = profiles.findIndex((p) => p.id === user.id) + 1;
  if (myRank === 0 && myProfile) {
    const { count } = await supabase
      .from("companion_profiles")
      .select("id", { count: "exact", head: true })
      .gt("engagement_points", myProfile.engagement_points ?? 0);
    myRank = (count ?? 0) + 1;
  }

  return (
    <LeaderboardClient
      leaders={profiles}
      myProfile={myProfile ?? null}
      myRank={myRank}
      userId={user.id}
    />
  );
}
