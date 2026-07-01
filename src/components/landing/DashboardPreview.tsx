"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Cloud,
  Flame,
  Loader2,
  Sparkles,
  Swords,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { REGAL_CLOUD } from "@/lib/branding";

const AI_PHRASES = [
  "Summarizing lecture notes…",
  "Building flashcards from PDF…",
  "Drafting essay structure…",
  "Explaining calculus step-by-step…",
  "Generating exam battle plan…",
  "Research briefing ready soon…",
];

const FEED_EVENTS = [
  { text: "Task marked done · Research Methods", icon: CheckCircle2 },
  { text: "Focus session · 25 min logged", icon: Timer },
  { text: `${REGAL_CLOUD} backup synced`, icon: Cloud },
  { text: "Streak extended · 7 days", icon: Flame },
  { text: "Course material generated", icon: BookOpen },
];

type RowKind = "exam" | "essay" | "ai";

export function DashboardPreview() {
  const [essayProgress, setEssayProgress] = useState(72);
  const [examDays, setExamDays] = useState(5);
  const [aiIdx, setAiIdx] = useState(0);
  const [aiBusy, setAiBusy] = useState(true);
  const [focusMins, setFocusMins] = useState(18);
  const [streak, setStreak] = useState(6);
  const [feedIdx, setFeedIdx] = useState(0);
  const [feedVisible, setFeedVisible] = useState(true);
  const [activeRow, setActiveRow] = useState<RowKind>("ai");
  const [timeLabel, setTimeLabel] = useState("");

  useEffect(() => {
    const tick = () => {
      const h = new Date().getHours();
      setTimeLabel(
        h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
      );
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Essay progress creeps toward 100, then resets
  useEffect(() => {
    const id = setInterval(() => {
      setEssayProgress((p) => {
        if (p >= 100) return 68;
        return p + 1;
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  // AI phrase rotation + busy pulse
  useEffect(() => {
    const id = setInterval(() => {
      setAiBusy(true);
      setAiIdx((i) => (i + 1) % AI_PHRASES.length);
      setActiveRow("ai");
      window.setTimeout(() => setAiBusy(false), 1400);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  // Exam countdown (slow demo tick)
  useEffect(() => {
    const id = setInterval(() => {
      setExamDays((d) => (d <= 1 ? 5 : d - 1));
      setActiveRow("exam");
    }, 12_000);
    return () => clearInterval(id);
  }, []);

  // Focus minutes + streak micro-updates
  useEffect(() => {
    const id = setInterval(() => {
      setFocusMins((m) => (m >= 59 ? 12 : m + 1));
    }, 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setStreak((s) => (s >= 12 ? 6 : s + 1));
    }, 18_000);
    return () => clearInterval(id);
  }, []);

  // Toast-style feed events
  useEffect(() => {
    const id = setInterval(() => {
      setFeedVisible(false);
      window.setTimeout(() => {
        setFeedIdx((i) => (i + 1) % FEED_EVENTS.length);
        setFeedVisible(true);
      }, 320);
    }, 5200);
    return () => clearInterval(id);
  }, []);

  // Highlight essay row periodically
  useEffect(() => {
    const id = setInterval(() => setActiveRow("essay"), 7600);
    return () => clearInterval(id);
  }, []);

  const feed = FEED_EVENTS[feedIdx];
  const FeedIcon = feed.icon;

  return (
    <div className="relative rounded-3xl border border-white/10 overflow-hidden shadow-2xl shadow-regal-purple-500/20 edu-hero-float">
      <div className="absolute inset-0 bg-gradient-to-br from-regal-purple-900/50 via-[#0a0612] to-regal-pink/10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-40 h-40 bg-regal-purple-500/15 blur-3xl rounded-full pointer-events-none edu-pulse-slow" />

      <div className="relative aspect-[4/3] p-5 sm:p-6 flex flex-col justify-between min-h-[280px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider">{timeLabel}</p>
            <p className="text-sm font-semibold text-white mt-0.5">Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted">
              <span className="flex items-center gap-1 tabular-nums">
                <Flame className="w-3 h-3 text-amber-400" />
                {streak}d
              </span>
              <span className="flex items-center gap-1 tabular-nums">
                <Timer className="w-3 h-3 text-regal-pink" />
                {focusMins}m
              </span>
            </div>
            <span className="dash-live-badge text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
              <span className="dash-live-dot w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
        </div>

        {/* Activity rows */}
        <div className="space-y-2 my-3 flex-1 flex flex-col justify-center">
          {/* Exam War Room */}
          <div
            className={cn(
              "dash-activity-row p-3 rounded-xl border text-xs transition-all duration-500",
              activeRow === "exam"
                ? "bg-white/[0.08] border-regal-pink/30 shadow-lg shadow-regal-pink/10"
                : "bg-white/[0.04] border-white/8"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-rose-500/20 shrink-0">
                  <Swords className="w-3.5 h-3.5 text-rose-300" />
                </div>
                <span className="text-white/90 truncate font-medium">Exam War Room</span>
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold tabular-nums shrink-0 px-1.5 py-0.5 rounded-md",
                  examDays <= 2
                    ? "bg-red-500/20 text-red-300"
                    : examDays <= 5
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-white/5 text-muted"
                )}
              >
                {examDays} day{examDays === 1 ? "" : "s"} left
              </span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all duration-1000 ease-out"
                style={{ width: `${Math.max(8, 100 - examDays * 14)}%` }}
              />
            </div>
          </div>

          {/* Essay plan */}
          <div
            className={cn(
              "dash-activity-row p-3 rounded-xl border text-xs transition-all duration-500",
              activeRow === "essay"
                ? "bg-white/[0.08] border-regal-purple-400/35 shadow-lg shadow-regal-purple-500/10"
                : "bg-white/[0.04] border-white/8"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-regal-purple-500/20 shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-regal-purple-300" />
                </div>
                <span className="text-white/90 truncate font-medium">Essay plan</span>
              </div>
              <span className="text-[10px] font-bold text-regal-purple-300 tabular-nums shrink-0">
                {essayProgress}%
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full regal-ai-gradient transition-all duration-700 ease-out dash-progress-shimmer"
                style={{ width: `${essayProgress}%` }}
              />
            </div>
          </div>

          {/* Regal AI */}
          <div
            className={cn(
              "dash-activity-row p-3 rounded-xl border text-xs transition-all duration-500 relative overflow-hidden",
              activeRow === "ai"
                ? "bg-white/[0.08] border-regal-pink/30 shadow-lg shadow-regal-pink/10"
                : "bg-white/[0.04] border-white/8"
            )}
          >
            {activeRow === "ai" && (
              <div className="absolute inset-0 dash-ai-shimmer pointer-events-none" aria-hidden />
            )}
            <div className="relative flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg regal-ai-gradient shrink-0">
                {aiBusy ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-regal-pink font-semibold uppercase tracking-wider">
                  Regal AI
                </p>
                <p
                  className={cn(
                    "text-white/90 truncate transition-opacity duration-300",
                    aiBusy ? "opacity-70" : "opacity-100"
                  )}
                  key={aiIdx}
                >
                  {AI_PHRASES[aiIdx]}
                </p>
              </div>
              <div className="flex gap-0.5 shrink-0">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="w-1 h-1 rounded-full bg-regal-purple-400 edu-typing-dot"
                    style={{ animationDelay: `${d * 0.12}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feed toast */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-[10px] text-emerald-200 transition-all duration-300",
            feedVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
          )}
        >
          <FeedIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{feed.text}</span>
        </div>

        <p className="text-[10px] text-muted text-center mt-2">
          Preview · Sign in for full access
        </p>
      </div>
    </div>
  );
}
