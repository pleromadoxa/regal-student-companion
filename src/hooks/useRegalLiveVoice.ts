"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceActivityType, type LiveServerMessage, type Session } from "@google/genai";
import { askRegalAI } from "@/lib/regal-ai";
import { sanitizeAIContent } from "@/lib/format-ai-content";
import {
  arrayBufferToBase64,
  getSupportedRecorderMimeType,
  PcmAudioPlayer,
} from "@/lib/regal-live-audio";
import { LIVE_MODEL } from "@/lib/regal-live";
import { buildFallbackTutorContext } from "@/lib/regal-live-voice";
import { speakNaturally } from "@/lib/speech-voices";

export type VoiceLiveStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "thinking"
  | "error";

export type VoiceTranscript = {
  id: string;
  role: "user" | "ai";
  text: string;
  at: Date;
};

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type UseRegalLiveVoiceOptions = {
  subject: string;
  studentName?: string;
  onTranscript?: (entry: VoiceTranscript) => void;
};

export function useRegalLiveVoice({ subject, studentName, onTranscript }: UseRegalLiveVoiceOptions) {
  const [status, setStatus] = useState<VoiceLiveStatus>("idle");
  const [mode, setMode] = useState<"live" | "fallback" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState("");
  const [aiTranscript, setAiTranscript] = useState("");

  const sessionRef = useRef<Session | null>(null);
  const playerRef = useRef<PcmAudioPlayer | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const activeRef = useRef(false);
  const fallbackBusyRef = useRef(false);
  const inputBufferRef = useRef("");
  const outputBufferRef = useRef("");
  const subjectRef = useRef(subject);
  const studentFirstNameRef = useRef(studentName?.split(/\s+/)[0] ?? "there");
  subjectRef.current = subject;
  if (studentName) {
    studentFirstNameRef.current = studentName.split(/\s+/)[0] ?? studentFirstNameRef.current;
  }

  const pushTranscript = useCallback(
    (role: "user" | "ai", text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      onTranscript?.({
        id: crypto.randomUUID(),
        role,
        text: trimmed,
        at: new Date(),
      });
    },
    [onTranscript]
  );

  const flushInputTranscript = useCallback(() => {
    const text = inputBufferRef.current.trim();
    if (text) {
      pushTranscript("user", text);
      setUserTranscript(text);
    }
    inputBufferRef.current = "";
  }, [pushTranscript]);

  const flushOutputTranscript = useCallback(() => {
    const text = outputBufferRef.current.trim();
    if (text) {
      pushTranscript("ai", text);
      setAiTranscript(text);
    }
    outputBufferRef.current = "";
  }, [pushTranscript]);

  const stopMic = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const stopSession = useCallback(() => {
    activeRef.current = false;
    stopMic();
    sessionRef.current?.close();
    sessionRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setStatus("idle");
    setMode(null);
    setUserTranscript("");
    setAiTranscript("");
    inputBufferRef.current = "";
    outputBufferRef.current = "";
  }, [stopMic]);

  const handleLiveMessage = useCallback(
    (message: LiveServerMessage) => {
      const content = message.serverContent;
      if (!content) return;

      if (content.inputTranscription?.text) {
        inputBufferRef.current += content.inputTranscription.text;
        setUserTranscript(inputBufferRef.current);
        if (content.inputTranscription.finished) flushInputTranscript();
      }

      if (content.outputTranscription?.text) {
        outputBufferRef.current += content.outputTranscription.text;
        setAiTranscript(outputBufferRef.current);
        if (content.outputTranscription.finished) flushOutputTranscript();
      }

      if (content.modelTurn?.parts) {
        for (const part of content.modelTurn.parts) {
          if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("audio/")) {
            setStatus("speaking");
            playerRef.current?.enqueuePcmBase64(part.inlineData.data, part.inlineData.mimeType);
          }
          if (part.text) {
            outputBufferRef.current += part.text;
            setAiTranscript(outputBufferRef.current);
          }
        }
      }

      if (content.turnComplete) {
        flushOutputTranscript();
        if (activeRef.current) setStatus("listening");
      }

      if (message.voiceActivity?.voiceActivityType === VoiceActivityType.ACTIVITY_START) {
        setStatus("listening");
      }
      if (message.voiceActivity?.voiceActivityType === VoiceActivityType.ACTIVITY_END) {
        setStatus("thinking");
      }
    },
    [flushInputTranscript, flushOutputTranscript]
  );

  const startMicForLive = useCallback(async (session: Session) => {
    const mimeType = getSupportedRecorderMimeType();
    if (!mimeType) throw new Error("Microphone recording not supported in this browser");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    mediaStreamRef.current = stream;

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (!activeRef.current || event.data.size === 0) return;
      void event.data.arrayBuffer().then((buffer) => {
        session.sendRealtimeInput({
          audio: {
            data: arrayBufferToBase64(buffer),
            mimeType,
          },
        });
      });
    };

    recorder.start(250);
  }, []);

  const beginFallbackListeningRef = useRef<() => void>(() => {});

  beginFallbackListeningRef.current = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError("Voice input not supported — try Chrome or Edge");
      setStatus("error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      setUserTranscript((finalText || interim).trim());
      if (finalText.trim()) inputBufferRef.current = finalText.trim();
    };

    recognition.onerror = () => {
      if (activeRef.current && !fallbackBusyRef.current) {
        setTimeout(() => beginFallbackListeningRef.current(), 400);
      }
    };

    recognition.onend = () => {
      void (async () => {
        const question = inputBufferRef.current.trim();
        if (!activeRef.current || !question || fallbackBusyRef.current) {
          if (activeRef.current && !fallbackBusyRef.current) beginFallbackListeningRef.current();
          return;
        }

        fallbackBusyRef.current = true;
        pushTranscript("user", question);
        setStatus("thinking");
        setAiTranscript("");

        try {
          const raw = await askRegalAI({
            action: "tutor",
            question,
            text: buildFallbackTutorContext(
              subjectRef.current,
              studentFirstNameRef.current,
              question
            ),
            topic: subjectRef.current,
          });
          const reply = sanitizeAIContent(raw);
          outputBufferRef.current = reply;
          setAiTranscript(reply);
          pushTranscript("ai", reply);
          setStatus("speaking");

          await new Promise<void>((resolve) => {
            speakNaturally(reply, { rate: 0.94, pitch: 1.02, onEnd: resolve });
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Tutor unavailable");
          setStatus("error");
          fallbackBusyRef.current = false;
          return;
        }

        inputBufferRef.current = "";
        setUserTranscript("");
        fallbackBusyRef.current = false;

        if (activeRef.current) {
          setStatus("listening");
          beginFallbackListeningRef.current();
        }
      })();
    };

    setStatus("listening");
    recognition.start();
  };

  const start = useCallback(async () => {
    if (activeRef.current) return;
    setError(null);
    setStatus("connecting");
    activeRef.current = true;
    playerRef.current = new PcmAudioPlayer();
    await playerRef.current.resume();

    try {
      const res = await fetch("/api/regal-ai/live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, studentName: studentFirstNameRef.current }),
      });
      const data = (await res.json()) as {
        error?: string;
        token?: string;
        model?: string;
        studentFirstName?: string;
      };

      if (!res.ok) throw new Error(data.error ?? "Voice session failed");

      if (data.studentFirstName) {
        studentFirstNameRef.current = data.studentFirstName;
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: data.token as string,
        httpOptions: { apiVersion: "v1alpha" },
      });

      const session = await ai.live.connect({
        model: (data.model as string) ?? LIVE_MODEL,
        callbacks: {
          onopen: () => {
            setMode("live");
            setStatus("listening");
          },
          onmessage: handleLiveMessage,
          onerror: () => {
            if (activeRef.current) {
              setError("Live connection interrupted");
              setStatus("error");
            }
          },
          onclose: () => {
            if (activeRef.current) stopSession();
          },
        },
      });

      sessionRef.current = session;
      await startMicForLive(session);

      const name = studentFirstNameRef.current;
      const subj = subjectRef.current;
      session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [
              {
                text: `Hi! I'm ${name} and I'm ready for my ${subj} tutoring session.`,
              },
            ],
          },
        ],
        turnComplete: true,
      });
    } catch (liveError) {
      sessionRef.current?.close();
      sessionRef.current = null;
      playerRef.current?.close();
      playerRef.current = null;

      const message =
        liveError instanceof Error ? liveError.message : "Regal AI Live unavailable";
      setMode("fallback");
      setError(`${message} — using browser voice mode`);
      beginFallbackListeningRef.current();
    }
  }, [subject, handleLiveMessage, startMicForLive, stopSession]);

  const stop = useCallback(() => {
    stopSession();
  }, [stopSession]);

  useEffect(() => () => stopSession(), [stopSession]);

  const isActive = status !== "idle" && status !== "error";

  return {
    status,
    mode,
    error,
    userTranscript,
    aiTranscript,
    isActive,
    start,
    stop,
  };
}
