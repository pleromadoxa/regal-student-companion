import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai/node";
import { createClient } from "@/lib/supabase/server";
import { REGAL_AI_NAME } from "@/lib/regal-ai";
import {
  REGAL_LIVE_VOICE,
  buildLiveTutorInstruction,
  getStudentFirstName,
} from "@/lib/regal-live-voice";
import { LIVE_MODEL } from "@/lib/regal-live";
import { checkVoiceUsage, incrementVoiceUsage } from "@/lib/subscription";
import { clientIp, rateLimitMemory } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!rateLimitMemory(`live-token:${user.id}:${clientIp(request)}`, 10, 60_000)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: `${REGAL_AI_NAME} voice requires GEMINI_API_KEY` },
        { status: 503 }
      );
    }

    const voiceUsage = await checkVoiceUsage(supabase, user.id);
    if (!voiceUsage.ok) {
      return NextResponse.json(
        { error: voiceUsage.error, upgradeRequired: voiceUsage.upgradeRequired },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      subject?: string;
      studentName?: string;
    };
    const subject = typeof body.subject === "string" ? body.subject : "Math";

    const { data: profile } = await supabase
      .from("companion_profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const studentFirstName = getStudentFirstName(
      body.studentName ?? profile?.display_name,
      profile?.email ?? user.email
    );

    const client = new GoogleGenAI({ apiKey });
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = await client.authTokens.create({
      config: {
        expireTime,
        newSessionExpireTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        uses: 1,
        httpOptions: { apiVersion: "v1alpha" },
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: REGAL_LIVE_VOICE },
              },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: {
              parts: [
                {
                  text: buildLiveTutorInstruction(subject, studentFirstName),
                },
              ],
            },
          },
        },
      },
    });

    if (!token.name) {
      return NextResponse.json({ error: "Failed to create voice session token" }, { status: 500 });
    }

    await incrementVoiceUsage(supabase, user.id);

    return NextResponse.json({
      token: token.name,
      model: LIVE_MODEL,
      voiceRemaining: voiceUsage.remaining - 1,
      studentFirstName,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Voice session unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
