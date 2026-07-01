"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

export function ToolStat({
  label,
  value,
  icon: Icon,
  accent = "purple",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "purple" | "pink" | "emerald" | "amber";
}) {
  const colors = {
    purple: "text-regal-purple-300 bg-regal-purple-500/15",
    pink: "text-regal-pink bg-regal-pink/15",
    emerald: "text-emerald-300 bg-emerald-500/15",
    amber: "text-amber-300 bg-amber-500/15",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-white tabular-nums mt-1 truncate">
            {value}
          </p>
        </div>
        <div className={cn("p-2 rounded-xl shrink-0", colors[accent])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
}

export function ToolSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {description && (
            <p className="text-xs text-muted mt-0.5 max-w-xl">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ToolEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="py-14 text-center border-dashed border-white/10">
      <Icon className="w-10 h-10 text-muted mx-auto mb-3 opacity-60" />
      <p className="font-medium text-white">{title}</p>
      <p className="text-sm text-muted mt-1 max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export function ToolShell({
  stats,
  sidebar,
  children,
}: {
  stats?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!sidebar) {
    return (
      <div className="space-y-6">
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{stats}</div>
        )}
        {children}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{stats}</div>
      )}
      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="space-y-6 min-w-0">{children}</div>
        <aside className="lg:sticky lg:top-6 space-y-4">{sidebar}</aside>
      </div>
    </div>
  );
}

export function ToolResult({
  title,
  children,
  actions,
}: {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Card className="border-regal-purple-400/20">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 mb-4">
          {title && <h3 className="text-sm font-bold text-white">{title}</h3>}
          {actions}
        </div>
      )}
      <div className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap font-sans">
        {children}
      </div>
    </Card>
  );
}
