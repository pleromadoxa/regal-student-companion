import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runRegalAI } from "@/lib/regal-ai-router";
import { regalSystemInstruction } from "@/lib/regal-ai-system";
import { sanitizeAIContent } from "@/lib/format-ai-content";
import { clientIp, rateLimitMemory } from "@/lib/security";
import { checkAiUsage, incrementAiUsage } from "@/lib/subscription";

type Body = {
  circleId?: string;
  prompt?: string;
  context?: string;
  mode?: "chat" | "summarize_last" | "quiz" | "explain";
  inCall?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!rateLimitMemory(`circle-ai:${user.id}:${clientIp(request)}`, 20, 60_000)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body?.circleId || !body.prompt?.trim()) {
      return NextResponse.json({ error: "circleId and prompt required" }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from("companion_circle_members")
      .select("user_id")
      .eq("circle_id", body.circleId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this circle" }, { status: 403 });
    }

    const usage = await checkAiUsage(supabase, user.id);
    if (!usage.ok) {
      return NextResponse.json(
        { error: usage.error, upgradeRequired: usage.upgradeRequired },
        { status: 429 }
      );
    }

    const { data: circle } = await supabase
      .from("companion_study_circles")
      .select("name, subject, description")
      .eq("id", body.circleId)
      .single();

    const { data: recent } = await supabase
      .from("companion_circle_messages")
      .select("content, is_ai, created_at, user_id")
      .eq("circle_id", body.circleId)
      .order("created_at", { ascending: false })
      .limit(10);

    const transcript = (recent ?? [])
      .slice()
      .reverse()
      .map((m) => {
        const author = m.is_ai ? "Regal AI" : "Student";
        return `${author}: ${m.content}`;
      })
      .join("\n");

    const mode = body.mode ?? "chat";
    const persona = body.inCall
      ? "You are Regal AI joining a live study call. Keep responses short, spoken, warm, and pointed."
      : "You are Regal AI participating in a Regal Student Companion study circle chat. Be a helpful study partner: concise, encouraging, and specific.";

    const system = regalSystemInstruction(persona);

    const contextBlock = [
      circle?.name && `Circle: ${circle.name}`,
      circle?.subject && `Subject: ${circle.subject}`,
      circle?.description && `Focus: ${circle.description}`,
      transcript && `Recent chat:\n${transcript}`,
      body.context && `Extra context:\n${body.context}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const modeInstruction: Record<string, string> = {
      chat: "Answer the student and keep it under 180 words. Use short markdown when helpful.",
      summarize_last: "Summarize the recent chat in 4-6 bullet points, ending with the next best action.",
      quiz: "Generate 3 quick review questions with answers hidden after each (mark as **Answer:**).",
      explain: "Explain the concept clearly with an example a student would remember.",
    };

    const prompt = `${contextBlock}\n\nStudent asked: ${body.prompt}\n\n${modeInstruction[mode]}`;

    const run = await runRegalAI("mentor_chat", prompt, system);
    if (!run?.text) {
      return NextResponse.json({ error: "Regal AI unavailable" }, { status: 503 });
    }
    const text = sanitizeAIContent(run.text);

    const { data: inserted, error } = await supabase
      .from("companion_circle_messages")
      .insert({
        circle_id: body.circleId,
        user_id: user.id,
        content: text,
        is_ai: true,
        metadata: { mode, provider: run.provider, in_call: body.inCall ?? false },
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await Promise.all([
      incrementAiUsage(supabase, user.id),
      supabase.rpc("companion_log_activity", {
        p_action: "circle_ai_chat",
        p_category: "ai",
        p_label: body.inCall ? "Regal AI in study call" : "Regal AI in study circle",
        p_metadata: { circle_id: body.circleId, mode },
        p_points_delta: 2,
        p_path: "/study-circles",
      }),
    ]);

    return NextResponse.json({ message: inserted, aiRemaining: usage.remaining - 1 });
  } catch (err) {
    console.error("[circle-ai]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to run Regal AI" },
      { status: 500 }
    );
  }
}
