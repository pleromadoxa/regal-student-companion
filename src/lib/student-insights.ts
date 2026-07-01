import type { CalendarEvent, Task } from "@/types";
import { isToday, isTomorrow, format } from "date-fns";

export type EmpowerAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: string;
  gradient: string;
  glow: string;
};

export type EmpowermentBrief = {
  headline: string;
  subline: string;
  actions: EmpowerAction[];
  tip: string;
  mood: "focus" | "study" | "plan" | "celebrate" | "explore";
};

const DAILY_TIPS = [
  "Break big assignments into 25-minute focus blocks — your brain retains more with spaced sessions.",
  "Review notes within 24 hours of class — it can double long-term retention.",
  "Teach a concept aloud to an imaginary audience — if you can explain it, you know it.",
  "Use the Essay Planner structure first, then generate — planned writing beats blank-page panic.",
  "Add one line to your Continuous CV each week — future-you will thank present-you.",
  "Quiz yourself before re-reading — retrieval practice beats passive review every time.",
  "Schedule your hardest subject when your energy peaks, usually mid-morning.",
  "My Courses AI materials work best when you add specific topics you need to cover.",
  "A 5-minute mind map before studying activates connections across the whole topic.",
  "Sleep is study — consolidate memory overnight after a focused session.",
  "Start assignments 48 hours before the deadline to leave room for Regal AI plagiarism checks.",
  "Pair focus timer sessions with one subject — context switching drains mental energy.",
  "Build your bibliography as you research, not the night before submission.",
  "Compare your essay plan to the final draft — great writers revise structure first.",
  "Use Study Circles to explain problems — collaboration fills gaps you didn't know you had.",
  "Track scholarships in the planner — small deadlines compound into big opportunities.",
  "Read the Word of the Day aloud — vocabulary grows through active use, not passive lookup.",
  "Set one micro-goal per day you can finish in under 30 minutes.",
  "When stuck on math, try Regal AI's practice mode before checking the full solution.",
  "Your streak is momentum — protect it with even 10 minutes on low-energy days.",
  "Research Lab summaries help you write faster — upload sources before you draft.",
  "Color-code calendar events by subject — visual planning reduces missed deadlines.",
  "Rewrite AI-generated course notes in your own words to cement understanding.",
  "Ask Regal AI Tutor 'why' three times — depth beats surface-level answers.",
  "Update your CV after every achievement while details are still fresh.",
  "Batch similar tasks — answer emails, then study, then write — fewer mode switches.",
  "Preview tomorrow's schedule tonight — you'll start faster in the morning.",
  "Celebrate completed focus sessions — positive reinforcement builds habits.",
  "Use language tutor conversation mode for 5 minutes daily — consistency beats cramming.",
  "Grade Calculator projections help you prioritize where an extra hour matters most.",
];

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

function dailyTip(): string {
  const day = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_TIPS[day % DAILY_TIPS.length];
}

function formatEventHint(event: CalendarEvent): string {
  const d = new Date(event.start_at);
  if (isToday(d)) return `Today · ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, "h:mm a")}`;
  return format(d, "EEE, MMM d");
}

