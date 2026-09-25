"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import type { ToolTheme } from "@/lib/tool-themes";
import { cn } from "@/lib/utils";

export function ToolHubCard({
  href,
  name,
  description,
  icon: Icon,
  theme,
  regalAI,
  compact,
}: {
  href: string;
  name: string;
  description: string;
  icon: LucideIcon;
  theme: ToolTheme;
  regalAI?: boolean;
  compact?: boolean;
}) {
  return (
    <Link href={href} prefetch className="group block h-full">
      <div
        className={cn(
          "relative h-full overflow-hidden transition-all duration-300",
          compact ? "rounded-xl p-[1px] hover:scale-[1.01]" : "rounded-2xl p-[1px] hover:scale-[1.015]",
          "hover:shadow-md hover:shadow-black/15"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-55 group-hover:opacity-100 transition-opacity duration-300",
            compact ? "rounded-xl" : "rounded-2xl",
            theme.accentGradient
          )}
        />

        <div
          className={cn(
            "relative h-full bg-[#08070f]/95 backdrop-blur-sm overflow-hidden",
            compact ? "rounded-[calc(0.75rem-1px)]" : "rounded-[calc(1rem-1px)]"
          )}
        >
          <div
            className={cn(
              "absolute rounded-full blur-2xl opacity-40 group-hover:opacity-80 transition-opacity duration-300",
              compact ? "-top-6 -right-6 w-18 h-18" : "-top-8 -right-8 w-24 h-24",
              theme.glowColor
            )}
          />
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity duration-300",
              compact ? "h-[1px]" : "h-[2px]",
              theme.iconGradient
            )}
          />

          <div
            className={cn(
              "relative flex flex-col h-full",
              compact ? "p-3 min-h-0" : "p-5 min-h-[140px]"
            )}
          >
            <div className={cn("flex items-start justify-between gap-2", compact ? "mb-2" : "mb-3")}>
              <div
                className={cn(
                  "rounded-lg flex items-center justify-center shadow-md bg-gradient-to-br shrink-0",
                  "group-hover:scale-105 transition-transform duration-200",
                  compact ? "w-8 h-8" : "w-10 h-10 rounded-xl shadow-lg",
                  theme.iconGradient
                )}
              >
                <Icon className={cn("text-white drop-shadow-sm", compact ? "w-3.5 h-3.5" : "w-5 h-5")} />
              </div>
              {regalAI ? (
                <RegalAIBadge className={cn("shrink-0 origin-top-right", compact ? "scale-[0.7]" : "scale-90")} />
              ) : (
                !compact && (
                  <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                    <ArrowRight className="w-3 h-3 text-white/40" />
                  </div>
                )
              )}
            </div>

            <h3
              className={cn(
                "font-semibold text-white leading-snug transition-colors duration-150",
                compact ? "text-xs pr-1" : "text-[13px] pr-2",
                theme.hoverText
              )}
            >
              {name}
            </h3>
            <p
              className={cn(
                "text-white/35 leading-relaxed line-clamp-2 flex-1",
                compact ? "text-[10px] mt-1" : "text-[11px] mt-1.5"
              )}
            >
              {description}
            </p>

            {!compact && (
              <div className="flex items-center gap-1 mt-3 text-[10px] font-medium text-white/20 group-hover:text-white/60 transition-colors duration-150">
                <span>Open tool</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-150" />
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ToolHubCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] h-[140px] shimmer" />
  );
}

export function ToolsHubSectionHeader({
  label,
  count,
  chipClass,
  dotClass,
}: {
  label: string;
  count: number;
  chipClass: string;
  dotClass: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-2 first:mt-0">
      <span
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] border bg-gradient-to-r",
          chipClass
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
        {label}
      </span>
      <span className="text-[11px] text-white/25">{count} tools</span>
      <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
    </div>
  );
}

export function ToolsHubPageIntro({
  toolCount,
  regalCount,
}: {
  toolCount: number;
  regalCount: number;
}) {
  return (
    <div className="flex items-start gap-4 mb-8">
      <div className="p-3 rounded-2xl regal-ai-gradient shadow-lg shadow-regal-purple-500/20 shrink-0">
        <Sparkles className="w-6 h-6 text-white" />
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Student Tools
        </h1>
        <p className="text-muted text-sm sm:text-[15px] max-w-2xl leading-relaxed mt-1">
          {toolCount} tools to study smarter — {regalCount} powered by Regal AI. Each tool has its
          own colour-coded workspace.
        </p>
      </div>
    </div>
  );
}
