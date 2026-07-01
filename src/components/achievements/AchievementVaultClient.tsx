"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Lock,
  Crown,
  Sparkles,
  Timer,
  Flame,
  PenLine,
  GraduationCap,
  FileUser,
  Swords,
  CheckSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  evaluateAchievements,
  loadLocalAchievementStats,
} from "@/lib/flagship-features";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Timer,
  Flame,
  Sparkles,
  Crown,
  FileUser,
  GraduationCap,
  PenLine,
  Swords,
  CheckSquare,
};

const TIER_RING = {
  bronze: "ring-amber-700/40",
  silver: "ring-slate-400/40",
  gold: "ring-yellow-400/50",
  regal: "ring-regal-purple-400/60",
};

export function AchievementVaultClient({
  userId,
  engagementPoints,
  focusMinutes,
  streak,
  focusSessions,
  openTasks,
}: {
  userId: string;
  engagementPoints: number;
  focusMinutes: number;
  streak: number;
  focusSessions: number;
  openTasks: number;
}) {
  const [local, setLocal] = useState(loadLocalAchievementStats(userId));

  useEffect(() => {
    setLocal(loadLocalAchievementStats(userId));
  }, [userId]);

  const evaluated = useMemo(
    () =>
      evaluateAchievements({
        engagementPoints,
        focusMinutes,
        streak,
        focusSessions,
        openTasks,
        local,
      }),
    [engagementPoints, focusMinutes, streak, focusSessions, openTasks, local]
  );

  const unlocked = evaluated.filter((a) => a.unlocked).length;
  const pct = Math.round((unlocked / evaluated.length) * 100);

  return (
    <div className="page-enter max-w-4xl mx-auto">
      <PageHeader
        title="Achievement Vault"
        description="Your growth made visible — unlock badges as you master focus, tools, and academic milestones."
      />

      <Card className="mb-6 relative overflow-hidden border-amber-400/25">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-regal-purple-500/10 to-regal-pink/5 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white tabular-nums">
                {unlocked}
                <span className="text-lg text-white/40 font-normal"> / {evaluated.length}</span>
              </p>
              <p className="text-sm text-muted">Achievements unlocked · {pct}% complete</p>
            </div>
          </div>
          <div className="w-full sm:w-48 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-regal-purple-500 to-regal-pink transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {evaluated.map((a) => {
          const Icon = ICONS[a.icon] ?? Trophy;
          return (
            <div
              key={a.id}
              className={cn(
                "relative rounded-2xl p-[1px] overflow-hidden transition-all",
                a.unlocked ? "opacity-100" : "opacity-55"
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-70",
                  a.unlocked ? a.gradient : "from-white/10 to-white/5"
                )}
              />
              <div
                className={cn(
                  "relative rounded-[calc(1rem-1px)] bg-[#0a0612]/95 p-4 ring-2",
                  a.unlocked ? TIER_RING[a.tier] : "ring-white/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br",
                      a.unlocked ? a.gradient : "from-white/10 to-white/5"
                    )}
                  >
                    {a.unlocked ? (
                      <Icon className="w-5 h-5 text-white" />
                    ) : (
                      <Lock className="w-4 h-4 text-white/30" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{a.tier}</p>
                    <p className="font-semibold text-white text-sm mt-0.5">{a.name}</p>
                    <p className="text-[11px] text-white/45 mt-1 leading-relaxed">{a.description}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted mt-8">
        Keep using{" "}
        <Link href="/regal-mentor" className="text-regal-pink hover:underline">
          Regal Mentor
        </Link>
        ,{" "}
        <Link href="/exam-prep" className="text-regal-pink hover:underline">
          Exam War Room
        </Link>
        , and daily focus to unlock more.
      </p>
    </div>
  );
}
