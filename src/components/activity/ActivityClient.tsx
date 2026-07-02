"use client";

import { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  Sparkles,
  CheckSquare,
  Timer,
  Brain,
  Trophy,
  Cloud,
  MessageSquare,
  Swords,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ACTIVITY_LABELS, type ActivityLogEntry } from "@/lib/activity-log";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  platform: Activity,
  productivity: CheckSquare,
  learning: Brain,
  ai: Sparkles,
  social: MessageSquare,
  exam: Swords,
  billing: Trophy,
};

export function ActivityClient({
  entries,
  memberStats,
}: {
  entries: ActivityLogEntry[];
  memberStats: {
    activityCount: number;
    sessionCount: number;
    firstSeen: string | null;
    lastSeen: string | null;
  } | null;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityLogEntry[]>();
    for (const e of entries) {
      const day = e.created_at.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [entries]);

  return (
    <div className="page-enter max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Activity Log"
        description="Your Regal Student Companion activity on Quantum Regal — separate from other Regal apps like Regal Mail."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted">Total actions</p>
          <p className="text-2xl font-bold text-white mt-1">{memberStats?.activityCount ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted">Sessions</p>
          <p className="text-2xl font-bold text-white mt-1">{memberStats?.sessionCount ?? 0}</p>
        </Card>
        <Card className="p-4 text-center col-span-2 sm:col-span-2">
          <p className="text-[10px] uppercase tracking-wider text-muted">Last active</p>
          <p className="text-sm font-semibold text-white mt-2">
            {memberStats?.lastSeen
              ? formatDistanceToNow(new Date(memberStats.lastSeen), { addSuffix: true })
              : "—"}
          </p>
        </Card>
      </div>

      {entries.length === 0 ? (
        <Card className="py-16 text-center">
          <Activity className="w-10 h-10 text-muted mx-auto mb-3 opacity-50" />
          <p className="text-white font-medium">No activity yet</p>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
            Complete tasks, use Regal AI, or run focus sessions — your activity on this platform will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                {format(new Date(day), "EEEE, MMM d, yyyy")}
              </p>
              <ul className="space-y-2">
                {items.map((entry) => {
                  const Icon = CATEGORY_ICONS[entry.category] ?? Activity;
                  return (
                    <li key={entry.id}>
                      <Card className="p-3 sm:p-4 flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-regal-purple-500/15 shrink-0">
                          <Icon className="w-4 h-4 text-regal-purple-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white">
                            {entry.label || ACTIVITY_LABELS[entry.action] || entry.action}
                          </p>
                          <p className="text-xs text-muted mt-0.5">
                            {format(new Date(entry.created_at), "h:mm a")}
                            {entry.path && ` · ${entry.path}`}
                          </p>
                        </div>
                        {entry.points_delta > 0 && (
                          <span className="text-xs font-semibold text-emerald-300 shrink-0">
                            +{entry.points_delta} pts
                          </span>
                        )}
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Card className="p-4 border-white/5">
        <p className="text-xs text-muted leading-relaxed">
          Leaderboard rankings only include students with verified activity on Regal Student Companion — not all Regal Mail accounts.
        </p>
      </Card>
    </div>
  );
}
