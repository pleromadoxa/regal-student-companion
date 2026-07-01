"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Flame,
  Trophy,
  CalendarCheck,
  Check,
  Loader2,
  Sparkles,
  Lock,
  Award,
} from "lucide-react";
import { format, subDays, parseISO, differenceInCalendarDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  ToolShell,
  ToolStat,
  ToolSection,
  ToolEmpty,
  useUserId,
} from "./shared";

const CHECKINS_KEY = "regal-streak-checkins";

const MILESTONES = [
  { days: 7, label: "Week Warrior", emoji: "🔥" },
  { days: 30, label: "Monthly Master", emoji: "⭐" },
  { days: 100, label: "Century Scholar", emoji: "👑" },
] as const;

const TIPS = [
  "Consistency beats intensity — 15 minutes daily adds up.",
  "Review yesterday's notes before starting new material.",
  "Teach a concept aloud to lock it in faster.",
  "Block distractions before you sit down to study.",
  "Celebrate small wins — they fuel longer streaks.",
  "Study at the same time each day to build habit loops.",
  "Break big topics into bite-sized sessions.",
  "Rest is part of the streak — sleep helps retention.",
];

function storageKey(uid: string) {
  return `${CHECKINS_KEY}:${uid}`;
}

function loadCheckins(uid: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(uid));
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return [...new Set(parsed)].sort();
  } catch {
    return [];
  }
}

function saveCheckins(uid: string, dates: string[]) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify([...new Set(dates)].sort()));
  } catch {
    /* quota */
  }
}

function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

function yesterdayISO() {
  return format(subDays(new Date(), 1), "yyyy-MM-dd");
}

function computeLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort();
  let max = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = differenceInCalendarDays(parseISO(sorted[i]), parseISO(sorted[i - 1]));
    if (gap === 1) {
      run++;
      max = Math.max(max, run);
    } else if (gap > 0) {
      run = 1;
    }
  }
  return max;
}

function last30Days(): { key: string; label: string; weekday: string }[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i);
    return {
      key: format(d, "yyyy-MM-dd"),
      label: format(d, "MMM d"),
      weekday: format(d, "EEE"),
    };
  });
}

