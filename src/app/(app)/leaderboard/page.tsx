import { Trophy, Flame, Timer, Star } from "lucide-react";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import type { CompanionProfile } from "@/types";

export default async function LeaderboardPage() {
  const user = await requireAuthUser();
  const supabase = await createClient();

  let { data: leaders } = await supabase
    .from("companion_leaderboard_public")
    .select(
      "id, display_name, avatar_url, engagement_points, focus_minutes, study_streak"
    )
    .order("engagement_points", { ascending: false })
    .limit(20);

  if (!leaders) {
    const fallback = await supabase
      .from("companion_profiles")
      .select(
        "id, display_name, avatar_url, engagement_points, focus_minutes, study_streak"
      )
      .order("engagement_points", { ascending: false })
      .limit(20);
    leaders = fallback.data;
  }

  const profiles = (leaders ?? []) as CompanionProfile[];
  const myRank = profiles.findIndex((p) => p.id === user.id) + 1 || null;
  const myProfile = profiles.find((p) => p.id === user.id);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
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
          <div className="px-6 pb-6 flex items-center gap-4">
            <ProfileAvatar
              userId={myProfile.id}
              name={myProfile.display_name ?? myProfile.email}
              avatarUrl={myProfile.avatar_url}
              size={48}
            />
            <div>
              <p className="font-semibold text-white">
                #{myRank ?? "—"} {myProfile.display_name ?? "You"}
              </p>
              <p className="text-sm text-muted">
                {myProfile.engagement_points} pts · {myProfile.focus_minutes}{" "}
                focus min
                {(myProfile.study_streak ?? 0) > 0 && (
                  <span className="ml-2 text-orange-300">
                    <Flame className="w-3.5 h-3.5 inline" />{" "}
                    {myProfile.study_streak} day streak
                  </span>
                )}
              </p>
            </div>
          </div>
        </Card>
      )}

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
            <div className="flex items-center gap-4 p-4">
              <span className="w-8 text-center text-lg font-bold text-muted">
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
                <p className="text-xs text-muted flex items-center gap-3 mt-0.5">
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
    </div>
  );
}
