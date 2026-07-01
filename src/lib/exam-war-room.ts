import { buildExamSystemContext } from "@/lib/exam-systems";

export type WarRoomModuleId =
  | "full_plan"
  | "drills"
  | "cram_sheet"
  | "mock_prep"
  | "syllabus_map"
  | "day_of";

export type WarRoomBriefing = {
  examSystemId: string;
  title: string;
  subject: string;
  examDate: string;
  weakAreas: string;
  notes: string;
  hoursPerDay: number;
  targetGrade: string;
  paperNumber: string;
};

export type WarRoomModuleResult = {
  id: WarRoomModuleId;
  content: string;
  generatedAt: string;
};

export type WarRoomState = {
  version: 2;
  briefing: WarRoomBriefing;
  modules: Partial<Record<WarRoomModuleId, WarRoomModuleResult>>;
  checklist: { id: string; text: string; done: boolean }[];
  updatedAt: string;
};

export const WAR_ROOM_STORAGE_KEY = (userId: string) => `regal-war-room-v2-${userId}`;

export const WAR_ROOM_MODULES: {
  id: WarRoomModuleId;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "full_plan",
    label: "Battle Plan",
    description: "Day-by-day schedule, weak-spot drills, and last-24-hour playbook",
    icon: "Swords",
  },
  {
    id: "syllabus_map",
    label: "Syllabus Map",
    description: "Topic checklist aligned to your exam system's format",
    icon: "Map",
  },
  {
    id: "drills",
    label: "Weak-Spot Drills",
    description: "Targeted exercises and practice sets for problem areas",
    icon: "Target",
  },
  {
    id: "cram_sheet",
    label: "Cram Sheet",
    description: "Condensed formulas, definitions, and must-know facts",
    icon: "Zap",
  },
  {
    id: "mock_prep",
    label: "Mock Exam Prep",
    description: "Sample questions, marking guidance, and self-test protocol",
    icon: "FileQuestion",
  },
  {
    id: "day_of",
    label: "Exam Day Protocol",
    description: "Hour-by-hour plan, what to bring, and mindset checklist",
    icon: "CalendarCheck",
  },
];

export const DEFAULT_WAR_CHECKLIST = [
  "Confirm exam date, time, and venue",
  "Gather required ID and admission documents",
  "Print or save admission slip",
  "Review cram sheet once (morning of exam)",
  "Pack permitted materials (calculator, pens, etc.)",
  "Set two alarms",
  "Light review only — no all-nighter",
  "Arrive 30–45 minutes early",
];

export function parseBriefingFromText(
  text: string,
  subject?: string,
  topic?: string
): WarRoomBriefing {
  const lines = text.split("\n");
  const pick = (prefix: string) =>
    lines.find((l) => l.toLowerCase().startsWith(prefix.toLowerCase()))?.split(":").slice(1).join(":").trim() ?? "";

  const examSystemId = pick("examSystemId") || "university-finals";

  return {
    examSystemId,
    title: pick("Exam title") || topic || "Exam",
    subject: pick("Subject focus") || subject || pick("Student subject focus") || "General",
    examDate: pick("Exam date") || new Date().toISOString().slice(0, 10),
    weakAreas: pick("Weak areas"),
    notes: pick("Additional context"),
    hoursPerDay: Number(pick("Study hours")) || Number(pick("Study hours available per day")) || 3,
    targetGrade: pick("Target grade/score") || pick("Target grade"),
    paperNumber: pick("Paper/component") || pick("Paper"),
  };
}

