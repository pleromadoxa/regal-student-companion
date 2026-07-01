"use client";

import type { LucideIcon } from "lucide-react";
import {
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  FolderKanban,
  GraduationCap,
  Heart,
  MapPin,
  Paperclip,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Users,
  Clock,
} from "lucide-react";
import type { CVEntry, CVEntryType } from "@/types/cv-courses";
import { CV_ENTRY_LABELS } from "@/types/cv-courses";
import {
  CV_ENTRY_THEMES,
  formatEntryDates,
} from "@/lib/cv-entry-themes";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const ENTRY_ICONS: Record<CVEntryType, LucideIcon> = {
  education: GraduationCap,
  internship: Building2,
  job: Briefcase,
  school_activity: Users,
  achievement: Award,
  hobby: Heart,
  skill: Sparkles,
  attachment: Paperclip,
  certification: BadgeCheck,
  project: FolderKanban,
};

const ENTRY_TYPES = Object.keys(CV_ENTRY_LABELS) as CVEntryType[];

function sortTimelineEntries(entries: CVEntry[]): CVEntry[] {
  return [...entries].sort((a, b) => {
    if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    const aDate = a.start_date ?? a.created_at ?? "";
    const bDate = b.start_date ?? b.created_at ?? "";
    return bDate.localeCompare(aDate);
  });
}

