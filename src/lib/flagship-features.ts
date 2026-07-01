export type FlagshipFeature = {
  slug: string;
  href: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  gradient: string;
  accent: string;
  glow: string;
  badge?: string;
};

export const FLAGSHIP_FEATURES: FlagshipFeature[] = [
  {
    slug: "regal-mentor",
    href: "/regal-mentor",
    name: "Regal Mentor",
    tagline: "Your AI academic coach",
    description:
      "Context-aware guidance that knows your streak, tasks, and goals — not generic chatbot answers.",
    icon: "Crown",
    gradient: "from-amber-400 via-regal-purple-500 to-regal-pink",
    accent: "from-amber-500/70 via-regal-purple-500/50 to-regal-pink/30",
    glow: "bg-regal-purple-500/25",
    badge: "Signature",
  },
  {
    slug: "exam-prep",
    href: "/exam-prep",
    name: "Exam War Room",
    tagline: "AI battle plans for finals",
    description:
      "Drop your exam date and subjects — get a day-by-day cram strategy, weak-spot drills, and a last-24h playbook.",
    icon: "Swords",
    gradient: "from-rose-500 to-orange-600",
    accent: "from-rose-500/70 via-orange-500/40 to-transparent",
    glow: "bg-rose-500/25",
    badge: "Advanced",
  },
  {
    slug: "achievements",
    href: "/achievements",
    name: "Achievement Vault",
    tagline: "Unlock your progress",
    description:
      "Dynamic badges for focus, streaks, tools mastered, and milestones — your growth made visible.",
    icon: "Trophy",
    gradient: "from-yellow-400 to-amber-600",
    accent: "from-yellow-400/70 via-amber-500/40 to-transparent",
    glow: "bg-amber-500/25",
  },
  {
    slug: "essay-planner",
    href: "/tools/essay-planner",
    name: "Essay Planner",
    tagline: "Plan → Auto-generate",
    description:
      "Architect your essay structure first, then Regal AI writes the full draft from your approved plan.",
    icon: "PenLine",
    gradient: "from-indigo-500 to-violet-600",
    accent: "from-indigo-500/70 via-violet-500/40 to-transparent",
    glow: "bg-indigo-500/25",
    badge: "Regal AI",
  },
  {
    slug: "my-courses",
    href: "/my-courses",
    name: "My Courses",
    tagline: "AI course materials",
    description:
      "Add any subject — receive auto-generated lessons, glossaries, and study guides tailored to you.",
    icon: "GraduationCap",
    gradient: "from-emerald-400 to-teal-600",
    accent: "from-emerald-400/70 via-teal-500/40 to-transparent",
    glow: "bg-emerald-500/25",
    badge: "Regal AI",
  },
  {
    slug: "continuous-cv",
    href: "/continuous-cv",
    name: "Continuous CV",
    tagline: "Living résumé",
    description:
      "Track every win from high school to university — export a stunning PDF anytime.",
    icon: "FileUser",
    gradient: "from-cyan-400 to-blue-600",
    accent: "from-cyan-400/70 via-blue-500/40 to-transparent",
    glow: "bg-cyan-500/25",
  },
];

export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
  tier: "bronze" | "silver" | "gold" | "regal";
  check: (ctx: AchievementContext) => boolean;
};

