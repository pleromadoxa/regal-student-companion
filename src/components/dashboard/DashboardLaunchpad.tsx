"use client";

import Link from "next/link";
import {
  ArrowRight,
  Crown,
  FileUser,
  GraduationCap,
  PenLine,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FLAGSHIP_FEATURES } from "@/lib/flagship-features";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Crown,
  Swords,
  Trophy,
  PenLine,
  GraduationCap,
  FileUser,
};

export function DashboardLaunchpad() {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="ws-section-title">Regal Elite Features</h2>
        <span className="text-xs font-semibold text-primary">Flagship</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {FLAGSHIP_FEATURES.map((f) => {
          const Icon = ICONS[f.icon] ?? Sparkles;
          return (
            <Link
              key={f.slug}
              href={f.href}
              prefetch
              className="glass-panel glass-panel-hover group block rounded-lg p-4 transition-all duration-200"
            >
              <div className="flex h-full min-h-[124px] flex-col">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm transition-transform duration-200 group-hover:scale-105",
                      f.gradient
                    )}
                  >
                    <Icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  {f.badge && (
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white/60">
                      {f.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted/80">
                  {f.tagline}
                </p>
                <h3 className="mt-0.5 text-[13px] font-bold text-white">{f.name}</h3>
                <p className="mt-1.5 line-clamp-2 flex-1 text-[11px] leading-relaxed text-white/45">
                  {f.description}
                </p>
                <span className="mt-2 flex items-center gap-1 text-[10px] font-medium text-white/30 transition-colors duration-150 group-hover:text-primary">
                  Open <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
