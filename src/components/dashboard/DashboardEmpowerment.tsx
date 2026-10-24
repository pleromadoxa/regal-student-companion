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
import { ResultActions } from "@/components/ui/ResultActions";
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
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-gradient-to-br",
          "bg-[var(--regal-surface)]",
          MOOD_STYLES[brief.mood]
        )}
      >
        <div className="relative p-5 sm:p-6">
          <div className="mb-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="shrink-0 rounded-lg bg-primary/12 p-2.5">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary/85">
                  Your pulse · live
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                  {brief.headline}
                </h2>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/55">
                  {brief.subline}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchBoost}
              disabled={boostLoading}
              className="regal-btn-secondary flex shrink-0 items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {boostLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <Wand2 className="w-4 h-4 text-primary" />
              )}
              AI boost
            </button>
          </div>

          {aiBoost && (
            <div className="mb-5 rounded-lg border border-white/[0.07] bg-white/[0.04] p-4">
              <div className="flex gap-2">
                <Sparkles className="mt-0.5 w-4 h-4 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed text-white/85">{aiBoost}</p>
              </div>
              <ResultActions value={aiBoost} filename="daily-boost.md" className="mt-3" />
            </div>
          )}

          <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
            {brief.actions.map((action) => (
              <PowerMoveCard key={action.id} action={action} />
            ))}
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3.5">
            <Lightbulb className="mt-0.5 w-4 h-4 shrink-0 text-amber-300" />
            <div>
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200/70">
                Today&apos;s study insight
              </p>
              <p className="text-xs leading-relaxed text-white/55">{brief.tip}</p>
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
      className="glass-panel glass-panel-hover group block rounded-lg p-3.5 transition-all duration-200"
    >
      <div className="flex h-full items-start gap-2.5">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br",
            action.gradient
          )}
        >
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {action.label}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-white transition-colors group-hover:text-primary">
            {action.description}
          </p>
        </div>
        <ArrowRight className="mt-1 w-3 h-3 shrink-0 text-white/20 transition-colors group-hover:text-primary" />
      </div>
    </Link>
  );
}
