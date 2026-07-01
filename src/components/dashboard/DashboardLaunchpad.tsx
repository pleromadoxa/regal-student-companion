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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-400 via-regal-purple-500 to-regal-pink shadow-lg shadow-regal-purple-500/30">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Regal Elite Features
            </h2>
            <p className="text-[10px] text-muted">World-class tools no other platform combines</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {FLAGSHIP_FEATURES.map((f) => {
          const Icon = ICONS[f.icon] ?? Sparkles;
          return (
            <Link
              key={f.slug}
              href={f.href}
              prefetch
              className="group relative block rounded-2xl p-[1px] overflow-hidden hover:scale-[1.01] transition-all duration-300"
            >
              <div
                className={cn(
                  "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-75 group-hover:opacity-100 transition-opacity",
                  f.accent
                )}
              />
              <div className="relative rounded-[calc(1rem-1px)] bg-[#0a0612]/95 backdrop-blur-sm overflow-hidden h-full">
                <div
                  className={cn(
                    "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity",
                    f.glow
                  )}
                />
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-80",
                    f.gradient
                  )}
                />
                <div className="relative p-4 flex flex-col h-full min-h-[130px]">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg group-hover:scale-105 transition-transform",
                        f.gradient
                      )}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {f.badge && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
                        {f.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-regal-pink/80">
                    {f.tagline}
                  </p>
                  <h3 className="text-sm font-bold text-white mt-0.5 group-hover:text-regal-purple-200 transition-colors">
                    {f.name}
                  </h3>
                  <p className="text-[11px] text-white/45 mt-1.5 leading-relaxed line-clamp-2 flex-1">
                    {f.description}
                  </p>
                  <span className="flex items-center gap-1 mt-2 text-[10px] font-medium text-white/30 group-hover:text-white/70 transition-colors">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
