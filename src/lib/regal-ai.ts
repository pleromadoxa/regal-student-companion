import { ApiError, fetchJson } from "@/lib/api-fetch";
import { sanitizeAIContent } from "@/lib/format-ai-content";

export const REGAL_AI_NAME = "Regal AI" as const;
export const REGAL_AI_TAGLINE = "Powered by Regal AI" as const;

export type RegalAIResult = {
  text: string;
  aiDetectionScore?: number;
};

type RegalAiResponse = {
  error?: string;
  result?: string;
  upgradeRequired?: boolean;
  aiDetectionScore?: number;
};

export async function askRegalAI(body: {
  action: string;
  text?: string;
  style?: string;
  topic?: string;
  sources?: string;
  question?: string;
  language?: string;
  subject?: string;
  difficulty?: string;
  mode?: string;
  count?: number;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<RegalAIResult> {
  const { data, res } = await fetchJson<RegalAiResponse>("/api/regal-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || data.error) {
    throw new ApiError(
      data.error ?? `Regal AI request failed (${res.status})`,
      res.status,
      data.upgradeRequired
    );
  }

  if (typeof data.result !== "string" || !data.result.trim()) {
    throw new ApiError("Regal AI returned an empty response", res.status);
  }

  return {
    text: sanitizeAIContent(data.result),
    aiDetectionScore: data.aiDetectionScore,
  };
}

export const REGAL_AI_ACTIONS = {
  scan: "scan",
  cite: "cite",
  essay: "essay",
  essay_plan: "essay_plan",
  essay_generate: "essay_generate",
  transcribe: "transcribe",
  humanize: "humanize",
  research_summary: "research_summary",
  research_faq: "research_faq",
  research_chat: "research_chat",
  research_briefing: "research_briefing",
  research_timeline: "research_timeline",
  plagiarism: "plagiarism",
  math: "math",
  language: "language",
  resume: "resume",
  mindmap: "mindmap",
  quiz: "quiz",
  tutor: "tutor",
  study_plan: "study_plan",
  summarize: "summarize",
  expand: "expand",
  bullet_points: "bullet_points",
  course_material: "course_material",
  student_boost: "student_boost",
  mentor_chat: "mentor_chat",
  exam_war_plan: "exam_war_plan",
} as const;
