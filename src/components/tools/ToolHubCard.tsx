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
          "glass-panel glass-panel-hover relative flex h-full flex-col overflow-hidden transition-all duration-200",
          compact ? "rounded-lg p-3" : "rounded-lg p-5 min-h-[140px]"
        )}
      >
        <div className={cn("flex items-start justify-between gap-2", compact ? "mb-2" : "mb-3")}>
          <div
            className={cn(
              "flex shrink-0 items-center justify-center bg-gradient-to-br shadow-md group-hover:scale-105 transition-transform duration-200",
              compact ? "h-8 w-8 rounded-lg" : "h-10 w-10 rounded-xl",
              theme.iconGradient
            )}
          >
            <Icon className={cn("text-white drop-shadow-sm", compact ? "w-3.5 h-3.5" : "w-5 h-5")} />
          </div>
          {regalAI ? (
            <RegalAIBadge className={cn("shrink-0 origin-top-right", compact ? "scale-[0.7]" : "scale-90")} />
          ) : (
            !compact && (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] opacity-0 transition-opacity duration-200 sm:group-hover:opacity-100">
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
            "text-white/45 leading-relaxed line-clamp-2 flex-1",
            compact ? "text-[10px] mt-1" : "text-[11px] mt-1.5"
          )}
        >
          {description}
        </p>

        {!compact && (
          <div className="mt-3 flex items-center gap-1 text-[10px] font-medium text-white/30 transition-colors duration-150 group-hover:text-primary">
            <span>Open tool</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-150" />
          </div>
        )}
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
}: {
  label: string;
  count: number;
  chipClass?: string;
  dotClass?: string;
}) {
  return (
    <div className="mb-4 mt-2 flex items-center gap-3 first:mt-0">
      <span className="ws-section-title">{label}</span>
      <span className="text-[11px] text-muted/70 tabular-nums">{count} tools</span>
      <div className="h-px flex-1 bg-white/[0.06]" />
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
    <div className="mb-8 flex items-start gap-4">
      <div className="shrink-0 rounded-lg bg-primary/12 p-2.5">
        <Sparkles className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Student Tools
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted sm:text-[15px]">
          {toolCount} tools to study smarter — {regalCount} powered by Regal AI. Each tool has its
          own colour-coded workspace.
        </p>
      </div>
    </div>
  );
}
