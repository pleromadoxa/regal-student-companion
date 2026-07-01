"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Sparkles,
  Loader2,
  History,
  Trophy,
  Target,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
  HelpCircle,
  BookOpen,
  Eye,
} from "lucide-react";
import { askRegalAI } from "@/lib/regal-ai";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea, Label, Select } from "@/components/ui/Input";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { cn } from "@/lib/utils";
import { ToolShell, ToolStat, ToolSection, ToolEmpty } from "./shared";

const QUESTION_COUNTS = [5, 10, 15] as const;
const HISTORY_KEY = "regal-quiz-history";

type QuestionCount = (typeof QUESTION_COUNTS)[number];

type QuizQuestion = {
  id: string;
  question: string;
  answer: string;
};

type QuizHistoryEntry = {
  id: string;
  materialPreview: string;
  questionCount: number;
  score: number;
  total: number;
  at: string;
};

type Phase = "setup" | "quiz" | "results";

function loadHistory(): QuizHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as QuizHistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: QuizHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 20)));
  } catch {
    /* quota */
  }
}

function parseQuizResponse(raw: string): QuizQuestion[] {
  const trimmed = raw.trim();

  const tryParse = (text: string): QuizQuestion[] | null => {
    try {
      const parsed = JSON.parse(text) as { question: string; answer: string }[];
      if (!Array.isArray(parsed)) return null;
      return parsed
        .filter((q) => q.question?.trim() && q.answer?.trim())
        .map((q) => ({
          id: crypto.randomUUID(),
          question: q.question.trim(),
          answer: q.answer.trim(),
        }));
    } catch {
      return null;
    }
  };

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    const parsed = tryParse(fenced[1].trim());
    if (parsed?.length) return parsed;
  }

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    const parsed = tryParse(trimmed.slice(arrayStart, arrayEnd + 1));
    if (parsed?.length) return parsed;
  }

  const blocks = trimmed.split(/\n(?=\d+[\.\)]\s|Q\d+[:.]?\s)/i);
  const fallback: QuizQuestion[] = [];
  for (const block of blocks) {
    const qMatch = block.match(/(?:^|\n)(?:\d+[\.\)]\s*|Q\d+[:.]?\s*)(.+?)(?:\n|$)/i);
    const aMatch = block.match(/(?:Answer|A)[:.]?\s*([\s\S]+)/i);
    if (qMatch && aMatch) {
      fallback.push({
        id: crypto.randomUUID(),
        question: qMatch[1].trim(),
        answer: aMatch[1].trim(),
      });
    }
  }
  return fallback;
}

