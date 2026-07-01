"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { askRegalAI } from "@/lib/regal-ai";
import { REGAL_AI_NAME } from "@/lib/regal-ai";
import { Button } from "@/components/ui/Button";
import { Textarea, Label, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";

export function RegalAIPanel({
  action,
  label = "Input",
  placeholder,
  extra,
  topicField,
}: {
  action: string;
  label?: string;
  placeholder?: string;
  extra?: Record<string, string>;
  topicField?: boolean;
}) {
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult("");
    try {
      const { text: res } = await askRegalAI({ action, text, topic, ...extra });
      setResult(res);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Regal AI error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <RegalAIBadge />
        <span className="text-xs text-muted">Ask {REGAL_AI_NAME}</span>
      </div>
      {topicField && (
        <div>
          <Label>Topic</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Subject or topic..." />
        </div>
      )}
      <div>
        <Label>{label}</Label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="min-h-[140px]" />
      </div>
      <Button onClick={run} disabled={loading || !text.trim()}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        Run {REGAL_AI_NAME}
      </Button>
      {result && (
        <Card>
          <pre className="whitespace-pre-wrap text-sm text-white/90 font-sans leading-relaxed">{result}</pre>
        </Card>
      )}
    </div>
  );
}

export function RegalAIChatPanel({ action = "tutor" }: { action?: string }) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const q = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const { text: res } = await askRegalAI({ action, question: q, text: q });
      setMessages((m) => [...m, { role: "ai", text: res }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", text: e instanceof Error ? e.message : "Error" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <p className="text-center text-muted text-sm py-12">Start a conversation with {REGAL_AI_NAME}</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === "user" ? "bg-regal-purple-500/30 text-white" : "bg-white/10 text-white/90"}`}>
              {m.role === "ai" && <RegalAIBadge className="mb-2" />}
              <pre className="whitespace-pre-wrap font-sans">{m.text}</pre>
            </div>
          </div>
        ))}
        {loading && <Loader2 className="w-5 h-5 animate-spin text-regal-pink mx-auto" />}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Ask ${REGAL_AI_NAME}...`} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()} />
        <Button onClick={send} disabled={loading}>Send</Button>
      </div>
    </div>
  );
}
