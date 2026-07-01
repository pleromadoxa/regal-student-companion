"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Swords,
  Loader2,
  Sparkles,
  Download,
  Copy,
  Check,
  Calendar,
  Target,
  RefreshCw,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { askRegalAI } from "@/lib/regal-ai";
import { readLocalJson, writeLocalJson } from "@/lib/safe-storage";
import { sanitizeAIContent, downloadTextFile } from "@/lib/format-ai-content";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Select } from "@/components/ui/Input";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { cn } from "@/lib/utils";

type Exam = {
  id: string;
  title: string;
  subject: string | null;
  exam_date: string;
};

const WAR_PLAN_KEY = (userId: string) => `regal-war-plan-content-${userId}`;

type SavedWarPlan = {
  plan: string;
  title: string;
  subject: string;
  examDate: string;
  weakAreas: string;
  notes: string;
  savedAt: string;
};

export function ExamWarRoomClient({ userId }: { userId: string }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [weakAreas, setWeakAreas] = useState("");
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExams = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("companion_exams")
      .select("id, title, subject, exam_date")
      .eq("user_id", userId)
      .gte("exam_date", new Date().toISOString().slice(0, 10))
      .order("exam_date", { ascending: true });
    setExams((data ?? []) as Exam[]);
  }, [userId]);

  useEffect(() => {
    void loadExams();
    const saved = readLocalJson<SavedWarPlan | null>(WAR_PLAN_KEY(userId), null);
    if (saved?.plan) {
      setPlan(saved.plan);
      setTitle(saved.title);
      setSubject(saved.subject);
      setExamDate(saved.examDate);
      setWeakAreas(saved.weakAreas);
      setNotes(saved.notes);
    }
  }, [loadExams, userId]);

  useEffect(() => {
    const exam = exams.find((e) => e.id === selectedExamId);
    if (exam) {
      setTitle(exam.title);
      setSubject(exam.subject ?? "");
      setExamDate(exam.exam_date.slice(0, 10));
    }
  }, [selectedExamId, exams]);

  const daysLeft = examDate
    ? Math.max(0, differenceInDays(new Date(examDate), new Date()))
    : null;

  const generatePlan = async () => {
    if (!title.trim() || !examDate) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await askRegalAI({
        action: "exam_war_plan",
        topic: title.trim(),
        subject: subject.trim() || "General",
        text: [
          `Exam: ${title}`,
          `Subject: ${subject || "General"}`,
          `Date: ${examDate}`,
          `Days remaining: ${daysLeft ?? 0}`,
          weakAreas && `Weak areas: ${weakAreas}`,
          notes && `Notes: ${notes}`,
        ]
          .filter(Boolean)
          .join("\n"),
        count: daysLeft ?? 7,
      });
      const cleaned = sanitizeAIContent(raw);
      setPlan(cleaned);
      writeLocalJson(WAR_PLAN_KEY(userId), {
        plan: cleaned,
        title: title.trim(),
        subject: subject.trim(),
        examDate,
        weakAreas,
        notes,
        savedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate battle plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter max-w-4xl mx-auto">
      <PageHeader
        title="Exam War Room"
        description="Deploy an AI-generated battle plan — day-by-day strategy, weak-spot drills, and a last-24-hour playbook."
        regalAI
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="border-rose-400/20 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600">
                <Swords className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Mission briefing</p>
                <p className="text-xs text-muted">Configure your exam target</p>
              </div>
            </div>

            {exams.length > 0 && (
              <div>
                <Label>Load from Exam Countdown</Label>
                <Select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
                  <option value="">Manual entry</option>
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} — {format(new Date(e.exam_date), "MMM d")}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <Label>Exam name *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Calculus II Final" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mathematics" />
              </div>
              <div>
                <Label>Exam date *</Label>
                <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              </div>
            </div>
            {daysLeft !== null && (
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border",
                  daysLeft <= 3
                    ? "bg-red-500/10 border-red-400/30 text-red-200"
                    : daysLeft <= 7
                      ? "bg-amber-500/10 border-amber-400/30 text-amber-200"
                      : "bg-emerald-500/10 border-emerald-400/30 text-emerald-200"
                )}
              >
                <Calendar className="w-4 h-4 shrink-0" />
                {daysLeft === 0 ? "Exam is today — deploy plan now" : `${daysLeft} days until exam`}
              </div>
            )}
            <div>
              <Label>Weak areas</Label>
              <Textarea
                rows={2}
                value={weakAreas}
                onChange={(e) => setWeakAreas(e.target.value)}
                placeholder="Integration, series convergence, word problems..."
              />
            </div>
            <div>
              <Label>Additional context</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Open book, formula sheet allowed, 40% of grade..."
              />
            </div>
            {error && (
              <p className="text-sm text-red-300 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                {error}
              </p>
            )}
            <Button onClick={generatePlan} disabled={loading || !title.trim() || !examDate} className="w-full" size="lg">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Generating battle plan...
                </>
              ) : (
                <>
                  <Swords className="w-5 h-5" /> Generate war plan
                </>
              )}
            </Button>
          </Card>
        </div>

        <div>
          {plan ? (
            <Card className="border-regal-purple-400/20">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <RegalAIBadge />
                  <span className="text-sm font-semibold text-white">Battle plan</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={generatePlan} disabled={loading}>
                    <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(plan);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      downloadTextFile(plan, `${title.replace(/\s+/g, "-").toLowerCase()}-war-plan.md`)
                    }
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="max-h-[70vh] overflow-y-auto pr-1">
                <MarkdownContent content={plan} />
              </div>
            </Card>
          ) : (
            <Card className="py-16 text-center border-dashed border-white/10">
              <Target className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white font-medium">No battle plan yet</p>
              <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
                Enter your exam details and deploy an AI strategy with daily schedules and drill lists.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