/** Serialize briefing for API — server parses with parseBriefingFromText */
export function serializeBriefingForApi(b: WarRoomBriefing, daysLeft: number): string {
  return [
    buildExamSystemContext(b.examSystemId, b.subject),
    `examSystemId: ${b.examSystemId}`,
    `Exam title: ${b.title}`,
    `Subject focus: ${b.subject}`,
    `Exam date: ${b.examDate}`,
    `Days remaining: ${daysLeft}`,
    `Study hours: ${b.hoursPerDay}`,
    b.targetGrade && `Target grade/score: ${b.targetGrade}`,
    b.paperNumber && `Paper/component: ${b.paperNumber}`,
    b.weakAreas && `Weak areas: ${b.weakAreas}`,
    b.notes && `Additional context: ${b.notes}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildBriefingContext(b: WarRoomBriefing, daysLeft: number): string {
  return [
    buildExamSystemContext(b.examSystemId, b.subject),
    "",
    `Exam title: ${b.title}`,
    `Subject focus: ${b.subject || "General"}`,
    `Exam date: ${b.examDate}`,
    `Days remaining: ${daysLeft}`,
    `Study hours available per day: ${b.hoursPerDay}`,
    b.targetGrade && `Target grade/score: ${b.targetGrade}`,
    b.paperNumber && `Paper/component: ${b.paperNumber}`,
    b.weakAreas && `Weak areas: ${b.weakAreas}`,
    b.notes && `Additional context: ${b.notes}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildModulePrompt(
  moduleId: WarRoomModuleId,
  briefing: WarRoomBriefing,
  daysLeft: number
): string {
  const ctx = buildBriefingContext(briefing, daysLeft);

  switch (moduleId) {
    case "full_plan":
      return `${ctx}

Create a comprehensive EXAM WAR ROOM battle plan.

Format as markdown with these sections:

## Mission Overview
(2-3 sentences on strategy given time remaining and exam system)

## Exam System Strategy
(Specific tactics for THIS exam format — papers, timing, marking)

## Day-by-Day Battle Schedule
(One ### Day N — [date/focus] section for EACH day until exam with hours, tasks, and priorities)

## Weak Spot Drills
(Targeted exercises for weak areas — numbered, with time estimates)

## High-Yield Topics
(Prioritised list if time runs short — exam-system specific)

## Practice & Review Protocol
(Past papers schedule, active recall, self-testing — name relevant past paper sources for this exam)

## Last 24 Hours Playbook
(Hour-by-hour blocks for final day)

## Exam Day Checklist
(What to bring, mindset, timing — include region-specific requirements)

Rules: Be specific and actionable. NO emoji. NO meta commentary.`;

    case "syllabus_map":
      return `${ctx}

Create a SYLLABUS MAP / topic checklist for this exact exam and subject.

Format:
## Syllabus Overview
(How this subject is tested in this exam system)

## Topic Checklist
(### Topic name — for each major topic: key subtopics as checklist items using - [ ] format, estimated study hours, and priority High/Medium/Low)

## Cross-Topic Connections
(How topics link for this exam)

## Suggested Study Order
(Numbered sequence given days remaining)

Rules: Align to official syllabus structure for this exam system where known. NO emoji.`;

    case "drills":
      return `${ctx}

Create WEAK-SPOT DRILL PACK for the student's problem areas.

Format:
## Drill Overview
(How to use these drills in ${daysLeft} days)

## Drill Set 1–5
(For each set: ### Set N — [focus area], 5–8 practice prompts or exercises with brief answers/hints at end)

## Self-Marking Guide
(How to check work for this exam type)

## Progress Tracker
(- [ ] items for each drill set)

Rules: Exam-system appropriate question styles (objective, essay, practical as relevant). NO emoji.`;

    case "cram_sheet":
      return `${ctx}

Create a CRAM SHEET — one-page-style dense revision reference.

Format:
## Essential Formulas & Definitions
(Bullet list — scannable)

## Must-Know Facts
(Numbered high-yield facts likely to appear)

## Common Mistakes to Avoid
(Bullet list)

## Quick Mnemonics
(Where helpful)

## Last-Look Reminders
(5–10 items to read morning of exam)

Rules: Dense but readable. Exam-system aligned. NO emoji. NO code fences.`;

    case "mock_prep":
      return `${ctx}

Create MOCK EXAM PREPARATION pack.

Format:
## Mock Exam Conditions
(Time limits, paper structure mirroring real exam)

## Section A — Sample Questions
(5–10 representative questions in authentic format)

## Section B — Marking Rubric
(How answers would be scored)

## Model Answer Sketches
(Concise outlines for Section A — not full essays unless short-answer)

## Post-Mock Review Protocol
(How to analyse mistakes and adjust remaining study days)

Rules: Match real exam question style for this system. NO emoji.`;

    case "day_of":
      return `${ctx}

Create EXAM DAY PROTOCOL only.

Format:
## Night Before
(Hour-by-hour from 6pm to sleep)

## Morning of Exam
(Wake time through leaving home — include meal, light review)

## At the Venue
(Arrival, check-in, waiting, calming techniques)

## During the Exam
(Section timing strategy, what to do if stuck, checking work)

## What to Bring
(Checklist for this exam system and country)

## Mindset & Emergency Plan
(If anxiety spikes, if you blank, if time runs short)

Rules: Practical and calming. Region-specific where relevant. NO emoji.`;

    default:
      return ctx;
  }
}

export function moduleSystemRole(moduleId: WarRoomModuleId): string {
  const roles: Record<WarRoomModuleId, string> = {
    full_plan: "Elite exam strategist specialising in African and international examination systems.",
    syllabus_map: "Curriculum mapping specialist for global examination boards.",
    drills: "Exam drill coach creating targeted practice for weak areas.",
    cram_sheet: "Revision cram sheet author for high-stakes exams.",
    mock_prep: "Mock examination designer familiar with WAEC, JAMB, SAT, GCSE, and university finals.",
    day_of: "Exam day performance coach.",
  };
  return roles[moduleId];
}