export function QuizTool() {
  const [material, setMaterial] = useState("");
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<QuizHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const score = useMemo(
    () => Object.values(results).filter(Boolean).length,
    [results]
  );

  const missedQuestions = useMemo(
    () => questions.filter((q) => results[q.id] === false),
    [questions, results]
  );

  const stats = useMemo(() => {
    if (history.length === 0) {
      return { taken: 0, best: "—", average: "—", practiced: 0 };
    }
    const scores = history.map((h) => (h.score / h.total) * 100);
    const best = Math.max(...scores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const practiced = history.reduce((s, h) => s + h.total, 0);
    return {
      taken: history.length,
      best: `${Math.round(best)}%`,
      average: `${Math.round(avg)}%`,
      practiced,
    };
  }, [history]);

  const generateQuiz = useCallback(
    async (opts?: { text?: string; count?: QuestionCount; mode?: string }) => {
      const text = (opts?.text ?? material).trim();
      const count = opts?.count ?? questionCount;
      if (!text) return;

      setLoading(true);
      setError("");
      try {
        const { text: raw } = await askRegalAI({
          action: "quiz",
          text,
          count,
          mode: opts?.mode,
        });
        const parsed = parseQuizResponse(raw);
        if (parsed.length === 0) {
          throw new Error("Could not parse quiz questions. Try again.");
        }
        setQuestions(parsed);
        setCurrentIndex(0);
        setRevealed(false);
        setResults({});
        setPhase("quiz");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Regal AI error");
      } finally {
        setLoading(false);
      }
    },
    [material, questionCount]
  );

  const markAnswer = (correct: boolean) => {
    const q = questions[currentIndex];
    if (!q) return;
    setResults((prev) => ({ ...prev, [q.id]: correct }));
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setRevealed(false);
    } else {
      finishQuiz({ ...results, [q.id]: correct });
    }
  };

  const finishQuiz = (finalResults: Record<string, boolean>) => {
    const correct = Object.values(finalResults).filter(Boolean).length;
    const entry: QuizHistoryEntry = {
      id: crypto.randomUUID(),
      materialPreview: material.slice(0, 80) + (material.length > 80 ? "…" : ""),
      questionCount: questions.length,
      score: correct,
      total: questions.length,
      at: new Date().toISOString(),
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      saveHistory(next);
      return next;
    });
    setPhase("results");
  };

  const retakeMissed = () => {
    if (missedQuestions.length === 0) return;
    setQuestions(missedQuestions.map((q) => ({ ...q, id: crypto.randomUUID() })));
    setCurrentIndex(0);
    setRevealed(false);
    setResults({});
    setPhase("quiz");
  };

  const regenerateMissed = async () => {
    if (missedQuestions.length === 0) return;
    const missedText = missedQuestions
      .map((q, i) => `${i + 1}. ${q.question}\nAnswer: ${q.answer}`)
      .join("\n\n");
    await generateQuiz({
      text: `Previously missed questions:\n\n${missedText}\n\nOriginal material:\n${material}`,
      count: Math.min(missedQuestions.length + 2, 15) as QuestionCount,
      mode: "retake",
    });
  };

  const resetToSetup = () => {
    setPhase("setup");
    setQuestions([]);
    setCurrentIndex(0);
    setRevealed(false);
    setResults({});
    setError("");
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const sidebar = (
    <Card className="border-regal-purple-400/15 max-h-[520px] flex flex-col">
      <div className="flex items-center gap-2 shrink-0 mb-3">
        <History className="w-4 h-4 text-regal-pink" />
        <h3 className="text-sm font-bold text-white">Quiz history</h3>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pr-1">
        {history.length === 0 ? (
          <p className="text-xs text-muted py-4">
            Completed quizzes appear here with scores.
          </p>
        ) : (
          history.map((h) => (
            <div
              key={h.id}
              className="p-3 rounded-xl border bg-white/[0.03] border-white/8"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    h.score / h.total >= 0.7 ? "text-emerald-400" : "text-amber-400"
                  )}
                >
                  {h.score}/{h.total}
                </span>
                <span className="text-[10px] text-muted">
                  {new Date(h.at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-1 line-clamp-2">{h.materialPreview}</p>
              <p className="text-[10px] text-muted mt-1">{h.questionCount} questions</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  return (
    <ToolShell
      stats={
        <>
          <ToolStat label="Quizzes taken" value={stats.taken} icon={BookOpen} accent="purple" />
          <ToolStat label="Best score" value={stats.best} icon={Trophy} accent="emerald" />
          <ToolStat label="Average" value={stats.average} icon={Target} accent="pink" />
          <ToolStat label="Questions practiced" value={stats.practiced} icon={HelpCircle} accent="amber" />
        </>
      }
      sidebar={sidebar}
    >
      {phase === "setup" && (
        <ToolSection
          title="Generate a quiz"
          description="Paste your study material and Regal AI will create an interactive practice quiz."
        >
          <Card className="border-regal-purple-400/20">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <RegalAIBadge />
              <span className="text-xs text-muted">AI-powered quiz generation</span>
            </div>

            <div className="mb-4">
              <Label>Study material</Label>
              <Textarea
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="Paste lecture notes, textbook excerpts, or study guides…"
                className="min-h-[160px] mt-1"
              />
            </div>

            <div className="mb-4 max-w-xs">
              <Label>Number of questions</Label>
              <Select
                value={questionCount}
                onChange={(e) => setQuestionCount(+e.target.value as QuestionCount)}
                className="mt-1"
              >
                {QUESTION_COUNTS.map((n) => (
                  <option key={n} value={n}>
                    {n} questions
                  </option>
                ))}
              </Select>
            </div>

            {error && (
              <p className="text-sm text-red-400 mb-3">{error}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => generateQuiz()} disabled={loading || !material.trim()}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate quiz with Regal AI
              </Button>
              <Button variant="secondary" onClick={() => setMaterial("")} disabled={loading}>
                Clear
              </Button>
            </div>
          </Card>
        </ToolSection>
      )}

      {phase === "quiz" && currentQuestion && (
        <ToolSection
          title="Quiz mode"
          description={`Question ${currentIndex + 1} of ${questions.length}`}
        >
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-4">
            <div
              className="h-full bg-regal-purple-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <Card className="border-regal-purple-400/20 min-h-[200px]">
            <p className="text-xs font-bold text-regal-purple-300 uppercase tracking-wider mb-3">
              Question {currentIndex + 1}
            </p>
            <p className="text-lg font-medium text-white leading-relaxed">
              {currentQuestion.question}
            </p>

            {!revealed ? (
              <div className="mt-8">
                <Button onClick={() => setRevealed(true)}>
                  <Eye className="w-4 h-4" />
                  Reveal answer
                </Button>
              </div>
            ) : (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
                  Answer
                </p>
                <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.answer}
                </p>
                <p className="text-xs text-muted mt-4 mb-3">How did you do?</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => markAnswer(true)}
                    className="border-emerald-500/30 hover:border-emerald-400/50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Got it right
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => markAnswer(false)}
                    className="border-red-500/30 hover:border-red-400/50"
                  >
                    <XCircle className="w-4 h-4 text-red-400" />
                    Missed it
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <div className="flex items-center gap-2 text-xs text-muted">
            <span>
              Score so far: {Object.values(results).filter(Boolean).length}/
              {Object.keys(results).length}
            </span>
          </div>
        </ToolSection>
      )}

      {phase === "results" && (
        <ToolSection title="Quiz complete">
          <Card className="border-regal-pink/20 text-center py-8">
            <Trophy className="w-12 h-12 text-regal-pink mx-auto mb-4" />
            <p className="text-5xl font-bold text-white tabular-nums">
              {score}/{questions.length}
            </p>
            <p className="text-muted mt-2">
              {Math.round((score / questions.length) * 100)}% correct
            </p>
          </Card>

          {missedQuestions.length > 0 && (
            <Card>
              <p className="text-sm font-bold text-white mb-3">
                Missed questions ({missedQuestions.length})
              </p>
              <div className="space-y-3 max-h-[240px] overflow-y-auto">
                {missedQuestions.map((q, i) => (
                  <div key={q.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/8">
                    <p className="text-xs text-white font-medium">{i + 1}. {q.question}</p>
                    <p className="text-xs text-muted mt-1">{q.answer}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            {missedQuestions.length > 0 && (
              <>
                <Button onClick={retakeMissed}>
                  <RotateCcw className="w-4 h-4" />
                  Retake missed ({missedQuestions.length})
                </Button>
                <Button variant="secondary" onClick={regenerateMissed} disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Regenerate missed with Regal AI
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={() => generateQuiz()} disabled={loading}>
              <ChevronRight className="w-4 h-4" />
              New quiz
            </Button>
            <Button variant="ghost" onClick={resetToSetup}>
              Back to setup
            </Button>
          </div>
        </ToolSection>
      )}

      {phase === "quiz" && !currentQuestion && (
        <ToolEmpty
          icon={HelpCircle}
          title="No questions loaded"
          description="Generate a quiz from your study material to begin."
          action={
            <Button onClick={resetToSetup}>Go to setup</Button>
          }
        />
      )}
    </ToolShell>
  );
}
