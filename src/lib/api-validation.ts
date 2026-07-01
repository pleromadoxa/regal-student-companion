import { z } from "zod";
import { REGAL_AI_ACTIONS } from "@/lib/regal-ai";

const regalAiActions = Object.values(REGAL_AI_ACTIONS) as [string, ...string[]];

export const regalAiBodySchema = z.object({
  action: z.enum(regalAiActions),
  text: z.string().max(120_000).optional(),
  style: z.string().max(64).optional(),
  topic: z.string().max(2_000).optional(),
  sources: z.string().max(120_000).optional(),
  question: z.string().max(8_000).optional(),
  language: z.string().max(64).optional(),
  subject: z.string().max(256).optional(),
  difficulty: z.string().max(64).optional(),
  mode: z.string().max(64).optional(),
  count: z.number().int().min(1).max(100).optional(),
  imageBase64: z.string().max(8_000_000).optional(),
  imageMimeType: z.string().max(64).optional(),
});

export type RegalAiBody = z.infer<typeof regalAiBodySchema>;
