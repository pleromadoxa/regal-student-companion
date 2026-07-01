"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const loading = () => <div className="shimmer h-48 rounded-2xl" />;

function load(
  loader: () => Promise<{ [key: string]: ComponentType | unknown }>,
  key: string
) {
  return dynamic(
    () => loader().then((m) => m[key] as ComponentType),
    {
    loading,
    ssr: false,
  });
}

export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  flashcards: load(() => import("./FlashcardsTool"), "FlashcardsTool"),
  "grade-calculator": load(
    () => import("./GradeCalculatorTool"),
    "GradeCalculatorTool"
  ),
  "exam-countdown": load(
    () => import("./ExamCountdownTool"),
    "ExamCountdownTool"
  ),
  "study-planner": load(
    () => import("./StudyPlannerTool"),
    "StudyPlannerTool"
  ),
  "essay-planner": load(
    () => import("./EssayPlannerTool"),
    "EssayPlannerTool"
  ),
  notes: load(() => import("./QuickNotesTool"), "QuickNotesTool"),
  bibliography: load(() => import("./BibliographyTool"), "BibliographyTool"),
  plagiarism: load(() => import("./PlagiarismTool"), "PlagiarismTool"),
  "math-solver": load(() => import("./MathSolverTool"), "MathSolverTool"),
  "language-tutor": load(
    () => import("./LanguageTutorTool"),
    "LanguageTutorTool"
  ),
  resume: load(() => import("./ResumeTool"), "ResumeTool"),
  scholarships: load(() => import("./ScholarshipsTool"), "ScholarshipsTool"),
  streaks: load(() => import("./StreaksTool"), "StreaksTool"),
  schedule: load(() => import("./ScheduleTool"), "ScheduleTool"),
  "reading-list": load(() => import("./ReadingListTool"), "ReadingListTool"),
  "mind-map": load(() => import("./MindMapTool"), "MindMapTool"),
  quiz: load(() => import("./QuizTool"), "QuizTool"),
  wellness: load(() => import("./WellnessTool"), "WellnessTool"),
  budget: load(() => import("./BudgetTool"), "BudgetTool"),
  "study-match": load(() => import("./StudyMatchTool"), "StudyMatchTool"),
  tutor: load(() => import("./TutorTool"), "TutorTool"),
};
