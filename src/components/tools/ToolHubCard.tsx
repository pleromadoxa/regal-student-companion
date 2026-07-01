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
          compact ? "rounded-xl p-[1px] hover:scale-[1.01]" : "rounded-2xl p-[1px] hover:scale-[1.02]",
          "hover:shadow-lg hover:shadow-black/20"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-70 group-hover:opacity-100 transition-opacity duration-300",
            compact ? "rounded-xl" : "rounded-2xl",
            theme.accentGradient
          )}
        />

        <div
          className={cn(
            "relative h-full bg-[#0a0612]/95 backdrop-blur-sm overflow-hidden",
            compact ? "rounded-[calc(0.75rem-1px)]" : "rounded-[calc(1rem-1px)]"
          )}
        >
          <div
            className={cn(
              "absolute rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity",
              compact ? "-top-6 -right-6 w-20 h-20" : "-top-8 -right-8 w-28 h-28",
              theme.glowColor
            )}
          />
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 bg-gradient-to-r opacity-80 group-hover:opacity-100 transition-opacity",
              compact ? "h-0.5" : "h-1",
              theme.iconGradient
            )}
          />

          <div
            className={cn(
              "relative flex flex-col h-full",
              compact ? "p-3 min-h-0" : "p-5 min-h-[148px]"
            )}
          >
            <div className={cn("flex items-start justify-between gap-2", compact ? "mb-2" : "mb-4")}>
              <div
                className={cn(
                  "rounded-lg flex items-center justify-center shadow-md bg-gradient-to-br shrink-0",
                  "group-hover:scale-105 transition-transform duration-300",
                  compact ? "w-8 h-8" : "w-11 h-11 rounded-xl shadow-lg",
                  theme.iconGradient
                )}
              >
                <Icon className={cn("text-white drop-shadow-sm", compact ? "w-3.5 h-3.5" : "w-5 h-5")} />
              </div>
              {regalAI ? (
                <RegalAIBadge className={cn("shrink-0 origin-top-right", compact ? "scale-[0.72]" : "scale-90")} />
              ) : (
                !compact && (
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-3.5 h-3.5 text-white/50" />
                  </div>
                )
              )}
            </div>

            <h3
              className={cn(
                "font-semibold text-white leading-snug transition-colors",
                compact ? "text-xs pr-1" : "text-sm pr-2",
                theme.hoverText
              )}
            >
              {name}
            </h3>
            <p
              className={cn(
                "text-white/45 leading-relaxed line-clamp-2 flex-1",
                compact ? "text-[10px] mt-1" : "text-xs mt-1.5"
              )}
            >
              {description}
            </p>

            {!compact && (
              <div className="flex items-center gap-1 mt-3 text-[11px] font-medium text-white/30 group-hover:text-white/70 transition-colors">
                <span>Open tool</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
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
    <div className="rounded-2xl bg-white/5 border border-white/8 h-[148px] shimmer" />
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
          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border bg-gradient-to-r",
          chipClass
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
        {label}
      </span>
      <span className="text-xs text-white/30">{count} tools</span>
      <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
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
      <div className="p-3 rounded-2xl regal-ai-gradient shadow-lg shadow-regal-purple-500/25 shrink-0">
        <Sparkles className="w-6 h-6 text-white" />
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Student Tools
        </h1>
        <p className="text-muted text-sm sm:text-base max-w-2xl leading-relaxed mt-1">
          {toolCount} tools to study smarter — {regalCount} powered by Regal AI. Each tool has its
          own colour-coded workspace.
        </p>
      </div>
    </div>
  );
}
