"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Copy,
  Check,
  Trash2,
  Download,
  Sigma,
  FlaskConical,
  PenLine,
  Landmark,
  MessageCircle,
  Mic,
  MessageSquare,
} from "lucide-react";
import { VoiceLivePanel } from "@/components/tools/VoiceLivePanel";
import type { VoiceTranscript } from "@/hooks/useRegalLiveVoice";
import { askRegalAI, REGAL_AI_NAME } from "@/lib/regal-ai";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { cn } from "@/lib/utils";

const SUBJECTS = ["Math", "Science", "Writing", "History"] as const;
type Subject = (typeof SUBJECTS)[number];

const SUBJECT_ICONS: Record<Subject, React.ComponentType<{ className?: string }>> = {
  Math: Sigma,
  Science: FlaskConical,
  Writing: PenLine,
  History: Landmark,
};

const STARTER_QUESTIONS: Record<Subject, string[]> = {
  Math: [
    "How do I solve quadratic equations by factoring?",
    "Explain the difference between mean, median, and mode",
    "What is the chain rule in calculus?",
  ],
  Science: [
    "How does photosynthesis work step by step?",
    "Explain Newton's three laws of motion",
    "What is the difference between DNA and RNA?",
  ],
  Writing: [
    "How do I write a strong thesis statement?",
    "What's the difference between MLA and APA citation?",
    "How can I improve my essay introductions?",
  ],
  History: [
    "What caused World War I?",
    "Explain the causes of the American Civil War",
    "How did the Industrial Revolution change society?",
  ],
};

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  at: Date;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] p-3 rounded-2xl bg-white/10 text-white/90">
        <RegalAIBadge className="mb-2" />
        <div className="flex items-center gap-1.5 py-1">
          <span className="w-2 h-2 rounded-full bg-regal-pink/80 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-regal-pink/80 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-regal-pink/80 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onCopy,
  copiedId,
}: {
  message: Message;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex group", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[85%] p-3 rounded-2xl text-sm",
          isUser
            ? "bg-regal-purple-500/30 text-white"
            : "bg-white/10 text-white/90"
        )}
      >
        {!isUser && <RegalAIBadge className="mb-2" />}
        <pre className="whitespace-pre-wrap font-sans leading-relaxed">{message.text}</pre>
        <div
          className={cn(
            "flex items-center gap-2 mt-2 pt-2 border-t border-white/10",
            isUser ? "justify-end" : "justify-between"
          )}
        >
          <span className="text-[10px] text-muted tabular-nums">{formatTime(message.at)}</span>
          <button
            type="button"
            onClick={() => onCopy(message.id, message.text)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/10 text-muted hover:text-white"
            aria-label="Copy message"
          >
            {copiedId === message.id ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

type SessionMode = "chat" | "live";

export function TutorTool() {
  const [subject, setSubject] = useState<Subject>("Math");
  const [sessionMode, setSessionMode] = useState<SessionMode>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const appendVoiceTranscript = useCallback((entry: VoiceTranscript) => {
    setMessages((m) => [
      ...m,
      { id: entry.id, role: entry.role, text: entry.text, at: entry.at },
    ]);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (text?: string) => {
      const q = (text ?? input).trim();
      if (!q || loading) return;
      setInput("");

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        text: q,
        at: new Date(),
      };
      setMessages((m) => [...m, userMsg]);
      setLoading(true);

      try {
        const res = await askRegalAI({
          action: "tutor",
          question: q,
          text: `Subject: ${subject}\n\n${q}`,
          topic: subject,
        });
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "ai", text: res, at: new Date() },
        ]);
      } catch (e) {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "ai",
            text: e instanceof Error ? e.message : "Something went wrong. Please try again.",
            at: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, subject]
  );

  const copyMessage = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearConversation = () => {
    setMessages([]);
    setInput("");
  };

  const exportChat = () => {
    if (messages.length === 0) return;
    const lines = messages.map(
      (m) =>
        `[${m.at.toLocaleString()}] ${m.role === "user" ? "You" : REGAL_AI_NAME} (${subject}):\n${m.text}`
    );
    const blob = new Blob([`Regal AI Tutor — ${subject}\n${"=".repeat(40)}\n\n${lines.join("\n\n")}`], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `regal-tutor-${subject.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6 items-stretch min-h-[calc(100vh-280px)]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Card className="border-regal-purple-400/15">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-4 h-4 text-regal-pink" />
            <h3 className="text-sm font-bold text-white">Topics</h3>
          </div>
          <nav className="space-y-2">
            {SUBJECTS.map((s) => {
              const Icon = SUBJECT_ICONS[s];
              const active = subject === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubject(s)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors",
                    active
                      ? "bg-regal-purple-500/15 border-regal-purple-400/40 text-white"
                      : "bg-white/[0.03] border-white/8 text-muted hover:border-regal-purple-400/25 hover:text-white"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      active ? "regal-ai-gradient" : "bg-white/10"
                    )}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">{s}</span>
                </button>
              );
            })}
          </nav>
          <p className="text-[11px] text-muted mt-4 leading-relaxed">
            Switch topics anytime — {REGAL_AI_NAME} adapts to your subject.
          </p>
        </Card>
      </aside>

      <Card className="border-regal-purple-400/20 flex flex-col min-h-[560px] lg:min-h-[calc(100vh-280px)] p-0 overflow-hidden">
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <RegalAIBadge />
              <span className="text-xs text-muted">Your 24/7 academic tutor</span>
            </div>
            <div className="flex rounded-xl border border-white/10 p-0.5 bg-black/20">
              <button
                type="button"
                onClick={() => setSessionMode("chat")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  sessionMode === "chat"
                    ? "bg-regal-purple-500/25 text-white"
                    : "text-muted hover:text-white"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
              </button>
              <button
                type="button"
                onClick={() => setSessionMode("live")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  sessionMode === "live"
                    ? "bg-regal-pink/20 text-white"
                    : "text-muted hover:text-white"
                )}
              >
                <Mic className="w-3.5 h-3.5" />
                Live Voice
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversation}
                disabled={messages.length === 0}
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exportChat}
                disabled={messages.length === 0}
              >
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
            </div>
          </div>
          <div className="mt-4 max-w-xs">
            <Label>Subject</Label>
            <Select
              value={subject}
              onChange={(e) => setSubject(e.target.value as Subject)}
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {sessionMode === "live" ? (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <VoiceLivePanel subject={subject} onTranscript={appendVoiceTranscript} />
            {messages.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-white/8">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  Session transcript
                </p>
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    onCopy={copyMessage}
                    copiedId={copiedId}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
              {messages.length === 0 && !loading && (
                <div className="text-center py-8">
                  <p className="text-muted text-sm mb-1">
                    Start a {subject.toLowerCase()} session with {REGAL_AI_NAME}
                  </p>
                  <p className="text-xs text-muted/80">
                    Ask anything — concepts, homework help, or exam prep
                  </p>
                </div>
              )}

              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onCopy={copyMessage}
                  copiedId={copiedId}
                />
              ))}

              {loading && <TypingIndicator />}
            </div>

            {messages.length === 0 && (
              <div className="shrink-0 px-5 pb-3">
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
                  Suggested questions
                </p>
                <div className="flex flex-wrap gap-2">
                  {STARTER_QUESTIONS[subject].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      disabled={loading}
                      className="text-left text-xs px-3 py-2 rounded-xl bg-white/[0.04] border border-white/8 text-muted hover:text-white hover:border-regal-purple-400/30 transition-colors max-w-full"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="shrink-0 px-5 pb-5 pt-3 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask about ${subject.toLowerCase()}…`}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                  disabled={loading}
                  className="flex-1"
                />
                <Button onClick={() => send()} disabled={loading || !input.trim()}>
                  <Send className="w-4 h-4" />
                  Send
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