export function StreaksTool() {
  const { uid, ready } = useUserId();
  const supabase = useMemo(() => createClient(), []);

  const [streak, setStreak] = useState(0);
  const [lastActive, setLastActive] = useState<string | null>(null);
  const [checkins, setCheckins] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  const today = todayISO();
  const checkedToday = lastActive === today || checkins.includes(today);
  const longestStreak = useMemo(() => computeLongestStreak(checkins), [checkins]);
  const totalCheckIns = checkins.length;
  const days = useMemo(() => last30Days(), []);
  const checkinSet = useMemo(() => new Set(checkins), [checkins]);

  useEffect(() => {
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!uid) {
      if (ready) setLoading(false);
      return;
    }

    const userId = uid;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("companion_profiles")
        .select("study_streak, last_active_date")
        .eq("id", userId)
        .single();

      if (cancelled) return;

      const local = loadCheckins(userId);
      const merged = new Set(local);
      if (data?.last_active_date) merged.add(data.last_active_date);
      const mergedArr = [...merged].sort();
      saveCheckins(userId, mergedArr);

      setStreak(data?.study_streak ?? 0);
      setLastActive(data?.last_active_date ?? null);
      setCheckins(mergedArr);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [uid, ready, supabase]);

  const checkIn = useCallback(async () => {
    if (!uid || checkedToday || checkingIn) return;
    setCheckingIn(true);
    try {
      const { data } = await supabase
        .from("companion_profiles")
        .select("study_streak, last_active_date")
        .eq("id", uid)
        .single();

      const last = data?.last_active_date;
      let next = data?.study_streak ?? 0;

      if (last !== today) {
        next = last === yesterdayISO() ? next + 1 : 1;
        await supabase
          .from("companion_profiles")
          .update({ study_streak: next, last_active_date: today })
          .eq("id", uid);
      }

      const updated = [...new Set([...checkins, today])].sort();
      saveCheckins(uid, updated);
      setStreak(next);
      setLastActive(today);
      setCheckins(updated);
    } finally {
      setCheckingIn(false);
    }
  }, [uid, checkedToday, checkingIn, supabase, today, checkins]);

  if (!ready || loading) {
    return (
      <Card className="py-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-regal-purple-300" />
      </Card>
    );
  }

  if (!uid) {
    return (
      <ToolEmpty
        icon={Flame}
        title="Sign in to track streaks"
        description="Your study streak syncs across devices when you're logged in."
      />
    );
  }

  return (
    <ToolShell
      stats={
        <>
          <ToolStat label="Current streak" value={streak} icon={Flame} accent="amber" />
          <ToolStat label="Longest streak" value={longestStreak} icon={Trophy} accent="purple" />
          <ToolStat
            label="Total check-ins"
            value={totalCheckIns}
            icon={CalendarCheck}
            accent="emerald"
          />
        </>
      }
      sidebar={
        <>
          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                  Daily tip
                </p>
                <p
                  key={tipIndex}
                  className="text-sm text-white/90 mt-2 leading-relaxed animate-[pageEnter_0.4s_ease-out_both]"
                >
                  {TIPS[tipIndex]}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
              Milestones
            </p>
            <div className="space-y-2">
              {MILESTONES.map((m) => {
                const unlocked = longestStreak >= m.days || streak >= m.days;
                return (
                  <div
                    key={m.days}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                      unlocked
                        ? "bg-amber-500/10 border-amber-400/30"
                        : "bg-white/[0.02] border-white/8 opacity-70"
                    )}
                  >
                    <span className="text-xl" aria-hidden>
                      {m.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">{m.label}</p>
                      <p className="text-[10px] text-muted">{m.days} day streak</p>
                    </div>
                    {unlocked ? (
                      <Award className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      }
    >
      <Card className="relative overflow-hidden border-orange-500/25 bg-gradient-to-br from-orange-500/10 via-transparent to-regal-purple-500/10 text-center py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 50% 80%, rgba(251,146,60,0.35) 0%, transparent 55%)",
          }}
        />
        <div className="relative">
          <div className="inline-flex items-center justify-center mb-4">
            <Flame
              className={cn(
                "w-20 h-20 text-orange-400 streak-flame",
                streak > 0 && "drop-shadow-[0_0_20px_rgba(251,146,60,0.6)]"
              )}
            />
          </div>
          <p className="text-7xl sm:text-8xl font-bold text-white tabular-nums tracking-tight">
            {streak}
          </p>
          <p className="text-muted mt-2 text-sm uppercase tracking-[0.2em] font-semibold">
            day streak
          </p>
          {streak >= 7 && (
            <p className="text-xs text-amber-300/90 mt-3 font-medium">
              You&apos;re on fire — keep the momentum going!
            </p>
          )}
        </div>
      </Card>

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={checkIn}
          disabled={checkedToday || checkingIn}
          className={cn(
            "min-w-[220px]",
            checkedToday && "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
          )}
        >
          {checkingIn ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : checkedToday ? (
            <>
              <Check className="w-4 h-4" /> Checked in today
            </>
          ) : (
            <>
              <Flame className="w-4 h-4" /> Check in today
            </>
          )}
        </Button>
      </div>

      <ToolSection
        title="Last 30 days"
        description="Your daily study check-ins — darker cells mean more consistency."
      >
        <Card className="p-4 sm:p-5">
          <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 sm:gap-2">
            {days.map((day) => {
              const active = checkinSet.has(day.key);
              const isToday = day.key === today;
              return (
                <div
                  key={day.key}
                  title={`${day.label}${active ? " — checked in" : ""}`}
                  className={cn(
                    "aspect-square rounded-md sm:rounded-lg border transition-all",
                    active
                      ? "bg-gradient-to-br from-orange-400 to-amber-600 border-orange-300/40 shadow-[0_0_12px_rgba(251,146,60,0.35)]"
                      : "bg-white/[0.03] border-white/8",
                    isToday && !active && "ring-1 ring-regal-purple-400/50",
                    isToday && active && "ring-2 ring-white/30"
                  )}
                >
                  <span className="sr-only">
                    {day.weekday} {day.label}
                    {active ? ", checked in" : ", no check-in"}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-3 text-[10px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-gradient-to-br from-orange-400 to-amber-600" />
                Checked in
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-white/[0.03] border border-white/8" />
                Missed
              </span>
            </div>
            <p className="text-[10px] text-muted tabular-nums">
              {days.filter((d) => checkinSet.has(d.key)).length} / 30 days active
            </p>
          </div>
        </Card>
      </ToolSection>
    </ToolShell>
  );
}
