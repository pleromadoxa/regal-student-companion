"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Brain,
  GraduationCap,
  Sparkles,
  Mic,
  FileText,
  Sigma,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { REGAL_AI, REGAL_CLOUD } from "@/lib/branding";

const PHRASES = [
  "Summarizing lecture notes…",
  "Building your exam battle plan…",
  "Generating flashcards from PDF…",
  "Explaining calculus step-by-step…",
  "Drafting essay structure…",
  "Research briefing ready…",
];

const ORBIT_ICONS = [
  { Icon: BookOpen, color: "text-regal-purple-300", delay: "0s" },
  { Icon: Brain, color: "text-regal-pink", delay: "0.5s" },
  { Icon: GraduationCap, color: "text-emerald-300", delay: "1s" },
  { Icon: Sigma, color: "text-amber-300", delay: "1.5s" },
  { Icon: FileText, color: "text-sky-300", delay: "2s" },
  { Icon: Mic, color: "text-fuchsia-300", delay: "2.5s" },
];

export function EducationAiScene() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhraseIdx((i) => (i + 1) % PHRASES.length);
        setVisible(true);
      }, 350);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-full min-h-[280px] sm:min-h-[360px] lg:min-h-[420px] flex flex-col items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-regal-purple-900/40 via-[#0a0612] to-regal-purple-950/60 p-5 sm:p-8">
      {/* Grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.15] edu-grid-bg"
        aria-hidden
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full bg-regal-purple-500/20 blur-3xl edu-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full bg-regal-pink/15 blur-3xl edu-pulse-slow edu-delay-2" />

      {/* Central AI core */}
      <div className="relative z-10 mb-10">
        <div className="edu-orbit-ring absolute inset-0 w-44 h-44 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border border-regal-purple-400/20" />
        <div className="edu-orbit-ring-reverse absolute inset-0 w-56 h-56 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border border-regal-pink/15" />
        <div className="relative w-28 h-28 mx-auto rounded-2xl regal-ai-gradient flex items-center justify-center shadow-2xl shadow-regal-purple-500/40 edu-float">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        {ORBIT_ICONS.map(({ Icon, color, delay }, i) => (
          <div
            key={i}
            className="edu-orbit-icon absolute left-1/2 top-1/2 -ml-4 -mt-4"
            style={{ animationDelay: delay, ["--orbit-i" as string]: i }}
          >
            <div className="w-9 h-9 rounded-xl glass-panel flex items-center justify-center shadow-lg">
              <Icon className={cn("w-4 h-4", color)} />
            </div>
          </div>
        ))}
      </div>

      {/* Typing phrase */}
      <div className="relative z-10 text-center max-w-xs">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-regal-pink mb-2">
          Regal AI · Live
        </p>
        <p
          className={cn(
            "text-lg font-medium text-white transition-all duration-300 min-h-[3.5rem] flex items-center justify-center",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          {PHRASES[phraseIdx]}
        </p>
        <div className="flex justify-center gap-1 mt-4">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className="w-1.5 h-1.5 rounded-full bg-regal-purple-400 edu-typing-dot"
              style={{ animationDelay: `${d * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div className="relative z-10 mt-10 grid grid-cols-3 gap-3 w-full max-w-sm">
        {[
          { label: "Tools", value: "21+" },
          { label: "AI", value: REGAL_AI },
          { label: "Sync", value: REGAL_CLOUD },
        ].map((s) => (
          <div
            key={s.label}
            className="text-center py-2 px-2 rounded-xl bg-white/[0.04] border border-white/8"
          >
            <p className="text-sm font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
