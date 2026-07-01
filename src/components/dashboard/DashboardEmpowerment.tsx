"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  FileUser,
  GraduationCap,
  Lightbulb,
  Loader2,
  PenLine,
  Sparkles,
  Timer,
  Wand2,
  Zap,
  Crown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { askRegalAI } from "@/lib/regal-ai";
import { sanitizeAIContent } from "@/lib/format-ai-content";
import type { EmpowerAction, EmpowermentBrief } from "@/lib/student-insights";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  CheckSquare,
  Calendar,
  Timer,
  PenLine,
  GraduationCap,
  FileUser,
  Sparkles,
  Crown,
};

const MOOD_STYLES = {
  focus: "from-emerald-500/20 via-transparent to-teal-500/10 border-emerald-400/20",
  study: "from-regal-purple-500/20 via-transparent to-regal-pink/10 border-regal-purple-400/25",
  plan: "from-rose-500/15 via-transparent to-orange-500/10 border-rose-400/20",
  celebrate: "from-amber-500/20 via-transparent to-orange-500/10 border-amber-400/25",
  explore: "from-sky-500/15 via-transparent to-indigo-500/10 border-sky-400/20",
};

export function DashboardEmpowerment({
  brief,
  boostContext,
}: {
  brief: EmpowermentBrief;
  boostContext: string;
}) {
  const [aiBoost, setAiBoost] = useState<string | null>(null);
  const [boostLoading, setBoostLoading] = useState(false);

  const fetchBoost = async () => {
    setBoostLoading(true);
    try {
      const { text: raw } = await askRegalAI({
        action: "student_boost",
        text: boostContext,
      });
      setAiBoost(sanitizeAIContent(raw));
    } catch {
      setAiBoost("You're capable of more than you think — pick one small win today and finish it.");
    } finally {
      setBoostLoading(false);
    }
  };

  return (
    <section className="relative">
      <div className="relative rounded-2xl p-[1px] overflow-hidden bg-gradient-to-br from-regal-purple-500/50 via-regal-pink/30 to-emerald-500/40">
        <div
          className={cn(
            "relative rounded-[calc(1rem-1px)] bg-[#08040f]/95 backdrop-blur-sm overflow-hidden border bg-gradient-to-br",
            MOOD_STYLES[brief.mood]
          )}
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-regal-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded-xl regal-ai-gradient shadow-lg shadow-regal-purple-500/25 shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-regal-pink/80 mb-1">
                    Your pulse · live
                  </p>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                    {brief.headline}
                  </h2>
                  <p className="text-sm text-white/55 mt-1.5 max-w-xl leading-relaxed">
                    {brief.subline}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchBoost}
                disabled={boostLoading}
                className={cn(
                  "shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium",
                  "bg-white/8 border border-white/12 hover:bg-white/12 hover:border-regal-purple-400/30",
                  "transition-all disabled:opacity-60"
                )}
              >
                {boostLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-regal-purple-300" />
                ) : (
                  <Wand2 className="w-4 h-4 text-regal-pink" />
                )}
                AI boost
              </button>
            </div>

            {aiBoost && (
              <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-regal-purple-500/15 to-regal-pink/10 border border-regal-purple-400/20">
                <div className="flex gap-2">
                  <Sparkles className="w-4 h-4 text-regal-pink shrink-0 mt-0.5" />
                  <p className="text-sm text-white/85 leading-relaxed">{aiBoost}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5 mb-5">
              {brief.actions.map((action) => (
                <PowerMoveCard key={action.id} action={action} />
              ))}
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <Lightbulb className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/70 mb-0.5">
                  Today&apos;s study insight
                </p>
                <p className="text-xs text-white/55 leading-relaxed">{brief.tip}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PowerMoveCard({ action }: { action: EmpowerAction }) {
  const Icon = ICONS[action.icon] ?? Sparkles;

  return (
    <Link
      href={action.href}
      prefetch
      className="group relative block rounded-xl p-[1px] overflow-hidden hover:scale-[1.02] transition-transform duration-200"
    >
      <div
        className={cn(
          "absolute inset-0 rounded-xl bg-gradient-to-br opacity-70 group-hover:opacity-100 transition-opacity",
          action.gradient
        )}
      />
      <div className="relative rounded-[calc(0.75rem-1px)] bg-[#0a0612]/90 p-3.5 overflow-hidden h-full">
        <div
          className={cn(
            "absolute -top-6 -right-6 w-16 h-16 rounded-full blur-xl opacity-60 group-hover:opacity-100",
            action.glow
          )}
        />
        <div className="relative flex items-start gap-2.5">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br",
              action.gradient
            )}
          >
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {action.label}
            </p>
            <p className="text-xs font-medium text-white mt-0.5 line-clamp-2 leading-snug group-hover:text-regal-purple-200 transition-colors">
              {action.description}
            </p>
          </div>
          <ArrowRight className="w-3 h-3 text-white/20 group-hover:text-white/60 shrink-0 mt-1 transition-colors" />
        </div>
      </div>
    </Link>
  );
}
