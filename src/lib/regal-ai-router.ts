import { REGAL_AI_NAME } from "@/lib/regal-ai";
import { REGAL_AI_IDENTITY, REGAL_AI_FORMAT_RULES } from "@/lib/regal-ai-system";
import { cloudflareAiChat, cloudflareAiVision } from "@/lib/cloudflare-ai";

/** Actions that work well on Workers AI — try CF first for cost + latency. */
export const CF_FIRST_ACTIONS = new Set([
  "summarize",
  "bullet_points",
  "transcribe",
  "humanize",
  "cite",
  "student_boost",
  "tutor",
  "language",
  "expand",
  "study_plan",
  "research_summary",
  "research_faq",
  "research_chat",
  "research_briefing",
  "research_timeline",
]);

/** Lightweight actions — CF only unless empty response. */
export const CF_ONLY_ACTIONS = new Set(["student_boost"]);

export type AiImageInput = { base64: string; mimeType: string };

function decodeBase64Image(base64: string): Uint8Array | null {
  try {
    const cleaned = base64.replace(/^data:[^;]+;base64,/, "").trim();
    if (!cleaned) return null;
    return Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function regalBaseSystem(extra?: string): string {
  const base = `${REGAL_AI_IDENTITY}\n${REGAL_AI_FORMAT_RULES}`;
  return extra ? `${extra}\n\n${base}` : base;
}

async function callGemini(
  prompt: string,
  systemInstruction?: string,
  image?: AiImageInput
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const parts: { text?: string; inline_data?: { mime_type: string; data: string } }[] = [];
    if (image?.base64) {
      parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
    }
    parts.push({ text: prompt });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemInstruction
                  ? `${systemInstruction}\n\n${regalBaseSystem()}`
                  : regalBaseSystem(`You are ${REGAL_AI_NAME}.`),
              },
            ],
          },
          contents: [{ parts }],
        }),
      }
    );

    if (!res.ok) {
      console.error("[regal-ai] Gemini error:", await res.text());
      return null;
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    console.error("[regal-ai] Gemini request failed:", err);
    return null;
  }
}

async function callCloudflare(
  prompt: string,
  systemInstruction?: string,
  image?: AiImageInput,
  action = "tutor"
): Promise<string | null> {
  try {
    if (image?.base64) {
      const bytes = decodeBase64Image(image.base64);
      if (bytes) {
        const vision = await cloudflareAiVision(
          new Uint8Array(bytes).buffer,
          prompt
        );
        if (vision) return vision;
        const geminiVision = await callGemini(prompt, systemInstruction, image);
        if (geminiVision) return geminiVision;
      }
    }

    const sys = systemInstruction
      ? `${systemInstruction}\n\n${regalBaseSystem()}`
      : regalBaseSystem(`You are ${REGAL_AI_NAME}. Respond clearly for students.`);

    return cloudflareAiChat(
      [
        { role: "system", content: sys },
        { role: "user", content: prompt },
      ],
      { maxTokens: action === "course_material" || action === "essay_generate" ? 4096 : 2048 }
    );
  } catch (err) {
    console.error("[regal-ai] Cloudflare request failed:", err);
    return null;
  }
}

export type AiRunResult = {
  text: string;
  provider: "cloudflare" | "gemini" | "unavailable";
};

/**
 * Route AI requests: simple tasks prefer Workers AI; complex tasks prefer Gemini.
 * Always falls back to the other provider.
 */
export async function runRegalAI(
  action: string,
  prompt: string,
  systemInstruction?: string,
  image?: AiImageInput
): Promise<AiRunResult> {
  const cfFirst = CF_FIRST_ACTIONS.has(action);
  const cfOnly = CF_ONLY_ACTIONS.has(action);

  const tryCf = async (): Promise<string | null> =>
    callCloudflare(prompt, systemInstruction, image, action);
  const tryGemini = async (): Promise<string | null> => callGemini(prompt, systemInstruction, image);

  if (cfFirst || cfOnly) {
    const cf = await tryCf();
    if (cf) return { text: cf, provider: "cloudflare" };
    if (cfOnly) {
      const gemini = await tryGemini();
      if (gemini) return { text: gemini, provider: "gemini" };
    } else {
      const gemini = await tryGemini();
      if (gemini) return { text: gemini, provider: "gemini" };
    }
  } else {
    const gemini = await tryGemini();
    if (gemini) return { text: gemini, provider: "gemini" };
    const cf = await tryCf();
    if (cf) return { text: cf, provider: "cloudflare" };
  }

  return {
    text: `[${REGAL_AI_NAME} is temporarily unavailable. Please try again in a moment.]`,
    provider: "unavailable",
  };
}
