import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { regalAiBodySchema } from "@/lib/api-validation";
import { runRegalAI, type AiRunResult } from "@/lib/regal-ai-router";
import {
  HUMANIZE_PROMPT,
  HUMANIZE_SYSTEM,
  RESEARCH_BRIEFING_PROMPT,
  RESEARCH_CHAT_PROMPT,
  RESEARCH_FAQ_PROMPT,
  RESEARCH_SUMMARY_PROMPT,
  RESEARCH_TIMELINE_PROMPT,
  regalSystemInstruction,
} from "@/lib/regal-ai-system";
import {
  buildModulePrompt,
  moduleSystemRole,
  parseBriefingFromText,
  type WarRoomModuleId,
} from "@/lib/exam-war-room";
import { estimateAiDetectionScore, sanitizeAIContent } from "@/lib/format-ai-content";
import { clientIp, rateLimitMemory } from "@/lib/security";
import {
  checkAiUsage,
  checkFeatureAccess,
  incrementAiUsage,
} from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!rateLimitMemory(`regal-ai:${user.id}:${clientIp(request)}`, 40, 60_000)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = regalAiBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

  const {
    action,
    text,
    style,
    topic,
    sources,
    question,
    language,
    subject,
    difficulty,
    mode,
    count,
    imageBase64,
    imageMimeType,
  } = parsed.data;

  const image =
    imageBase64 && imageMimeType
      ? { base64: imageBase64 as string, mimeType: imageMimeType as string }
      : undefined;

  if (action === "exam_war_plan" || action === "exam_war_module") {
    const gate = await checkFeatureAccess(supabase, user.id, "examWarRoom");
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.error, upgradeRequired: gate.upgradeRequired },
        { status: 403 }
      );
    }
  }

  const usage = await checkAiUsage(supabase, user.id);
  if (!usage.ok) {
    return NextResponse.json(
      { error: usage.error, upgradeRequired: usage.upgradeRequired },
      { status: 429 }
    );
  }

  let result: string;
  let aiDetectionScore: number | undefined;
  const aiState: { run: AiRunResult | null } = { run: null };
  const sys = regalSystemInstruction("You assist Regal Student Companion students with academic work.");
  const ask = async (prompt: string, systemInstruction?: string, img = image) => {
    aiState.run = await runRegalAI(action, prompt, systemInstruction, img);
    return aiState.run.text;
  };

  switch (action) {
      case "scan":
        result = await ask(
          `Analyze this document:\n1. Key themes\n2. Issues (citations, grammar, originality)\n3. Improvements\n4. Score /10\n\n${text}`,
          sys
        );
        break;
      case "cite":
        result = await ask(`Generate ${style ?? "APA"} citation(s) with in-text and bibliography entry:\n\n${text}`, "Citation expert.");
        break;
      case "essay":
        result = await ask(`Essay topic: "${topic}"\nNotes: ${text ?? "None"}\nProvide outline, thesis, arguments — guide don't write full essay.`, "Academic writing tutor.");
        break;
      case "essay_plan":
        result = await ask(
          `Create a detailed essay plan and structure for this idea.

Topic/Idea: ${topic}
Essay type: ${subject ?? "Argumentative"}
Academic level: ${difficulty ?? "College"}
Target word count: ${count ?? 1000}
Additional notes: ${text ?? "None"}

Format EXACTLY as markdown with these sections:

## Working Title

## Thesis Statement
(one clear, arguable thesis sentence)

## Essay Structure

### Introduction
- Hook strategy
- Background and context
- Thesis placement

### Body Paragraph 1: [Descriptive section title]
- Main claim
- Evidence and examples to include
- Analysis angle

(Create 3–5 body sections appropriate for the essay type and word count)

### Conclusion
- Synthesis approach
- Closing thought

## Key Arguments & Evidence
(numbered list of main points with supporting evidence types)

## Tone & Style Notes

## Word Count Allocation
(approximate words per section, totalling ~${count ?? 1000})

Rules:
- Do NOT write the full essay — structure and planning only
- Be specific to the topic provided
- NO meta commentary or code fences
- Use clear markdown headings only`,
          "Expert academic writing coach specializing in essay architecture for students."
        );
        break;
      case "essay_generate":
        result = await ask(
          `Write a complete academic essay that STRICTLY follows the approved plan below. Use the exact section structure, thesis, and arguments from the plan. Do not invent a different outline.

TOPIC: ${topic}
ESSAY TYPE: ${subject ?? "Argumentative"}
ACADEMIC LEVEL: ${difficulty ?? "College"}
TARGET LENGTH: approximately ${count ?? 1000} words

APPROVED ESSAY PLAN (follow precisely):
${text}

Format as polished markdown:

# [Essay Title from plan]

## Introduction
(complete paragraphs — not bullet points)

## [Each body section heading from the plan]
(complete paragraphs with topic sentences, evidence, analysis, and transitions)

## Conclusion
(complete paragraphs)

Rules:
- Follow the plan's section order, thesis, and arguments exactly
- Write in clear academic prose for the specified level
- Full paragraphs throughout — no bullet lists in essay body
- Include smooth transitions between sections
- NO meta commentary ("As an AI", "Here is your essay", etc.)
- NO placeholders — write the complete essay
- Aim for ~${count ?? 1000} words`,
          "Professional academic essay writer. Produce complete, plan-faithful student essays."
        );
        break;
      case "transcribe":
        result = await ask(`Clean and structure this lecture transcript:\n\n${text}`, "Study notes assistant.");
        break;
      case "humanize": {
        let humanized = await ask(HUMANIZE_PROMPT(text ?? ""), HUMANIZE_SYSTEM);
        let score = estimateAiDetectionScore(humanized);
        let pass = 0;
        while (score > 5 && pass < 3) {
          humanized = await ask(
            `Rewrite again for a more natural human voice. Current AI-detection estimate is ${score}% — target under 5%. Vary rhythm, use specific word choices, and remove any stiff or generic phrasing.\n\n${humanized}`,
            HUMANIZE_SYSTEM
          );
          score = estimateAiDetectionScore(humanized);
          pass += 1;
        }
        result = humanized;
        aiDetectionScore = score;
        break;
      }
      case "research_summary":
        result = await ask(
          RESEARCH_SUMMARY_PROMPT(sources ?? ""),
          regalSystemInstruction("Research synthesizer for academic sources.")
        );
        break;
      case "research_faq":
        result = await ask(
          RESEARCH_FAQ_PROMPT(sources ?? ""),
          regalSystemInstruction("Research assistant.")
        );
        break;
      case "research_chat":
        result = await ask(
          RESEARCH_CHAT_PROMPT(sources ?? "", question ?? ""),
          regalSystemInstruction("Answer from sources only.")
        );
        break;
      case "research_briefing":
        result = await ask(
          RESEARCH_BRIEFING_PROMPT(sources ?? ""),
          regalSystemInstruction("Research analyst.")
        );
        break;
      case "research_timeline":
        result = await ask(
          RESEARCH_TIMELINE_PROMPT(sources ?? ""),
          regalSystemInstruction("Research chronology specialist.")
        );
        break;
      case "plagiarism":
        result = await ask(
          `Analyze this text for academic integrity. Return EXACTLY this markdown format:

## Originality Score
[number 0-100]%

## Risk Level
[Low|Medium|High]

## Flagged Sections
- [specific issue with brief quote or paraphrase hint]
(list 0-5 items)

## Suggestions
- [actionable revision suggestion]
(list 2-5 items)

## Summary
[2-3 sentence overview for the student]

Text to analyze:
${text}`,
          "Academic integrity reviewer. Be constructive and educational. Flag uncited claims, overly generic phrasing, and passages that may need citation."
        );
        break;
      case "math": {
        const subjectLine = subject ? `Subject: ${subject}` : "Subject: General math";
        const levelLine = difficulty ? `Level: ${difficulty}` : "Level: High school / college";
        const modeLine =
          mode === "simpler"
            ? "Explain each step in simpler language for a struggling student."
            : mode === "alternative"
              ? "Show an alternative solution method with different steps."
              : mode === "practice"
                ? "Do NOT solve the original. Generate ONE similar practice problem with a full worked solution."
                : mode === "verify"
                  ? "Verify the student's work shown. Point out any errors and show the correct solution."
                  : "Provide a complete step-by-step solution.";
        const imageLine = image
          ? "IMPORTANT: The problem is in the attached image. Read all printed text, handwriting, diagrams, graphs, and equations carefully. Transcribe the problem exactly in the ## Problem section before solving."
          : "";
        const promptText = text?.trim()
          ? `${subjectLine}\n${levelLine}\n\nProblem:\n${text}`
          : `${subjectLine}\n${levelLine}\n\n${imageLine || "Problem: (see attached image)"}`;
        result = await ask(
          `${promptText}\n\n${imageLine}\n\nFormat your response EXACTLY as markdown with these sections:
## Problem
(restate the problem clearly — transcribe from image if needed)
## Given
(list known values, variables, and what is asked)
## Steps
(numbered steps with reasoning; show all work)
## Answer
(final answer clearly highlighted — use **bold** for the result)
## Check
(quick verification or sanity check)
## Tip
(one study tip for this problem type)

${modeLine}`,
          "World-class math tutor. Be rigorous and clear. Use Unicode math symbols where helpful. Never skip steps. If the image is unclear, state what you can read and your best interpretation.",
          image
        );
        break;
      }
      case "language": {
        const lang = language ?? "Spanish";
        const modeLine =
          mode === "translate"
            ? "Translate between English and the target language. Show original, translation, and brief notes on word choice or nuance."
            : mode === "grammar"
              ? "Check grammar and phrasing. Show the corrected sentence, explain each error, and provide a polished rewrite."
              : mode === "vocabulary"
                ? "Teach vocabulary with pronunciation hints, definitions, example sentences, and quick memory tips."
                : mode === "conversation"
                  ? "Practice conversation naturally in the target language. Include English glosses when helpful. Ask a follow-up question to keep the dialogue going."
                  : "Help with language learning — correction, explanation, and practice.";
        result = await ask(
          `Target language: ${lang}\nMode: ${mode ?? "general"}\n\nStudent input:\n${text}`,
          `Expert ${lang} language tutor for students. ${modeLine} Use markdown headings when helpful.`
        );
        break;
      }
      case "resume": {
        const resumeMode =
          mode === "cover_letter"
            ? "Write a professional cover letter (3–4 paragraphs) tailored to the target role and company mentioned. Use a warm, confident student tone. Include opening hook, relevant achievements, and closing call to action."
            : "Format a polished one-page student resume. Use clear section headers (Contact, Summary, Education, Experience, Skills, Activities). Use bullet points with strong action verbs. Keep it ATS-friendly plain text.";
        result = await ask(
          `Student profile and background:\n\n${text}\n\n${resumeMode}`,
          "Career coach for high school and college students. Be specific and professional."
        );
        break;
      }
      case "mindmap": {
        const topicLine = topic ? `Central topic: ${topic}\n\n` : "";
        result = await ask(
          `${topicLine}Source material:\n${text ?? topic ?? ""}\n\nCreate a hierarchical mind map as an indented bullet tree.\nRules:\n- First line: central topic (no bullet)\n- Main branches: "- " at column 0\n- Sub-branches: indent 2 spaces per level with "- "\n- Use concise labels (3–8 words)\n- 3–5 main branches, 2–4 sub-nodes each where relevant\n- Output ONLY the tree — no intro, no markdown headers`,
          "Visual learning assistant. Structure knowledge for student recall."
        );
        break;
      }
      case "quiz": {
        const n = [5, 10, 15].includes(Number(count)) ? Number(count) : 10;
        const retake = mode === "retake";
        result = await ask(
          retake
            ? `Generate exactly ${n} NEW practice quiz questions to reinforce these missed topics. Vary wording and depth.\n\n${text}\n\nReturn ONLY a valid JSON array. Each item: {"question": string, "answer": string}. No markdown fences.`
            : `Generate exactly ${n} practice quiz questions with answers from this study material.\n\n${text}\n\nReturn ONLY a valid JSON array. Each item: {"question": string, "answer": string}. No markdown fences.`,
          "Quiz generator. Output valid JSON only — an array of question/answer objects."
        );
        break;
      }
      case "tutor":
        result = await ask(`Student question: ${question ?? text}`, "Patient academic tutor.");
        break;
      case "study_plan":
        result = await ask(`Create a weekly study plan from:\n\n${text}`, "Study planner.");
        break;
      case "summarize":
        result = await ask(`Summarize concisely:\n\n${text}`, "Note summarizer.");
        break;
      case "expand":
        result = await ask(
          `Expand these study notes with more detail, examples, and context. Keep the original ideas and add depth for exam prep:\n\n${text}`,
          "Academic note expander."
        );
        break;
      case "bullet_points":
        result = await ask(
          `Convert these notes into clear, organized bullet points grouped by topic. Use concise student-friendly language:\n\n${text}`,
          "Note formatter."
        );
        break;
      case "course_material":
        result = await ask(
          `Create comprehensive course material for a student based on this context:\n\n${text}\n\nSubject focus: ${subject ?? "General"}\nCourse: ${topic ?? "Academic course"}\n\nFormat EXACTLY as clean markdown with these sections (use ## for each main section):\n\n## Course Overview\n(2-3 paragraphs introducing the subject within the course context)\n\n## Learning Objectives\n(5-8 numbered objectives students should achieve)\n\n## Core Topics & Lessons\n(Organize into 4-8 lessons. For each lesson use ### Lesson N: Title, then bullet points covering key concepts, definitions, and examples)\n\n## Key Terms Glossary\n(10-15 terms with concise definitions)\n\n## Study Guide\n(Practical review questions and exam tips)\n\n## Recommended Practice\n(3-5 exercises or activities with brief instructions)\n\n## Further Reading\n(3-5 suggested topics or resource types to explore)\n\nRules:\n- Write for the specific course and subject provided — personalize everything\n- Use proper markdown only: ##, ###, -, numbered lists, **bold** for emphasis\n- NO code fences, NO JSON, NO emoji, NO special Unicode symbols\n- NO meta commentary like "As an AI" or "Here is your material"\n- Professional textbook quality — clear, structured, student-friendly\n- Content should be substantial (800-1500 words total)`,
          "Expert curriculum designer and academic author. Produce publication-quality study materials."
        );
        break;
      case "student_boost":
        result = await ask(
          `You are a motivational academic coach. Based on this student's current context, write a SHORT personalized empowerment message (2-4 sentences max).

Student context:
${text}

Rules:
- Be warm, specific, and actionable — reference their streak, tasks, or time of day when relevant
- Suggest ONE concrete next step they can take in the next 30 minutes
- No generic platitudes, no "As an AI", no markdown, no bullet points
- Write in second person ("you")
- Keep it under 60 words`,
          "Empowering student success coach for Regal Student Companion."
        );
        break;
      case "mentor_chat":
        result = await ask(
          `Student context:\n${text}\n\nStudent's latest message: ${question ?? ""}\n\nRespond as Regal Mentor — their personal academic coach. Rules:
- Reference their context (streak, major, tasks) when naturally relevant
- Give specific, actionable advice — not generic motivation
- Warm but professional tone for a student
- Use markdown sparingly (bold for key actions only)
- Keep responses focused: 2-5 short paragraphs max
- NO "As an AI" or disclaimers`,
          "Regal Mentor — elite academic coach who knows each student's journey."
        );
        break;
      case "exam_war_plan":
        result = await ask(
          buildModulePrompt("full_plan", parseBriefingFromText(text ?? "", subject, topic), count ?? 7),
          moduleSystemRole("full_plan")
        );
        break;
      case "exam_war_module": {
        const moduleId = (mode ?? "full_plan") as WarRoomModuleId;
        const validModules: WarRoomModuleId[] = [
          "full_plan",
          "drills",
          "cram_sheet",
          "mock_prep",
          "syllabus_map",
          "day_of",
        ];
        const resolved = validModules.includes(moduleId) ? moduleId : "full_plan";
        result = await ask(
          buildModulePrompt(
            resolved,
            parseBriefingFromText(text ?? "", subject, topic),
            count ?? 7
          ),
          moduleSystemRole(resolved)
        );
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown Regal AI action" }, { status: 400 });
    }

    const aiProvider = aiState.run?.provider;
    if (aiProvider !== "cloudflare" && aiProvider !== "gemini") {
      return NextResponse.json(
        { error: "Regal AI is temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      );
    }

    result = sanitizeAIContent(result);

    await Promise.all([
      incrementAiUsage(supabase, user.id),
      supabase.rpc("companion_log_activity", {
        p_action: "regal_ai",
        p_category: "ai",
        p_label: `Regal AI: ${action}`,
        p_metadata: { regal_action: action },
        p_points_delta: 5,
        p_path: null,
      }),
    ]);

    return NextResponse.json({
      result,
      aiRemaining: usage.remaining - 1,
      ...(aiDetectionScore !== undefined ? { aiDetectionScore } : {}),
    });
  } catch (err) {
    console.error("[regal-ai]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Regal AI request failed" },
      { status: 500 }
    );
  }
}
