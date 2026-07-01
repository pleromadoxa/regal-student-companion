"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Send,
  Trash2,
  Crown,
  Loader2,
  Sparkles,
  Check,
  Copy,
  Lightbulb,
  Target,
  BookOpen,
  Flame,
  Trophy,
  CheckSquare,
  Timer,
} from "lucide-react";
import { askRegalAI, REGAL_AI_NAME } from "@/lib/regal-ai";
import { sanitizeAIContent } from "@/lib/format-ai-content";
import { PageHeader, StatCard } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { cn } from "@/lib/utils";

type Message = { id: string; role: "user" | "ai"; text: string; at: string };

const PROMPT_GROUPS: { label: string; prompts: string[] }[] = [
  {
    label: "Today",
    prompts: [
      "What should I focus on today based on my stats?",
      "Give me a 2-hour study block plan for right now",
    ],
  },
  {
    label: "Exams",
    prompts: [
      "Help me build a revision plan for this week",
      "What's the best way to prepare for multiple exams?",
    ],
  },
  {
    label: "Skills",
    prompts: [
      "Review my study habits and suggest improvements",
      "How can I write stronger academic arguments?",
      "How do I balance part-time work and studying?",
    ],
  },
];

export function RegalMentorClient({
  userId,
  displayName,
  major,
  engagementPoints,
  focusMinutes,
  streak,
  openTasks,
  focusSessions,
}: {
  userId: string;
  displayName: string;
  major: string | null;
  engagementPoints: number;
  focusMinutes: number;
  streak: number;
  openTasks: number;
  focusSessions: number;
}) {
  const storageKey = `regal-mentor-${userId}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstName = displayName.split(" ")[0];

  const contextBlock = [
    `Student: ${displayName}`,
    major && `Major: ${major}`,
    `Engagement: ${engagementPoints} pts`,
    `Focus minutes: ${focusMinutes}`,
    `Streak: ${streak} days`,
    `Open tasks: ${openTasks}`,
    `Focus sessions completed: ${focusSessions}`,
  ]
    .filter(Boolean)
    .join("\n");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setMessages(JSON.parse(raw));
    } catch {
      /* */
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        text: text.trim(),
        at: new Date().toISOString(),
      };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setLoading(true);
      try {
        const history = [...messages, userMsg]
          .slice(-10)
          .map((m) => `${m.role === "user" ? "Student" : "Mentor"}: ${m.text}`)
          .join("\n\n");
        const { text: raw } = await askRegalAI({
          action: "mentor_chat",
          question: text.trim(),
          text: `${contextBlock}\n\nConversation:\n${history}`,
        });
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "ai",
            text: sanitizeAIContent(raw),
            at: new Date().toISOString(),
          },
        ]);
      } catch (e) {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "ai",
            text: e instanceof Error ? e.message : "Mentor unavailable — try again.",
            at: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, contextBlock]
  );

  return (
    <div className="page-enter max-w-5xl mx-auto">
      <PageHeader
        title="Regal Mentor"
        description={`Your personal ${REGAL_AI_NAME} academic coach — context-aware guidance powered by your profile, streak, tasks, and focus history.`}
        regalAI
        action={
          <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setShowSidebar(!showSidebar)}>
            Context
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Streak" value={`${streak}d`} icon={Flame} accent="amber" href="/focus" />
        <StatCard label="Focus min" value={focusMinutes} icon={Timer} accent="purple" href="/focus" />
        <StatCard label="Open tasks" value={openTasks} icon={CheckSquare} accent="emerald" href="/tasks" />
        <StatCard label="Points" value={engagementPoints} icon={Trophy} accent="pink" href="/leaderboard" />
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-6">
        <Card className="flex flex-col min-h-[520px] border-regal-purple-400/20 p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8 bg-gradient-to-r from-regal-purple-500/10 to-regal-pink/5 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-400 to-regal-purple-600">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Live mentor session</p>
              <p className="text-[10px] text-muted">Knows your stats · remembers this chat</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[360px] max-h-[55vh]">
            {messages.length === 0 && (
              <div className="text-center py-12 px-4">
                <Crown className="w-10 h-10 text-regal-purple-400/50 mx-auto mb-3" />
                <p className="text-sm text-white/70 font-medium">
                  Hi {firstName} — I&apos;m your Regal Mentor.
                </p>
                <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                  Ask about studying, exams, essays, time management, or your academic path. I see your streak, tasks, and focus history.
                </p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm group relative",
                    m.role === "user"
                      ? "bg-regal-purple-500/25 text-white"
                      : "bg-white/[0.06] text-white/90 border border-white/8"
                  )}
                >
                  {m.role === "ai" && <RegalAIBadge className="mb-1.5 scale-90 origin-left" />}
                  {m.role === "ai" ? (
                    <MarkdownContent content={m.text} className="text-sm prose-invert max-w-none" />
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  )}
                  {m.role === "ai" && (
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(m.text);
                        setCopied(m.id);
                        setTimeout(() => setCopied(null), 2000);
                      }}
                      className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded text-white/40 hover:text-white"
                    >
                      {copied === m.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.06] rounded-2xl px-4 py-3 border border-white/8 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-regal-purple-400" />
                  <span className="text-xs text-muted">Regal Mentor is thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-white/8 bg-black/20">
            <div className="flex gap-2">
              <Textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Ask your mentor anything..."
                className="resize-none text-sm"
              />
              <Button onClick={() => send(input)} disabled={loading || !input.trim()} className="shrink-0 self-end">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        <aside className={cn("space-y-4", !showSidebar && "hidden lg:block")}>
          <Card className="p-4 space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">Your context</p>
            <div className="space-y-2 text-xs text-muted">
              <p className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-orange-400" /> {streak} day streak</p>
              <p className="flex items-center gap-2"><Target className="w-3.5 h-3.5 text-emerald-400" /> {focusMinutes} focus min</p>
              <p className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-regal-pink" /> {engagementPoints} pts</p>
              <p className="flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5 text-sky-400" /> {openTasks} open tasks</p>
              {major && <p className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-sky-400" /> {major}</p>}
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              <Link href="/tasks" className="text-[10px] text-regal-purple-300 hover:text-white">Tasks →</Link>
              <Link href="/leaderboard" className="text-[10px] text-regal-purple-300 hover:text-white">Leaderboard →</Link>
              <Link href="/exam-prep" className="text-[10px] text-regal-purple-300 hover:text-white">Exam prep →</Link>
            </div>
          </Card>
          {PROMPT_GROUPS.map((group) => (
            <Card key={group.label} className="p-4">
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-300" /> {group.label}
              </p>
              <div className="space-y-1.5">
                {group.prompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => send(p)}
                    disabled={loading}
                    className="w-full text-left text-[11px] text-white/50 hover:text-white hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Card>
          ))}
          {messages.length > 0 && (
            <Button variant="secondary" size="sm" className="w-full" onClick={() => setMessages([])}>
              <Trash2 className="w-3.5 h-3.5" /> Clear chat
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
