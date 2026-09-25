export type ToolTheme = {
  iconGradient: string;
  accentGradient: string;
  hoverText: string;
  glowColor: string;
};

/** Unique multi-colour theme per tool slug — shared by dashboard & tools hub. */
export const TOOL_THEMES: Record<string, ToolTheme> = {
  flashcards: {
    iconGradient: "from-violet-500 to-purple-600",
    accentGradient: "from-violet-500/60 via-purple-500/25 to-transparent",
    hoverText: "group-hover:text-violet-300",
    glowColor: "bg-violet-500/15",
  },
  "grade-calculator": {
    iconGradient: "from-blue-500 to-indigo-600",
    accentGradient: "from-blue-500/60 via-indigo-500/25 to-transparent",
    hoverText: "group-hover:text-blue-300",
    glowColor: "bg-blue-500/15",
  },
  "exam-countdown": {
    iconGradient: "from-orange-500 to-red-500",
    accentGradient: "from-orange-500/60 via-red-500/25 to-transparent",
    hoverText: "group-hover:text-orange-300",
    glowColor: "bg-orange-500/15",
  },
  "study-planner": {
    iconGradient: "from-sky-400 to-blue-600",
    accentGradient: "from-sky-400/60 via-blue-500/25 to-transparent",
    hoverText: "group-hover:text-sky-300",
    glowColor: "bg-sky-500/15",
  },
  "essay-planner": {
    iconGradient: "from-regal-purple-500 to-indigo-600",
    accentGradient: "from-regal-purple-500/60 via-indigo-500/25 to-transparent",
    hoverText: "group-hover:text-indigo-300",
    glowColor: "bg-indigo-500/15",
  },
  notes: {
    iconGradient: "from-amber-400 to-yellow-600",
    accentGradient: "from-amber-400/60 via-yellow-500/25 to-transparent",
    hoverText: "group-hover:text-amber-300",
    glowColor: "bg-amber-500/15",
  },
  bibliography: {
    iconGradient: "from-indigo-500 to-violet-600",
    accentGradient: "from-indigo-500/60 via-violet-500/25 to-transparent",
    hoverText: "group-hover:text-indigo-300",
    glowColor: "bg-indigo-500/15",
  },
  plagiarism: {
    iconGradient: "from-rose-400 to-orange-500",
    accentGradient: "from-rose-400/60 via-orange-500/25 to-transparent",
    hoverText: "group-hover:text-rose-300",
    glowColor: "bg-rose-500/15",
  },
  "math-solver": {
    iconGradient: "from-violet-500 to-indigo-600",
    accentGradient: "from-violet-500/60 via-indigo-500/25 to-transparent",
    hoverText: "group-hover:text-violet-300",
    glowColor: "bg-violet-500/15",
  },
  "language-tutor": {
    iconGradient: "from-cyan-400 to-teal-600",
    accentGradient: "from-cyan-400/60 via-teal-500/25 to-transparent",
    hoverText: "group-hover:text-cyan-300",
    glowColor: "bg-cyan-500/15",
  },
  resume: {
    iconGradient: "from-slate-400 to-blue-600",
    accentGradient: "from-slate-400/60 via-blue-600/25 to-transparent",
    hoverText: "group-hover:text-slate-300",
    glowColor: "bg-slate-500/15",
  },
  scholarships: {
    iconGradient: "from-yellow-400 to-amber-600",
    accentGradient: "from-yellow-400/60 via-amber-500/25 to-transparent",
    hoverText: "group-hover:text-yellow-300",
    glowColor: "bg-yellow-500/15",
  },
  streaks: {
    iconGradient: "from-orange-400 to-red-500",
    accentGradient: "from-orange-400/60 via-red-500/25 to-transparent",
    hoverText: "group-hover:text-orange-300",
    glowColor: "bg-orange-500/15",
  },
  schedule: {
    iconGradient: "from-teal-400 to-emerald-600",
    accentGradient: "from-teal-400/60 via-emerald-500/25 to-transparent",
    hoverText: "group-hover:text-teal-300",
    glowColor: "bg-teal-500/15",
  },
  "reading-list": {
    iconGradient: "from-emerald-400 to-green-600",
    accentGradient: "from-emerald-400/60 via-green-500/25 to-transparent",
    hoverText: "group-hover:text-emerald-300",
    glowColor: "bg-emerald-500/15",
  },
  "mind-map": {
    iconGradient: "from-fuchsia-500 to-purple-700",
    accentGradient: "from-fuchsia-500/60 via-purple-600/25 to-transparent",
    hoverText: "group-hover:text-fuchsia-300",
    glowColor: "bg-fuchsia-500/15",
  },
  quiz: {
    iconGradient: "from-amber-400 to-orange-500",
    accentGradient: "from-amber-400/60 via-orange-500/25 to-transparent",
    hoverText: "group-hover:text-amber-300",
    glowColor: "bg-amber-500/15",
  },
  wellness: {
    iconGradient: "from-pink-400 to-rose-500",
    accentGradient: "from-pink-400/60 via-rose-500/25 to-transparent",
    hoverText: "group-hover:text-pink-300",
    glowColor: "bg-pink-500/15",
  },
  budget: {
    iconGradient: "from-green-400 to-emerald-600",
    accentGradient: "from-green-400/60 via-emerald-500/25 to-transparent",
    hoverText: "group-hover:text-green-300",
    glowColor: "bg-green-500/15",
  },
  "study-match": {
    iconGradient: "from-blue-400 to-cyan-600",
    accentGradient: "from-blue-400/60 via-cyan-500/25 to-transparent",
    hoverText: "group-hover:text-blue-300",
    glowColor: "bg-blue-500/15",
  },
  tutor: {
    iconGradient: "from-regal-purple-500 to-regal-pink-muted",
    accentGradient: "from-regal-purple-500/60 via-regal-pink-muted/25 to-transparent",
    hoverText: "group-hover:text-regal-purple-300",
    glowColor: "bg-regal-purple-500/15",
  },
  "my-courses": {
    iconGradient: "from-emerald-400 to-teal-600",
    accentGradient: "from-emerald-400/60 via-teal-500/25 to-transparent",
    hoverText: "group-hover:text-emerald-300",
    glowColor: "bg-emerald-500/15",
  },
  "continuous-cv": {
    iconGradient: "from-cyan-400 to-blue-500",
    accentGradient: "from-cyan-400/60 via-blue-500/25 to-transparent",
    hoverText: "group-hover:text-cyan-300",
    glowColor: "bg-cyan-500/15",
  },
  research: {
    iconGradient: "from-fuchsia-500 to-purple-700",
    accentGradient: "from-fuchsia-500/60 via-purple-600/25 to-transparent",
    hoverText: "group-hover:text-fuchsia-300",
    glowColor: "bg-fuchsia-500/15",
  },
};