export type AchievementContext = {
  engagementPoints: number;
  focusMinutes: number;
  streak: number;
  focusSessions: number;
  openTasks: number;
  local: {
    cvEntries: number;
    courses: number;
    essayPlans: number;
    mentorChats: number;
    warPlans: number;
  };
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-focus",
    name: "First Focus",
    description: "Complete your first focus session",
    icon: "Timer",
    gradient: "from-emerald-400 to-teal-600",
    tier: "bronze",
    check: (c) => c.focusSessions >= 1,
  },
  {
    id: "focus-10",
    name: "Deep Worker",
    description: "Complete 10 focus sessions",
    icon: "Timer",
    gradient: "from-emerald-500 to-green-700",
    tier: "silver",
    check: (c) => c.focusSessions >= 10,
  },
  {
    id: "focus-100min",
    name: "Century Club",
    description: "Log 100+ focus minutes",
    icon: "Flame",
    gradient: "from-orange-400 to-red-500",
    tier: "silver",
    check: (c) => c.focusMinutes >= 100,
  },
  {
    id: "streak-3",
    name: "Momentum",
    description: "3-day study streak",
    icon: "Flame",
    gradient: "from-orange-500 to-amber-600",
    tier: "bronze",
    check: (c) => c.streak >= 3,
  },
  {
    id: "streak-7",
    name: "Week Warrior",
    description: "7-day study streak",
    icon: "Flame",
    gradient: "from-amber-400 to-orange-600",
    tier: "gold",
    check: (c) => c.streak >= 7,
  },
  {
    id: "streak-30",
    name: "Unstoppable",
    description: "30-day study streak",
    icon: "Crown",
    gradient: "from-regal-purple-500 to-regal-pink",
    tier: "regal",
    check: (c) => c.streak >= 30,
  },
  {
    id: "pts-50",
    name: "Rising Scholar",
    description: "Earn 50 engagement points",
    icon: "Sparkles",
    gradient: "from-violet-500 to-purple-600",
    tier: "bronze",
    check: (c) => c.engagementPoints >= 50,
  },
  {
    id: "pts-200",
    name: "Regal Scholar",
    description: "Earn 200 engagement points",
    icon: "Sparkles",
    gradient: "from-regal-purple-500 to-indigo-600",
    tier: "gold",
    check: (c) => c.engagementPoints >= 200,
  },
  {
    id: "pts-500",
    name: "Elite Mind",
    description: "Earn 500 engagement points",
    icon: "Crown",
    gradient: "from-amber-400 via-regal-purple-500 to-regal-pink",
    tier: "regal",
    check: (c) => c.engagementPoints >= 500,
  },
  {
    id: "cv-started",
    name: "CV Pioneer",
    description: "Add your first timeline entry to Continuous CV",
    icon: "FileUser",
    gradient: "from-cyan-400 to-blue-600",
    tier: "bronze",
    check: (c) => c.local.cvEntries >= 1,
  },
  {
    id: "course-commander",
    name: "Course Commander",
    description: "Create a course in My Courses",
    icon: "GraduationCap",
    gradient: "from-emerald-400 to-teal-600",
    tier: "bronze",
    check: (c) => c.local.courses >= 1,
  },
  {
    id: "essay-architect",
    name: "Essay Architect",
    description: "Generate an essay structure in Essay Planner",
    icon: "PenLine",
    gradient: "from-indigo-500 to-violet-600",
    tier: "silver",
    check: (c) => c.local.essayPlans >= 1,
  },
  {
    id: "mentor-bond",
    name: "Mentor Bond",
    description: "Have a conversation with Regal Mentor",
    icon: "Crown",
    gradient: "from-amber-400 to-regal-purple-600",
    tier: "silver",
    check: (c) => c.local.mentorChats >= 1,
  },
  {
    id: "war-room",
    name: "Battle Ready",
    description: "Generate an Exam War Room battle plan",
    icon: "Swords",
    gradient: "from-rose-500 to-orange-600",
    tier: "silver",
    check: (c) => c.local.warPlans >= 1,
  },
  {
    id: "task-master",
    name: "Organizer",
    description: "Keep fewer than 3 open tasks — you're on top of things",
    icon: "CheckSquare",
    gradient: "from-sky-400 to-blue-600",
    tier: "bronze",
    check: (c) => c.openTasks <= 2,
  },
];

export function evaluateAchievements(ctx: AchievementContext) {
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: a.check(ctx),
  }));
}

export function loadLocalAchievementStats(userId: string) {
  if (typeof window === "undefined") {
    return { cvEntries: 0, courses: 0, essayPlans: 0, mentorChats: 0, warPlans: 0 };
  }
  try {
    const cv = JSON.parse(localStorage.getItem(`regal-cv-entries-${userId}`) ?? "[]");
    const courses = JSON.parse(localStorage.getItem(`regal-user-courses-${userId}`) ?? "[]");
    const essay = JSON.parse(localStorage.getItem("regal-essay-planner-draft") ?? "{}");
    const mentor = JSON.parse(localStorage.getItem(`regal-mentor-${userId}`) ?? "[]");
    const war = JSON.parse(localStorage.getItem(`regal-war-plans-${userId}`) ?? "[]");
    return {
      cvEntries: Array.isArray(cv) ? cv.length : 0,
      courses: Array.isArray(courses) ? courses.length : 0,
      essayPlans: essay?.plan?.trim() ? 1 : 0,
      mentorChats: Array.isArray(mentor) ? mentor.filter((m: { role?: string }) => m.role === "user").length : 0,
      warPlans: Array.isArray(war) ? war.length : 0,
    };
  } catch {
    return { cvEntries: 0, courses: 0, essayPlans: 0, mentorChats: 0, warPlans: 0 };
  }
}
