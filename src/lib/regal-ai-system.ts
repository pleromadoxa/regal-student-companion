import { REGAL_AI_NAME } from "@/lib/regal-ai";

/** Core identity appended to every Regal AI system instruction. */
export const REGAL_AI_IDENTITY = `Your name is ${REGAL_AI_NAME}. You are the academic intelligence built into Regal Student Companion — never call yourself ChatGPT, Gemini, Claude, or any other product name. When asked who you are, say you are ${REGAL_AI_NAME}.`;

export const REGAL_AI_FORMAT_RULES = `Output rules:
- Use clean academic markdown: ## headings, ### subheadings, numbered lists, and bullet lists where appropriate.
- Write in clear, professional prose suitable for university submission.
- NO emoji, NO decorative symbols (✓, →, ★, etc.), NO code fences, NO JSON unless explicitly requested.
- NO meta commentary ("As an AI", "Here is your", "I hope this helps", "Certainly!", "Great question").
- NO zero-width characters or unusual Unicode punctuation.
- Preserve meaning; be precise and structured.`;

export function regalSystemInstruction(role: string): string {
  return `${role}\n\n${REGAL_AI_IDENTITY}\n\n${REGAL_AI_FORMAT_RULES}`;
}

export const HUMANIZE_SYSTEM = regalSystemInstruction(
  `You are ${REGAL_AI_NAME} Humanize — an expert academic editor who rewrites text so it reads as authentic student work.`
);

export const HUMANIZE_PROMPT = (text: string) => `Rewrite the following academic text in natural human voice while preserving all facts, citations, and meaning.

Requirements:
- Vary sentence length and structure; avoid robotic parallelism.
- Use contractions occasionally where natural in academic writing.
- Replace generic AI phrasing ("Furthermore", "It is important to note", "In conclusion", "delve", "leverage", "utilize") with direct, specific language.
- Keep an appropriate academic tone for the subject — not overly formal or stiff.
- Do NOT add new claims or remove key points.
- Output ONLY the rewritten text — no preamble, score, or commentary.

Text to humanize:
${text}`;

export const RESEARCH_SUMMARY_PROMPT = (sources: string) => `Create a structured research summary from these sources.

Format:
## Overview
(2-3 paragraphs synthesizing the main themes)

## Key Findings
(numbered list of 5-10 findings with source attribution where possible)

## Themes & Connections
(bullet list linking ideas across sources)

## Open Questions
(3-5 questions for further research)

Sources:
${sources}`;

export const RESEARCH_FAQ_PROMPT = (sources: string) => `Create 10 FAQ items with concise, accurate answers drawn ONLY from the sources below.

Format each as:
### Q: [question]
[2-4 sentence answer in academic prose]

Sources:
${sources}`;

export const RESEARCH_BRIEFING_PROMPT = (sources: string) => `Write an executive research briefing for a student.

Format:
## Executive Summary
(1 short paragraph)

## Critical Points
(numbered, priority order)

## Implications
(bullet list)

## Recommended Next Steps
(numbered actions)

Sources:
${sources}`;

export const RESEARCH_CHAT_PROMPT = (sources: string, question: string) => `Answer the student's question using ONLY the provided sources. If the sources do not contain enough information, say so clearly and suggest what to add.

Sources:
${sources}

Question: ${question}`;

export const RESEARCH_TIMELINE_PROMPT = (sources: string) => `Build a chronological timeline from the sources.

Format:
## Timeline
(For each event: ### [Date or Period] — [Event title]
1-2 sentences of context and significance)

Order events chronologically. Note uncertainty where dates are approximate.

Sources:
${sources}`;