export function CVTimeline({
  entries,
  onAdd,
  onEdit,
  onRemove,
}: {
  entries: CVEntry[];
  onAdd: (type: CVEntryType) => void;
  onEdit: (entry: CVEntry) => void;
  onRemove: (id: string) => void;
}) {
  const sorted = sortTimelineEntries(entries);
  const currentCount = entries.filter((e) => e.is_current).length;

  return (
    <div className="space-y-8">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill label="Total entries" value={entries.length} accent="from-regal-purple-500/20 to-regal-pink/10 border-regal-purple-400/20" />
        <StatPill label="Active now" value={currentCount} accent="from-emerald-500/20 to-teal-500/10 border-emerald-400/20" />
        <StatPill
          label="Categories"
          value={new Set(entries.map((e) => e.entry_type)).size}
          accent="from-sky-500/20 to-blue-500/10 border-sky-400/20"
        />
        <StatPill
          label="Latest"
          value={sorted[0]?.start_date?.split(" ")[0] ?? "—"}
          accent="from-amber-500/20 to-orange-500/10 border-amber-400/20"
          small
        />
      </div>

      {/* Add entry palette */}
      <div className="relative rounded-2xl p-[1px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-regal-purple-500/60 via-regal-pink/30 to-emerald-500/40 opacity-80" />
        <div className="relative rounded-[calc(1rem-1px)] bg-[#0a0612]/95 backdrop-blur-sm p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl regal-ai-gradient shadow-lg shadow-regal-purple-500/20">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Add to your timeline</h2>
              <p className="text-xs text-white/40 mt-0.5">
                Every milestone you add builds your living CV
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ENTRY_TYPES.map((type) => {
              const Icon = ENTRY_ICONS[type];
              const theme = CV_ENTRY_THEMES[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onAdd(type)}
                  className={cn(
                    "group/btn flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium",
                    "border transition-all duration-200 hover:scale-[1.03]",
                    theme.badge
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0",
                      theme.iconGradient
                    )}
                  >
                    <Icon className="w-3 h-3 text-white" />
                  </span>
                  {CV_ENTRY_LABELS[type]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {sorted.length === 0 ? (
        <EmptyTimeline onAdd={() => onAdd("internship")} />
      ) : (
        <div className="relative pl-2 sm:pl-4">
          {/* Vertical spine */}
          <div
            className="absolute left-[1.15rem] sm:left-[1.65rem] top-4 bottom-4 w-px bg-gradient-to-b from-regal-purple-500/50 via-regal-pink/30 to-emerald-500/20"
            aria-hidden
          />

          <div className="space-y-0">
            {sorted.map((entry, index) => (
              <TimelineNode
                key={entry.id}
                entry={entry}
                isFirst={index === 0}
                isLast={index === sorted.length - 1}
                onEdit={() => onEdit(entry)}
                onRemove={() => onRemove(entry.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string | number;
  accent: string;
  small?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br px-4 py-3",
        accent
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <p
        className={cn(
          "font-bold text-white mt-1 tabular-nums truncate",
          small ? "text-sm" : "text-2xl"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function TimelineNode({
  entry,
  isFirst,
  isLast,
  onEdit,
  onRemove,
}: {
  entry: CVEntry;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const Icon = ENTRY_ICONS[entry.entry_type];
  const theme = CV_ENTRY_THEMES[entry.entry_type];
  const dates = formatEntryDates(entry);

  return (
    <div className={cn("relative flex gap-4 sm:gap-6 pb-8", isLast && "pb-0")}>
      {/* Node dot on spine */}
      <div className="relative z-10 shrink-0 flex flex-col items-center pt-1">
        <div
          className={cn(
            "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center",
            "bg-gradient-to-br ring-4 ring-[#0a0612]",
            theme.iconGradient,
            isFirst && "animate-pulse ring-regal-purple-500/20"
          )}
        >
          <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white drop-shadow-sm" />
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-0.5 flex-1 min-h-[2rem] mt-2 bg-gradient-to-b to-transparent opacity-60",
              theme.line
            )}
          />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0 pt-0.5 group">
        <div
          className={cn(
            "relative rounded-2xl p-[1px] overflow-hidden transition-all duration-300",
            "hover:scale-[1.01] hover:shadow-lg hover:shadow-black/25"
          )}
        >
          <div
            className={cn(
              "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-60 group-hover:opacity-100 transition-opacity",
              theme.accentGradient
            )}
          />

          <div className="relative rounded-[calc(1rem-1px)] bg-[#0a0612]/95 backdrop-blur-sm overflow-hidden">
            <div
              className={cn(
                "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity",
                theme.glowColor
              )}
            />
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-70",
                theme.iconGradient
              )}
            />

            <div className="relative p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                      theme.badge
                    )}
                  >
                    {CV_ENTRY_LABELS[entry.entry_type]}
                  </span>
                  {entry.is_current && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Current
                    </span>
                  )}
                </div>

                {dates && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50 bg-white/5 px-2.5 py-1 rounded-lg border border-white/8">
                    <Calendar className="w-3 h-3 text-white/40" />
                    {dates}
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-semibold text-white leading-snug pr-16">
                {entry.title}
              </h3>

              {(entry.organization || entry.location) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-white/50">
                  {entry.organization && (
                    <span className="font-medium text-white/70">{entry.organization}</span>
                  )}
                  {entry.location && (
                    <span className="inline-flex items-center gap-1 text-white/40">
                      <MapPin className="w-3 h-3" />
                      {entry.location}
                    </span>
                  )}
                </div>
              )}

              {entry.extra?.level && (
                <p className="text-xs text-cyan-300/80 mt-2">
                  Proficiency: {entry.extra.level}
                </p>
              )}

              {entry.extra?.url && (
                <p className="text-xs text-indigo-300/80 mt-1 truncate">{entry.extra.url}</p>
              )}

              {entry.description && (
                <p className="text-sm text-white/55 mt-3 leading-relaxed line-clamp-3 border-l-2 border-white/10 pl-3">
                  {entry.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-1 mt-4 pt-3 border-t border-white/[0.06] opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white hover:bg-white/8 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyTimeline({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="relative rounded-2xl p-[1px] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-regal-purple-500/40 via-transparent to-regal-pink/30" />
      <div className="relative rounded-[calc(1rem-1px)] bg-[#0a0612]/90 py-16 px-6 text-center">
        <div className="relative mx-auto w-16 h-16 mb-5">
          <div className="absolute inset-0 rounded-full bg-regal-purple-500/20 blur-xl" />
          <div className="relative w-full h-full rounded-2xl regal-ai-gradient flex items-center justify-center shadow-lg shadow-regal-purple-500/30">
            <Clock className="w-7 h-7 text-white" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-white">Your timeline is empty</h3>
        <p className="text-sm text-muted mt-2 max-w-sm mx-auto leading-relaxed">
          Start building your story — add internships, achievements, skills, and school activities.
          Each entry appears here chronologically.
        </p>
        <Button className="mt-6" onClick={onAdd}>
          <Plus className="w-4 h-4" /> Add your first milestone
        </Button>
      </div>
    </div>
  );
}
