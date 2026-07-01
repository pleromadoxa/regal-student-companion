import type { CVEntryType } from "@/types/cv-courses";

export type CVEntryTheme = {
  iconGradient: string;
  accentGradient: string;
  glowColor: string;
  badge: string;
  dot: string;
  line: string;
};

export const CV_ENTRY_THEMES: Record<CVEntryType, CVEntryTheme> = {
  education: {
    iconGradient: "from-violet-500 to-purple-600",
    accentGradient: "from-violet-500/70 via-purple-500/30 to-transparent",
    glowColor: "bg-violet-500/25",
    badge: "bg-violet-500/15 text-violet-200 border-violet-400/25",
    dot: "bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.6)]",
    line: "from-violet-500/50",
  },
  internship: {
    iconGradient: "from-emerald-400 to-teal-600",
    accentGradient: "from-emerald-400/70 via-teal-500/30 to-transparent",
    glowColor: "bg-emerald-500/25",
    badge: "bg-emerald-500/15 text-emerald-200 border-emerald-400/25",
    dot: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]",
    line: "from-emerald-500/50",
  },
  job: {
    iconGradient: "from-blue-500 to-indigo-600",
    accentGradient: "from-blue-500/70 via-indigo-500/30 to-transparent",
    glowColor: "bg-blue-500/25",
    badge: "bg-blue-500/15 text-blue-200 border-blue-400/25",
    dot: "bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.6)]",
    line: "from-blue-500/50",
  },
  school_activity: {
    iconGradient: "from-fuchsia-500 to-purple-600",
    accentGradient: "from-fuchsia-500/70 via-purple-500/30 to-transparent",
    glowColor: "bg-fuchsia-500/25",
    badge: "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/25",
    dot: "bg-fuchsia-400 shadow-[0_0_12px_rgba(232,121,249,0.6)]",
    line: "from-fuchsia-500/50",
  },
  achievement: {
    iconGradient: "from-amber-400 to-orange-500",
    accentGradient: "from-amber-400/70 via-orange-500/30 to-transparent",
    glowColor: "bg-amber-500/25",
    badge: "bg-amber-500/15 text-amber-200 border-amber-400/25",
    dot: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]",
    line: "from-amber-500/50",
  },
  hobby: {
    iconGradient: "from-pink-400 to-rose-500",
    accentGradient: "from-pink-400/70 via-rose-500/30 to-transparent",
    glowColor: "bg-pink-500/25",
    badge: "bg-pink-500/15 text-pink-200 border-pink-400/25",
    dot: "bg-pink-400 shadow-[0_0_12px_rgba(244,114,182,0.6)]",
    line: "from-pink-500/50",
  },
  skill: {
    iconGradient: "from-cyan-400 to-sky-600",
    accentGradient: "from-cyan-400/70 via-sky-500/30 to-transparent",
    glowColor: "bg-cyan-500/25",
    badge: "bg-cyan-500/15 text-cyan-200 border-cyan-400/25",
    dot: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]",
    line: "from-cyan-500/50",
  },
  attachment: {
    iconGradient: "from-slate-400 to-indigo-600",
    accentGradient: "from-slate-400/70 via-indigo-500/30 to-transparent",
    glowColor: "bg-indigo-500/20",
    badge: "bg-indigo-500/15 text-indigo-200 border-indigo-400/25",
    dot: "bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.6)]",
    line: "from-indigo-500/50",
  },
  certification: {
    iconGradient: "from-green-400 to-emerald-600",
    accentGradient: "from-green-400/70 via-emerald-500/30 to-transparent",
    glowColor: "bg-green-500/25",
    badge: "bg-green-500/15 text-green-200 border-green-400/25",
    dot: "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.6)]",
    line: "from-green-500/50",
  },
  project: {
    iconGradient: "from-orange-400 to-red-500",
    accentGradient: "from-orange-400/70 via-red-500/30 to-transparent",
    glowColor: "bg-orange-500/25",
    badge: "bg-orange-500/15 text-orange-200 border-orange-400/25",
    dot: "bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.6)]",
    line: "from-orange-500/50",
  },
};

export function formatEntryDates(entry: {
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
}) {
  const start = entry.start_date?.trim();
  const end = entry.is_current ? "Present" : entry.end_date?.trim();
  if (start && end) return `${start} – ${end}`;
  return start || end || null;
}