export function buildEmpowermentBrief(input: {
  displayName: string;
  engagementPoints: number;
  focusMinutes: number;
  streak: number;
  major: string | null;
  pendingTasks: Task[];
  upcomingEvents: CalendarEvent[];
}): EmpowermentBrief {
  const time = getTimeOfDay();
  const firstName = input.displayName.split(" ")[0] || "Student";
  const urgentTask = input.pendingTasks.find((t) => t.due_date && isToday(new Date(t.due_date)));
  const nextEvent = input.upcomingEvents[0];
  const actions: EmpowerAction[] = [];

  if (urgentTask) {
    actions.push({
      id: "urgent-task",
      label: "Due today",
      description: urgentTask.title,
      href: "/tasks",
      icon: "CheckSquare",
      gradient: "from-rose-500 to-orange-500",
      glow: "bg-rose-500/20",
    });
  } else if (input.pendingTasks[0]) {
    actions.push({
      id: "next-task",
      label: "Next up",
      description: input.pendingTasks[0].title,
      href: "/tasks",
      icon: "CheckSquare",
      gradient: "from-regal-purple-500 to-violet-600",
      glow: "bg-regal-purple-500/20",
    });
  }

  if (nextEvent) {
    actions.push({
      id: "next-event",
      label: formatEventHint(nextEvent),
      description: nextEvent.title,
      href: "/calendar",
      icon: "Calendar",
      gradient: "from-sky-400 to-blue-600",
      glow: "bg-sky-500/20",
    });
  }

  if (time === "morning" || time === "afternoon") {
    actions.push({
      id: "focus",
      label: "Power focus",
      description: "Start a 25-minute deep work block",
      href: "/dashboard#focus",
      icon: "Timer",
      gradient: "from-emerald-400 to-teal-600",
      glow: "bg-emerald-500/20",
    });
  }

  if (time === "evening" || time === "night") {
    actions.push({
      id: "essay",
      label: "Essay Planner",
      description: "Structure then auto-generate your draft",
      href: "/tools/essay-planner",
      icon: "PenLine",
      gradient: "from-indigo-500 to-regal-purple-600",
      glow: "bg-indigo-500/20",
    });
  }

  actions.push({
    id: "mentor",
    label: "Regal Mentor",
    description: "Your context-aware AI academic coach",
    href: "/regal-mentor",
    icon: "Crown",
    gradient: "from-amber-400 to-regal-purple-600",
    glow: "bg-amber-500/20",
  });

  actions.push({
    id: "courses",
    label: "My Courses",
    description: "AI course materials for your subjects",
    href: "/my-courses",
    icon: "GraduationCap",
    gradient: "from-cyan-400 to-blue-500",
    glow: "bg-cyan-500/20",
  });

  actions.push({
    id: "cv",
    label: "Continuous CV",
    description: "Log a win — build your living résumé",
    href: "/continuous-cv",
    icon: "FileUser",
    gradient: "from-fuchsia-500 to-purple-600",
    glow: "bg-fuchsia-500/20",
  });

  actions.push({
    id: "tools",
    label: "Explore tools",
    description: `${input.engagementPoints} engagement pts earned`,
    href: "/tools",
    icon: "Sparkles",
    gradient: "from-amber-400 to-yellow-600",
    glow: "bg-amber-500/20",
  });

  const uniqueActions = actions
    .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
    .slice(0, 5);

  let headline: string;
  let subline: string;
  let mood: EmpowermentBrief["mood"] = "study";

  if (input.streak >= 7) {
    headline = `${firstName}, you're on fire — ${input.streak} days strong`;
    subline = "Your consistency is compounding. Keep the momentum with one focused win today.";
    mood = "celebrate";
  } else if (urgentTask) {
    headline = `Let's nail today, ${firstName}`;
    subline = `"${urgentTask.title}" is due today — tackle it while your energy is high.`;
    mood = "plan";
  } else if (time === "morning") {
    headline = `Good morning, ${firstName}`;
    subline = input.major
      ? `Your ${input.major} journey continues — pick one power move below.`
      : "Set the tone for today with one intentional study move.";
    mood = "focus";
  } else if (time === "evening") {
    headline = `Evening momentum, ${firstName}`;
    subline = "Review, plan, or draft — small steps tonight unlock easier tomorrows.";
    mood = "explore";
  } else if (input.focusMinutes === 0) {
    headline = `Ready when you are, ${firstName}`;
    subline = "Your first focus session today unlocks engagement points and clarity.";
    mood = "focus";
  } else {
    headline = `Keep going, ${firstName}`;
    subline = `${input.focusMinutes} focus minutes logged — you're building real discipline.`;
    mood = "study";
  }

  return {
    headline,
    subline,
    actions: uniqueActions,
    tip: dailyTip(),
    mood,
  };
}

export function buildBoostContext(input: {
  displayName: string;
  engagementPoints: number;
  focusMinutes: number;
  streak: number;
  major: string | null;
  pendingTaskCount: number;
  upcomingEventCount: number;
}): string {
  return [
    `Student: ${input.displayName}`,
    input.major && `Major: ${input.major}`,
    `Engagement points: ${input.engagementPoints}`,
    `Focus minutes (total): ${input.focusMinutes}`,
    `Study streak: ${input.streak} days`,
    `Open tasks: ${input.pendingTaskCount}`,
    `Upcoming events: ${input.upcomingEventCount}`,
    `Time of day: ${getTimeOfDay()}`,
  ]
    .filter(Boolean)
    .join("\n");
}
