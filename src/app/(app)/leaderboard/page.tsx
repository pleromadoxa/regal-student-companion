import { Trophy, Flame, Timer, Star } from "lucide-react";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import type { CompanionProfile } from "@/types";

export default async function LeaderboardPage() {
  const user = await requireAuthUser();
  const supabase = await createClient();

  const [{ data: leaders }, { data: myProfileRow }] = await Promise.all([
    supabase
      .from("companion_leaderboard_public")
      .select(
        "id, display_name, avatar_url, engagement_points, focus_minutes, study_streak"
      )
      .order("engagement_points", { ascending: false })
      .limit(20),
    supabase
      .from("companion_profiles")
      .select(
        "id, display_name, avatar_url, engagement_points, focus_minutes, study_streak, email"
      )
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  let profiles = (leaders ?? []) as CompanionProfile[];

  if (profiles.length === 0) {
    const fallback = await supabase
      .from("companion_profiles")
      .select(
        "id, display_name, avatar_url, engagement_points, focus_minutes, study_streak"
      )
      .order("engagement_points", { ascending: false })
      .limit(20);
    profiles = (fallback.data ?? []) as CompanionProfile[];
  }

  const myProfile = (myProfileRow ?? profiles.find((p) => p.id === user.id)) as
    | (CompanionProfile & { email?: string })
    | undefined;

  let myRank = profiles.findIndex((p) => p.id === user.id) + 1;
  if (myRank === 0 && myProfile) {
    const { count } = await supabase
      .from("companion_profiles")
      .select("id", { count: "exact", head: true })
      .gt("engagement_points", myProfile.engagement_points ?? 0);
    myRank = (count ?? 0) + 1;
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-muted text-sm mt-1">
          Top students by engagement points
        </p>
      </div>

      {myProfile && (
        <Card className="border-regal-purple-500/30 bg-regal-purple-500/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-regal-pink" /> Your rank
            </CardTitle>
          </CardHeader>
          <div className="px-4 sm:px-6 pb-6 flex items-center gap-4">
            <ProfileAvatar
              userId={myProfile.id}
              name={myProfile.display_name ?? myProfile.email ?? "You"}
              avatarUrl={myProfile.avatar_url}
              size={48}
            />
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">
                #{myRank > 0 ? myRank : "—"}{" "}
                {myProfile.display_name ?? "You"}
              </p>
              <p className="text-sm text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{myProfile.engagement_points ?? 0} pts</span>
                <span>{myProfile.focus_minutes ?? 0} focus min</span>
                {(myProfile.study_streak ?? 0) > 0 && (
                  <span className="text-orange-300 inline-flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" /> {myProfile.study_streak} day streak
                  </span>
                )}
              </p>
            </div>
          </div>
        </Card>
      )}

      {profiles.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="w-10 h-10 text-muted mx-auto mb-3 opacity-50" />
          <p className="text-white font-medium">No rankings yet</p>
          <p className="text-sm text-muted mt-1">
            Complete tasks, focus sessions, and daily check-ins to earn points.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {profiles.map((p, i) => (
            <Card
              key={p.id}
              className={
                p.id === user.id
                  ? "border-regal-purple-400/40 bg-regal-purple-500/5"
                  : ""
              }
            >
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                <span className="w-7 sm:w-8 text-center text-base sm:text-lg font-bold text-muted shrink-0">
                  {i < 3 ? medals[i] : i + 1}
                </span>
                <ProfileAvatar
                  userId={p.id}
                  name={p.display_name ?? "Student"}
                  avatarUrl={p.avatar_url}
                  size={40}
                  fallbackClassName="bg-white/10"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {p.display_name ?? "Student"}
                    {p.id === user.id && (
                      <span className="text-regal-pink text-xs ml-2">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> {p.engagement_points} pts
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer className="w-3 h-3" /> {p.focus_minutes} min
                    </span>
                    {(p.study_streak ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-orange-300">
                        <Flame className="w-3 h-3" /> {p.study_streak}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
