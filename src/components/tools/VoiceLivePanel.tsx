"use client";

import { Mic, MicOff, Radio, Sparkles, Volume2 } from "lucide-react";
import { REGAL_AI_NAME } from "@/lib/regal-ai";
import { useRegalLiveVoice, type VoiceTranscript } from "@/hooks/useRegalLiveVoice";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  idle: "Tap to start a live voice session",
  connecting: "Connecting to Regal Live…",
  listening: "Listening — speak naturally",
  thinking: `${REGAL_AI_NAME} is thinking…`,
  speaking: `${REGAL_AI_NAME} is speaking`,
  error: "Session ended",
} as const;

function VoiceOrb({ status }: { status: keyof typeof STATUS_LABELS }) {
  const active = status === "listening" || status === "speaking" || status === "thinking";

  return (
    <div className="relative flex items-center justify-center w-36 h-36 mx-auto">
      {active && (
        <>
          <span
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-20",
              status === "listening" && "bg-emerald-400",
              status === "thinking" && "bg-regal-purple-400",
              status === "speaking" && "bg-regal-pink"
            )}
          />
          <span
            className={cn(
              "absolute inset-2 rounded-full animate-pulse opacity-30",
              status === "listening" && "bg-emerald-400/60",
              status === "thinking" && "bg-regal-purple-400/60",
              status === "speaking" && "bg-regal-pink/60"
            )}
          />
        </>
      )}
      <div
        className={cn(
          "relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500",
          status === "idle" && "bg-gradient-to-br from-regal-purple-600 to-regal-pink",
          status === "connecting" && "bg-gradient-to-br from-regal-purple-500 to-indigo-600 animate-pulse",
          status === "listening" && "bg-gradient-to-br from-emerald-400 to-teal-600 scale-105",
          status === "thinking" && "bg-gradient-to-br from-regal-purple-500 to-violet-700",
          status === "speaking" && "bg-gradient-to-br from-regal-pink to-regal-purple-600 scale-105",
          status === "error" && "bg-gradient-to-br from-rose-600 to-regal-purple-800"
        )}
      >
        {status === "speaking" ? (
          <Volume2 className="w-10 h-10 text-white" />
        ) : status === "listening" ? (
          <Mic className="w-10 h-10 text-white" />
        ) : (
          <Radio className="w-10 h-10 text-white" />
        )}
      </div>
    </div>
  );
}

type VoiceLivePanelProps = {
  subject: string;
  onTranscript?: (entry: VoiceTranscript) => void;
};

export function VoiceLivePanel({ subject, onTranscript }: VoiceLivePanelProps) {
  const { status, mode, error, userTranscript, aiTranscript, isActive, start, stop } =
    useRegalLiveVoice({ subject, onTranscript });

  return (
    <div className="rounded-2xl border border-regal-purple-400/25 bg-gradient-to-b from-regal-purple-500/10 via-transparent to-regal-pink/5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg regal-ai-gradient">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Regal Live Voice</p>
            <p className="text-[10px] text-muted">
              {mode === "live"
                ? "Gemini Live · real-time audio"
                : mode === "fallback"
                  ? "Browser voice · speak & listen"
                  : "Like Gemini Live — talk to your tutor"}
            </p>
          </div>
        </div>
        {isActive && (
          <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/20">
            Live
          </span>
        )}
      </div>

      <VoiceOrb status={status} />

      <p className="text-center text-sm text-white/80 mt-4 mb-1 font-medium">
        {STATUS_LABELS[status]}
      </p>
      <p className="text-center text-[11px] text-muted mb-5">
        Subject: {subject} · hands-free tutoring
      </p>

      {(userTranscript || aiTranscript) && (
        <div className="space-y-2 mb-5 max-h-32 overflow-y-auto rounded-xl bg-black/25 border border-white/8 p-3">
          {userTranscript && (
            <p className="text-xs text-white/70">
              <span className="text-emerald-400 font-semibold">You: </span>
              {userTranscript}
            </p>
          )}
          {aiTranscript && (
            <p className="text-xs text-white/80">
              <span className="text-regal-pink font-semibold">{REGAL_AI_NAME}: </span>
              {aiTranscript}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-amber-300/90 text-center mb-4 px-2">{error}</p>
      )}

      <div className="flex justify-center">
        {!isActive ? (
          <Button
            onClick={() => void start()}
            disabled={status === "connecting"}
            className="gap-2 min-w-[180px]"
          >
            <Mic className="w-4 h-4" />
            {status === "connecting" ? "Connecting…" : "Start Live Voice"}
          </Button>
        ) : (
          <Button variant="secondary" onClick={stop} className="gap-2 min-w-[180px]">
            <MicOff className="w-4 h-4" />
            End Session
          </Button>
        )}
      </div>
    </div>
  );
}