export const CATEGORY_THEMES: Record<
  string,
  { label: string; chip: string; dot: string }
> = {
  "regal-ai": {
    label: "Regal AI",
    chip: "from-regal-purple-500/15 to-regal-pink/[0.06] border-regal-purple-400/20 text-regal-purple-200",
    dot: "bg-regal-purple-400",
  },
  study: {
    label: "Study",
    chip: "from-emerald-500/10 to-teal-500/[0.06] border-emerald-400/20 text-emerald-200",
    dot: "bg-emerald-400",
  },
  planning: {
    label: "Planning",
    chip: "from-sky-500/10 to-blue-500/[0.06] border-sky-400/20 text-sky-200",
    dot: "bg-sky-400",
  },
  wellness: {
    label: "Wellness",
    chip: "from-pink-500/10 to-rose-500/[0.06] border-pink-400/20 text-pink-200",
    dot: "bg-pink-400",
  },
};

export function getToolTheme(slug: string): ToolTheme {
  return (
    TOOL_THEMES[slug] ?? {
      iconGradient: "from-regal-purple-500 to-regal-pink-muted",
      accentGradient: "from-regal-purple-500/60 via-regal-pink-muted/25 to-transparent",
      hoverText: "group-hover:text-regal-purple-300",
      glowColor: "bg-regal-purple-500/15",
    }
  );
}
