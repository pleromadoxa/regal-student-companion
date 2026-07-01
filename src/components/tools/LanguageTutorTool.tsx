"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Trash2,
  Languages,
  SpellCheck,
  BookOpen,
  MessageCircle,
  Globe,
  MessagesSquare,
} from "lucide-react";
import { askRegalAI } from "@/lib/regal-ai";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea, Label, Select } from "@/components/ui/Input";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import {
  ToolShell,
  ToolStat,
  ToolSection,
  ToolEmpty,
} from "./shared";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Japanese",
  "Korean",
  "Mandarin Chinese",
  "Arabic",
  "Russian",
  "Hindi",
  "Dutch",
] as const;

const MODES = [
  {
    id: "translate",
    label: "Translate",
    icon: Languages,
    placeholder: "Type text to translate to or from your target language…",
    hint: "Bidirectional translation with notes on nuance and usage.",
  },
  {
    id: "grammar",
    label: "Grammar",
    icon: SpellCheck,
    placeholder: "Paste a sentence for grammar and phrasing feedback…",
    hint: "Corrections, explanations, and a polished rewrite.",
  },
  {
    id: "vocabulary",
    label: "Vocabulary",
    icon: BookOpen,
    placeholder: "Ask for words on a topic, or paste text to extract vocab…",
    hint: "Words with definitions, examples, and memory tips.",
  },
  {
    id: "conversation",
    label: "Conversation",
    icon: MessageCircle,
    placeholder: "Reply in your target language — Regal AI will keep the dialogue going…",
    hint: "Natural dialogue with gentle corrections when needed.",
  },
] as const;

type TutorMode = (typeof MODES)[number]["id"];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  mode: TutorMode;
};

const QUICK_PROMPTS: Record<TutorMode, { label: string; text: string }[]> = {
  translate: [
    { label: "Correct my sentence", text: "Please correct this sentence and explain the fix:" },
    { label: "How do I say…", text: "How do I say the following in natural, everyday speech?" },
  ],
  grammar: [
    { label: "Correct my sentence", text: "Correct my sentence and explain each grammar mistake:" },
    { label: "Is this natural?", text: "Does this sound natural to a native speaker? Suggest improvements:" },
  ],
  vocabulary: [
    { label: "Give 5 vocab words", text: "Give me 5 useful vocabulary words for everyday conversation with definitions and example sentences." },
    { label: "Topic drill", text: "Teach me 5 essential words related to school and studying." },
  ],
  conversation: [
    { label: "Start a dialogue", text: "Let's practice a casual conversation — introduce yourself and ask me a question." },
    { label: "Give 5 vocab words", text: "Before we chat, give me 5 useful words I can use in conversation today." },
  ],
};

