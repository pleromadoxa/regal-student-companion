"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Trophy, Flame, Timer, Star, Medal, TrendingUp, Target } from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { cn } from "@/lib/utils";
import type { CompanionProfile } from "@/types";

export type LeaderboardSort = "engagement_points" | "study_streak" | "focus_minutes";

type LeaderEntry = Pick<
  CompanionProfile,
  "id" | "display_name" | "avatar_url" | "engagement_points" | "focus_minutes" | "study_streak"
>;

const SORT_OPTIONS: { id: LeaderboardSort; label: string; icon: typeof Trophy }[] = [
  { id: "engagement_points", label: "Points", icon: Trophy },
  { id: "study_streak", label: "Streak", icon: Flame },
  { id: "focus_minutes", label: "Focus", icon: Timer },
];

const medals = ["🥇", "🥈", "🥉"];

function sortLeaders(list: LeaderEntry[], sort: LeaderboardSort): LeaderEntry[] {
  return [...list].sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0));
}

function metricValue(p: LeaderEntry, sort: LeaderboardSort): number {
  return p[sort] ?? 0;
}

function metricLabel(sort: LeaderboardSort): string {
  if (sort === "study_streak") return "day streak";
  if (sort === "focus_minutes") return "focus min";
  return "pts";
}

export function LeaderboardClient({
  leaders,
  myProfile,
  myRank,
  userId,
}: {
  leaders: LeaderEntry[];
  myProfile: LeaderEntry | null;
  myRank: number;
  userId: string;
}) {
  const [sort, setSort] = useState<LeaderboardSort>("engagement_points");

  const ranked = useMemo(() => sortLeaders(leaders, sort), [leaders, sort]);

  const mySortedRank = useMemo(() => {
    if (!myProfile) return myRank;
    const idx = ranked.findIndex((p) => p.id === userId);
    return idx >= 0 ? idx + 1 : myRank;
  }, [ranked, myProfile, userId, myRank]);

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="page-enter space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Leaderboard"
        description="Compete with students across Regal Companion. Earn points from focus sessions, Regal AI, and completed tasks."
      />

      {myProfile && (
        <Card className="border-regal-purple-500/30 bg-gradient-to-br from-regal-purple-500/15 to-transparent">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-regal-pink" /> Your standing
            </CardTitle>
          </CardHeader>
          <div className="px-4 sm:px-6 pb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <ProfileAvatar
              userId={myProfile.id}
              name={myProfile.display_name ?? "You"}
              avatarUrl={myProfile.avatar_url}
              size={56}
            />
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-white">
                #{mySortedRank > 0 ? mySortedRank : "—"}
              </p>
              <p className="font-semibold text-white/90 truncate">
                {myProfile.display_name ?? "You"}
              </p>
              <p className="text-sm text-muted mt-1">
                {myProfile.engagement_points ?? 0} pts · {myProfile.focus_minutes ?? 0} focus min
                {(myProfile.study_streak ?? 0) > 0 && ` · ${myProfile.study_streak} day streak`}
              </p>
            </div>
            <Link
              href="/tasks"
              className="text-xs text-regal-purple-300 hover:text-white flex items-center gap-1 shrink-0"
            >
              <Target className="w-3.5 h-3.5" /> Earn more points
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Your points" value={myProfile?.engagement_points ?? 0} icon={Trophy} accent="purple" />
        <StatCard label="Focus min" value={myProfile?.focus_minutes ?? 0} icon={Timer} accent="amber" />
        <StatCard label="Streak" value={myProfile?.study_streak ?? 0} icon={Flame} accent="pink" />
      </div>

      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSort(opt.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all",
              sort === opt.id
                ? "bg-regal-purple-500/25 border-regal-purple-400/40 text-white"
                : "border-white/10 text-muted hover:text-white hover:border-white/20"
            )}
          >
            <opt.icon className="w-4 h-4" />
            {opt.label}
          </button>
        ))}
      </div>

      {ranked.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="w-10 h-10 text-muted mx-auto mb-3 opacity-50" />
          <p className="text-white font-medium">No rankings yet</p>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
            Complete tasks, run focus sessions, and use Regal AI to climb the board.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Link href="/tasks" className="text-sm text-regal-purple-300 hover:text-white">
              Tasks →
            </Link>
            <Link href="/focus" className="text-sm text-regal-purple-300 hover:text-white">
              Focus →
            </Link>
            <Link href="/regal-mentor" className="text-sm text-regal-purple-300 hover:text-white">
              Regal Mentor →
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {podium.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4">
              {[1, 0, 2].map((idx) => {
                const p = podium[idx];
                if (!p) return <div key={idx} />;
                const heights = ["h-28 sm:h-36", "h-36 sm:h-44", "h-24 sm:h-32"];
                return (
                  <div key={p.id} className="flex flex-col items-center">
                    <ProfileAvatar
                      userId={p.id}
                      name={p.display_name ?? "Student"}
                      avatarUrl={p.avatar_url}
                      size={idx === 0 ? 56 : 48}
                      fallbackClassName="bg-white/10"
                    />
                    <p className="text-lg mt-2">{medals[idx]}</p>
                    <p className="text-xs sm:text-sm font-semibold text-white truncate max-w-full px-1 text-center">
                      {p.display_name ?? "Student"}
                      {p.id === userId && (
                        <span className="text-regal-pink text-[10px] block">(you)</span>
                      )}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted mb-2">
                      {metricValue(p, sort)} {metricLabel(sort)}
                    </p>
                    <div
                      className={cn(
                        "w-full rounded-t-2xl border border-white/10 flex items-end justify-center pb-3",
                        heights[idx],
                        p.id === userId ? "bg-regal-purple-500/20 border-regal-purple-400/30" : "bg-white/5"
                      )}
                    >
                      <Medal className="w-5 h-5 text-muted/50" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            {(podium.length >= 3 ? rest : ranked).map((p, i) => {
              const rank = podium.length >= 3 ? i + 4 : i + 1;
              return (
                <Card
                  key={p.id}
                  className={cn(
                    p.id === userId && "border-regal-purple-400/40 bg-regal-purple-500/5"
                  )}
                >
                  <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                    <span className="w-7 sm:w-8 text-center text-base sm:text-lg font-bold text-muted shrink-0">
                      {rank <= 3 && podium.length < 3 ? medals[rank - 1] : rank}
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
                        {p.id === userId && (
                          <span className="text-regal-pink text-xs ml-2">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {metricValue(p, sort)} {metricLabel(sort)}
                        </span>
                        {sort !== "focus_minutes" && (
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" /> {p.focus_minutes ?? 0} min
                          </span>
                        )}
                        {sort !== "study_streak" && (p.study_streak ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-orange-300">
                            <Flame className="w-3 h-3" /> {p.study_streak}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Card className="p-4 border-white/5">
        <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">How to earn points</p>
        <ul className="text-xs text-muted space-y-1.5">
          <li>· Complete a focus session — <strong className="text-white/80">+10 pts</strong></li>
          <li>· Use Regal AI tools — <strong className="text-white/80">+5 pts</strong> per request</li>
          <li>· Mark a task done — <strong className="text-white/80">+3 pts</strong></li>
        </ul>
      </Card>
    </div>
  );
}
