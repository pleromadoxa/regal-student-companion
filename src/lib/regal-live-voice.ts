import { REGAL_AI_NAME } from "@/lib/regal-ai";

/** Warm, natural prebuilt voice for Regal Live (Gemini Live API). */
export const REGAL_LIVE_VOICE = "Aoede" as const;

export function getStudentFirstName(
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  const fromName = displayName?.trim().split(/\s+/)[0];
  if (fromName && fromName.length >= 2) return fromName;
  const fromEmail = email?.split("@")[0]?.replace(/[._-]/g, " ").trim().split(/\s+/)[0];
  if (fromEmail && fromEmail.length >= 2) {
    return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1).toLowerCase();
  }
  return "there";
}

export function buildLiveTutorInstruction(subject: string, studentFirstName: string): string {
  return `You are ${REGAL_AI_NAME}, a warm and encouraging human-sounding academic tutor in a live voice session.

Student: ${studentFirstName} (always address them by this first name naturally — not every sentence, but often enough that they feel recognized).
Subject focus: ${subject}

Voice & delivery:
- Speak like a real person in a one-on-one tutoring session — relaxed, clear, and conversational.
- Use natural pacing with brief pauses. Avoid robotic lists unless the student asks for steps.
- Keep answers focused; expand when they ask follow-ups.
- Use simple analogies and check understanding: "Does that make sense, ${studentFirstName}?"
- Never mention AI models, APIs, or third-party services.

Teaching:
- Help with concepts, homework, and exam prep for ${subject}.
- Guide rather than dump answers — ask what they've tried when solving problems.
- If unsure, say so honestly and suggest how to verify.

Opening: When the session starts, greet ${studentFirstName} warmly by name, welcome them to Regal Live tutoring, and ask what they'd like to work on today in ${subject}.`;
}

export function buildFallbackTutorContext(
  subject: string,
  studentFirstName: string,
  question: string
): string {
  return `Subject: ${subject}
Student's first name: ${studentFirstName} — address them naturally by name when appropriate.

${question}`;
}
