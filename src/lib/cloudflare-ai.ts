import { getCloudflareContext } from "@opennextjs/cloudflare";

export const DEFAULT_CF_AI_MODEL =
  process.env.CLOUDFLARE_AI_MODEL?.trim() || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export const CF_AI_FALLBACK_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AiRunOptions = { returnRawResponse?: boolean };

type AiBinding = {
  run: (
    model: string,
    input: Record<string, unknown>,
    options?: AiRunOptions
  ) => Promise<{ response?: string } | string | Response>;
};

function extractResponse(result: { response?: string } | string): string | null {
  if (typeof result === "string") return result.trim() || null;
  if (result && typeof result === "object" && typeof result.response === "string") {
    return result.response.trim() || null;
  }
  return null;
}

async function getAiBinding(): Promise<AiBinding | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const ai = (env as { AI?: AiBinding }).AI;
    return ai ?? null;
  } catch {
    return null;
  }
}

export async function cloudflareAiChat(
  messages: AiChatMessage[],
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string | null> {
  const ai = await getAiBinding();
  if (!ai) return null;

  const models = [options?.model ?? DEFAULT_CF_AI_MODEL, CF_AI_FALLBACK_MODEL];

  for (const model of models) {
    try {
      const result = await ai.run(model, {
        messages,
        max_tokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.5,
      });
      const text = extractResponse(result as { response?: string } | string);
      if (text) return text;
    } catch (err) {
      console.error(`[cloudflare-ai] ${model} failed`, err);
    }
  }

  return null;
}

const VISION_MODEL = "@cf/llava-hf/llava-1.5-7b-hf";

function parseVisionResult(result: unknown): string | null {
  if (!result) return null;
  if (typeof result === "string") return result.trim() || null;
  if (typeof result === "object" && result !== null) {
    const obj = result as { description?: string; response?: string };
    if (typeof obj.description === "string") return obj.description.trim() || null;
    if (typeof obj.response === "string") return obj.response.trim() || null;
  }
  return null;
}

export async function cloudflareAiVision(
  buffer: ArrayBuffer,
  prompt: string
): Promise<string | null> {
  const ai = await getAiBinding();
  if (!ai) return null;

  const image = [...new Uint8Array(buffer)];
  const trimmedPrompt =
    prompt.trim().slice(0, 1200) ||
    "Describe this image in detail, including any visible text and important details.";

  try {
    const result = await ai.run(VISION_MODEL, {
      image,
      prompt: trimmedPrompt,
      max_tokens: 768,
    });
    return parseVisionResult(result);
  } catch (err) {
    console.error("[cloudflare-ai] vision failed", err);
    return null;
  }
}

export async function getCompanionR2(): Promise<R2Bucket | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as { COMPANION_FILES?: R2Bucket }).COMPANION_FILES ?? null;
  } catch {
    return null;
  }
}
