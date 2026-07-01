"use client";

import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  FileUser,
  GraduationCap,
  HelpCircle,
  MessagesSquare,
  ShieldCheck,
  Sigma,
  Sparkles,
  PenLine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DASHBOARD_REGAL_TOOLS } from "@/lib/dashboard-regal-tools";
import { getToolTheme } from "@/lib/tool-themes";
import { ToolHubCard } from "@/components/tools/ToolHubCard";

const ICONS: Record<string, LucideIcon> = {
  Sigma,
  GraduationCap,
  Brain,
  CalendarDays,
  ShieldCheck,
  HelpCircle,
  FileUser,
  MessagesSquare,
  PenLine,
};

export function DashboardRegalTools() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg regal-ai-gradient shadow-md shadow-regal-purple-500/20">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Regal AI Tools</h2>
            <p className="text-[10px] text-muted mt-0.5">Smart tools powered by Regal AI</p>
          </div>
        </div>
        <Link
          href="/tools"
          className="text-xs font-medium text-regal-pink hover:text-regal-pink/80 transition-colors flex items-center gap-1"
          prefetch
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {DASHBOARD_REGAL_TOOLS.map((tool) => {
          const Icon = ICONS[tool.icon] ?? Sparkles;
          return (
            <ToolHubCard
              key={tool.href}
              href={tool.href}
              name={tool.name}
              description={tool.description}
              icon={Icon}
              theme={getToolTheme(tool.slug)}
              regalAI={tool.regalAI}
              compact
            />
          );
        })}
      </div>
    </section>
  );
}