function MessageBubble({
  message,
  onCopy,
}: {
  message: ChatMessage;
  onCopy: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await onCopy(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-regal-purple-500/30 text-white border border-regal-purple-400/20"
            : "bg-white/[0.06] text-white/90 border border-white/10"
        )}
      >
        {!isUser && (
          <div className="flex items-center justify-between gap-2 mb-2">
            <RegalAIBadge />
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded-lg text-muted hover:text-white transition-colors"
              aria-label="Copy response"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
        <pre className="whitespace-pre-wrap font-sans leading-relaxed">{message.text}</pre>
        <p className="text-[10px] text-muted mt-2 uppercase tracking-wider">
          {MODES.find((m) => m.id === message.mode)?.label ?? message.mode}
        </p>
      </div>
    </div>
  );
}

export function LanguageTutorTool() {
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>("Spanish");
  const [mode, setMode] = useState<TutorMode>("translate");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeMode = MODES.find((m) => m.id === mode)!;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const buildContext = useCallback(
    (nextMessages: ChatMessage[]) => {
      const recent = nextMessages
        .filter((m) => m.mode === mode)
        .slice(-8)
        .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.text}`)
        .join("\n");
      return recent ? `Conversation so far:\n${recent}\n\n` : "";
    },
    [mode]
  );

  const send = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || loading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text,
        mode,
      };
      const withUser = [...messages, userMsg];
      setMessages(withUser);
      setInput("");
      setLoading(true);

      try {
        const context = mode === "conversation" ? buildContext(withUser) : "";
        const res = await askRegalAI({
          action: "language",
          language,
          mode,
          text: `${context}${text}`,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: res,
            mode,
          },
        ]);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: e instanceof Error ? e.message : "Regal AI error",
            mode,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, mode, language, buildContext]
  );

  const runQuickPrompt = (prompt: { label: string; text: string }) => {
    setInput(prompt.text);
    void send(prompt.text);
  };

  const clearSession = () => {
    setMessages([]);
    setInput("");
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const userTurns = messages.filter((m) => m.role === "user").length;

  return (
    <ToolShell
      stats={
        <>
          <ToolStat label="Language" value={language} icon={Globe} accent="purple" />
          <ToolStat label="Mode" value={activeMode.label} icon={activeMode.icon} accent="pink" />
          <ToolStat label="Messages" value={messages.length} icon={MessagesSquare} accent="emerald" />
          <ToolStat label="Your turns" value={userTurns} icon={Sparkles} accent="amber" />
        </>
      }
      sidebar={
        <Card className="border-regal-purple-400/15">
          <h3 className="text-sm font-bold text-white mb-2">{activeMode.label} mode</h3>
          <p className="text-xs text-muted leading-relaxed">{activeMode.hint}</p>
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
              Tips
            </p>
            <ul className="text-xs text-muted space-y-1.5 list-disc pl-4">
              <li>Switch modes anytime — your session stays in the chat.</li>
              <li>Use quick prompts for common study tasks.</li>
              <li>Copy any Regal AI reply with one click.</li>
            </ul>
          </div>
        </Card>
      }
    >
      <Card className="border-regal-purple-400/20">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <RegalAIBadge />
          <span className="text-xs text-muted">
            Enterprise language tutor powered by Regal AI
          </span>
        </div>

        <div className="grid sm:grid-cols-[1fr_200px] gap-4 mb-5">
          <div>
            <Label>Target language</Label>
            <Select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value as (typeof LANGUAGES)[number])
              }
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="secondary"
              className="w-full"
              onClick={clearSession}
              disabled={messages.length === 0 && !input.trim()}
            >
              <Trash2 className="w-4 h-4" />
              Clear session
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/8 mb-5">
          {MODES.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={cn(
                "flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
                mode === tab.id
                  ? "bg-regal-purple-500/30 text-white border border-regal-purple-400/30"
                  : "text-muted hover:text-white border border-transparent"
              )}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        <ToolSection title="Session" description={activeMode.hint}>
          <Card className="p-0 overflow-hidden border-white/10">
            <div
              ref={scrollRef}
              className="h-[360px] overflow-y-auto overscroll-contain p-4 space-y-3"
            >
              {messages.length === 0 ? (
                <ToolEmpty
                  icon={activeMode.icon}
                  title="Start your session"
                  description={`Choose a quick prompt or type below to practice ${language} in ${activeMode.label.toLowerCase()} mode.`}
                />
              ) : (
                messages.map((m) => (
                  <MessageBubble key={m.id} message={m} onCopy={copyText} />
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10">
                    <Loader2 className="w-5 h-5 animate-spin text-regal-pink" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-4 space-y-3 bg-white/[0.02]">
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS[mode].map((prompt) => (
                  <button
                    key={prompt.label}
                    type="button"
                    disabled={loading}
                    onClick={() => runQuickPrompt(prompt)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/8 text-muted hover:text-white hover:border-regal-purple-400/30 transition-colors disabled:opacity-50"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>

              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeMode.placeholder}
                className="min-h-[88px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />

              <div className="flex justify-end">
                <Button onClick={() => send()} disabled={loading || !input.trim()}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Ask Regal AI
                </Button>
              </div>
            </div>
          </Card>
        </ToolSection>
      </Card>
    </ToolShell>
  );
}
