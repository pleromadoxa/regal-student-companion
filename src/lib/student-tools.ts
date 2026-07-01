export type StudentTool = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: "study" | "regal-ai" | "wellness" | "planning";
  regalAI?: boolean;
  features?: string[];
};

export const STUDENT_TOOLS: StudentTool[] = [
  {
    slug: "flashcards",
    name: "Flashcards",
    description: "Spaced-repetition decks for exam prep",
    icon: "Layers",
    category: "study",
  },
  {
    slug: "grade-calculator",
    name: "Grade Calculator",
    description: "GPA and weighted course grade projections",
    icon: "Calculator",
    category: "planning",
  },
  {
    slug: "exam-countdown",
    name: "Exam Countdown",
    description: "Track deadlines with visual countdown timers",
    icon: "AlarmClock",
    category: "planning",
  },
  {
    slug: "study-planner",
    name: "Regal AI Study Planner",
    description: "Personalized weekly study schedules",
    icon: "CalendarDays",
    category: "regal-ai",
    regalAI: true,
  },
  {
    slug: "notes",
    name: "Quick Notes",
    description: "Capture lecture notes with Regal AI summarize",
    icon: "StickyNote",
    category: "study",
    regalAI: true,
  },
  {
    slug: "bibliography",
    name: "Bibliography Manager",
    description: "Organize references with Regal AI citations",
    icon: "Library",
    category: "study",
    regalAI: true,
  },
  {
    slug: "essay-planner",
    name: "Regal AI Essay Planner",
    description: "Plan essay structure, then auto-generate a full essay from your plan",
    icon: "PenLine",
    category: "regal-ai",
    regalAI: true,
  },
  {
    slug: "plagiarism",
    name: "Regal AI Plagiarism Check",
    description: "Scan writing for originality issues",
    icon: "ShieldCheck",
    category: "regal-ai",
    regalAI: true,
  },
  {
    slug: "math-solver",
    name: "Regal AI Math Solver",
    description: "Step-by-step algebra, calculus, geometry, stats & physics",
    icon: "Sigma",
    category: "regal-ai",
    regalAI: true,
  },
  {
    slug: "language-tutor",
    name: "Regal AI Language Tutor",
    description: "Practice vocabulary and grammar",
    icon: "Languages",
    category: "regal-ai",
    regalAI: true,
  },
  {
    slug: "resume",
    name: "Regal AI Resume Builder",
    description: "Build student resumes and cover letters",
    icon: "Briefcase",
    category: "regal-ai",
    regalAI: true,
  },
  {
    slug: "scholarships",
    name: "Scholarship Tracker",
    description: "Manage applications and deadlines",
    icon: "Award",
    category: "planning",
  },
  {
    slug: "streaks",
    name: "Study Streaks",
    description: "Daily consistency and habit tracking",
    icon: "Flame",
    category: "wellness",
  },
  {
    slug: "schedule",
    name: "Class Schedule",
    description: "Visual weekly timetable builder",
    icon: "Clock",
    category: "planning",
  },
  {
    slug: "reading-list",
    name: "Reading List",
    description: "Track textbooks, papers, and articles",
    icon: "BookMarked",
    category: "study",
  },
  {
    slug: "mind-map",
    name: "Regal AI Mind Map",
    description: "Generate concept maps from your notes",
    icon: "Network",
    category: "regal-ai",
    regalAI: true,
  },
  {
    slug: "quiz",
    name: "Regal AI Quiz Generator",
    description: "Auto-generate practice quizzes from notes",
    icon: "HelpCircle",
    category: "regal-ai",
    regalAI: true,
  },
  {
    slug: "wellness",
    name: "Wellness Log",
    description: "Sleep, mood, and balance tracking",
    icon: "Heart",
    category: "wellness",
  },
  {
    slug: "budget",
    name: "Budget Tracker",
    description: "Student expense and allowance manager",
    icon: "Wallet",
    category: "planning",
  },
  {
    slug: "study-match",
    name: "Study Partner Match",
    description: "Find classmates by subject and availability",
    icon: "UserPlus",
    category: "study",
  },
  {
    slug: "tutor",
    name: "Regal AI Tutor",
    description: "24/7 tutor with Gemini Live voice sessions",
    icon: "GraduationCap",
    category: "regal-ai",
    regalAI: true,
  },
];

export function getToolBySlug(slug: string): StudentTool | undefined {
  return STUDENT_TOOLS.find((t) => t.slug === slug);
}

export const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/profile", label: "My Profile", icon: "User" },
      { href: "/tools", label: "Student Tools", icon: "Grid3x3" },
    ],
  },
  {
    label: "Productivity",
    items: [
      { href: "/tasks", label: "Tasks", icon: "CheckSquare" },
      { href: "/calendar", label: "Calendar", icon: "Calendar" },
    ],
  },
  {
    label: "Learning",
    items: [
      { href: "/dictionary", label: "Dictionary", icon: "BookOpen" },
      { href: "/regal-mentor", label: "Regal Mentor", icon: "Crown", regalAI: true },
      { href: "/exam-prep", label: "Exam War Room", icon: "Swords", regalAI: true },
      { href: "/my-courses", label: "My Courses", icon: "GraduationCap", regalAI: true },
      { href: "/continuous-cv", label: "Continuous CV", icon: "FileUser" },
      { href: "/tools/math-solver", label: "Math Solver", icon: "Sigma", regalAI: true },
      { href: "/study-circles", label: "Study Circles", icon: "Users" },
      { href: "/assignments", label: "Assignments", icon: "FileText" },
      { href: "/research", label: "Regal AI Research Lab", icon: "Brain", regalAI: true },
    ],
  },
  {
    label: "Regal Elite",
    items: [
      { href: "/achievements", label: "Achievement Vault", icon: "Trophy" },
      { href: "/tools/essay-planner", label: "Essay Planner", icon: "PenLine", regalAI: true },
      { href: "/leaderboard", label: "Leaderboard", icon: "Trophy" },
    ],
  },
] as const;
