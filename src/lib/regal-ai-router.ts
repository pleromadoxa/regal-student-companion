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
  action = "tutor",
  maxTokens?: number
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
      {
        maxTokens:
          maxTokens ??
          (action === "course_material" || action === "essay_generate" ? 4096 : 2048)
      }
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
 * Plan-aware routing options (Campus / Ultra entitlements):
 *  - `priority`     → race both providers and return the first good answer
 *  - `premiumModel` → premium model path first, with a larger output budget
 */
export type AiRunOptions = {
  priority?: boolean;
  premiumModel?: boolean;
};

/** Resolves with the first non-empty answer; slower providers keep running in the background. */
function firstSuccessful(
  tasks: { promise: Promise<string | null>; provider: "cloudflare" | "gemini" }[]
): Promise<{ text: string; provider: "cloudflare" | "gemini" } | null> {
  return new Promise((resolve) => {
    let pending = tasks.length;
    let settled = false;
    for (const task of tasks) {
      task.promise
        .then((text) => {
          if (settled) return;
          if (text) {
            settled = true;
            resolve({ text, provider: task.provider });
            return;
          }
          if (--pending === 0) resolve(null);
        })
        .catch(() => {
          if (settled) return;
          if (--pending === 0) resolve(null);
        });
    }
    if (pending === 0) resolve(null);
  });
}

/**
 * Route AI requests: simple tasks prefer Workers AI; complex tasks prefer Gemini.
 * Always falls back to the other provider.
 */
export async function runRegalAI(
  action: string,
  prompt: string,
  systemInstruction?: string,
  image?: AiImageInput,
  options?: AiRunOptions
): Promise<AiRunResult> {
  const priority = options?.priority ?? false;
  const premiumModel = options?.premiumModel ?? false;
  const maxTokens =
    premiumModel
      ? 8192
      : action === "course_material" || action === "essay_generate"
        ? 4096
        : 2048;

  const cfFirst = CF_FIRST_ACTIONS.has(action);
  const cfOnly = CF_ONLY_ACTIONS.has(action);

  const tryCf = async (): Promise<string | null> =>
    callCloudflare(prompt, systemInstruction, image, action, maxTokens);
  const tryGemini = async (): Promise<string | null> => callGemini(prompt, systemInstruction, image);

  // Campus (priority AI): race both providers — lowest latency wins.
  if (priority) {
    const winner = await firstSuccessful([
      { promise: tryCf(), provider: "cloudflare" },
      { promise: tryGemini(), provider: "gemini" },
    ]);
    if (winner) return { text: winner.text, provider: winner.provider };
    if (premiumModel) {
      // Ultra: one more pass on the premium model before giving up.
      const retry = await tryGemini();
      if (retry) return { text: retry, provider: "gemini" };
    }
    return {
      text: `[${REGAL_AI_NAME} is temporarily unavailable. Please try again in a moment.]`,
      provider: "unavailable",
    };
  }

  // Ultra (premium model): premium model path first regardless of action size.
  if (premiumModel && !cfOnly) {
    const gemini = await tryGemini();
    if (gemini) return { text: gemini, provider: "gemini" };
    const cf = await tryCf();
    if (cf) return { text: cf, provider: "cloudflare" };
    return {
      text: `[${REGAL_AI_NAME} is temporarily unavailable. Please try again in a moment.]`,
      provider: "unavailable",
    };
  }

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
