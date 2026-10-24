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
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="ws-section-title">Regal AI Tools</h2>
        <Link
          href="/tools"
          className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors duration-150 flex items-center gap-1"
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
