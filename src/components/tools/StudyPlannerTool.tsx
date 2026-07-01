"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  History,
  RefreshCw,
  Calendar,
  BookOpen,
  Clock,
  Target,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  AlertCircle,
  CalendarDays,
  Briefcase,
} from "lucide-react";
import { askRegalAI } from "@/lib/regal-ai";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Select } from "@/components/ui/Input";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import {
  ToolShell,
  ToolSection,
  ToolResult,
  ToolEmpty,
  ToolStat,
} from "@/components/tools/shared/ToolShell";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DAY_ALIASES: Record<(typeof DAYS)[number], RegExp> = {
  Mon: /\b(monday|mon)\b/i,
  Tue: /\b(tuesday|tue|tues)\b/i,
  Wed: /\b(wednesday|wed)\b/i,
  Thu: /\b(thursday|thu|thur|thurs)\b/i,
  Fri: /\b(friday|fri)\b/i,
  Sat: /\b(saturday|sat)\b/i,
  Sun: /\b(sunday|sun)\b/i,
};

const STEPS = [
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "exams", label: "Exam dates", icon: Calendar },
  { id: "hours", label: "Availability", icon: Clock },
  { id: "priorities", label: "Priorities", icon: Target },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type CourseEntry = {
  id: string;
  name: string;
  examDate: string;
  priority: "high" | "medium" | "low";
};

type PlanForm = {
  courses: CourseEntry[];
  hoursPerDay: number;
  weekendHours: number;
  workSchedule: string;
  constraints: string;
};

type HistoryEntry = {
  id: string;
  label: string;
  form: PlanForm;
  result: string;
  at: string;
};

const HISTORY_KEY = "regal-study-planner-history";

const DEFAULT_FORM: PlanForm = {
  courses: [{ id: "1", name: "", examDate: "", priority: "medium" }],
  hoursPerDay: 3,
  weekendHours: 5,
  workSchedule: "",
  constraints: "",
};

const TEMPLATES: { id: string; label: string; icon: typeof CalendarDays; form: PlanForm }[] = [
  {
    id: "finals",
    label: "Finals week",
    icon: CalendarDays,
    form: {
      courses: [
        { id: "f1", name: "Calculus II", examDate: "", priority: "high" },
        { id: "f2", name: "Organic Chemistry", examDate: "", priority: "high" },
        { id: "f3", name: "World History", examDate: "", priority: "medium" },
        { id: "f4", name: "English Literature", examDate: "", priority: "medium" },
      ],
      hoursPerDay: 4,
      weekendHours: 6,
      workSchedule: "No work this week — full focus on exams",
      constraints: "Finals in 5–7 days. Prioritize Calc and Chem with daily problem sets and review.",
    },
  },
  {
    id: "part-time",
    label: "Part-time worker",
    icon: Briefcase,
    form: {
      courses: [
        { id: "p1", name: "Intro Psychology", examDate: "", priority: "medium" },
        { id: "p2", name: "Statistics", examDate: "", priority: "high" },
        { id: "p3", name: "Communications", examDate: "", priority: "low" },
      ],
      hoursPerDay: 2,
      weekendHours: 5,
      workSchedule: "Work Mon–Fri 4pm–9pm; only mornings and late evenings free on weekdays",
      constraints: "Need lighter Monday after long shifts. Stack heavy study on Sat/Sun mornings.",
    },
  },
];

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 10)));
  } catch {
    /* quota */
  }
}

function defaultExamDate(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function buildPrompt(form: PlanForm, followUp?: string, previousPlan?: string): string {
  const courseLines = form.courses
    .filter((c) => c.name.trim())
    .map((c) => {
      const exam = c.examDate ? `exam ${c.examDate}` : "no exam date set";
      return `- ${c.name.trim()} (${exam}, priority: ${c.priority})`;
    })
    .join("\n");

  const base = `Create a detailed weekly study plan.

Courses:
${courseLines || "- (none listed)"}

Availability:
- Weekday study hours: ${form.hoursPerDay}h/day
- Weekend study hours: ${form.weekendHours}h/day
${form.workSchedule ? `- Work/other schedule: ${form.workSchedule}` : ""}
${form.constraints ? `- Notes/constraints: ${form.constraints}` : ""}

Format the plan with a clear section for EACH day of the week (Monday through Sunday).
For each day include: time blocks, subject focus, and specific tasks.
End with a brief weekly summary and top 3 priorities.`;

  if (followUp && previousPlan) {
    return `${base}

Previous plan:
${previousPlan}

Adjustment requested: ${followUp}`;
  }

  return base;
}

function parseWeeklyPlan(text: string): Partial<Record<(typeof DAYS)[number], string>> {
  const result: Partial<Record<(typeof DAYS)[number], string>> = {};
  const lines = text.split("\n");
  let currentDay: (typeof DAYS)[number] | null = null;
  const buffers: Partial<Record<(typeof DAYS)[number], string[]>> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let matched: (typeof DAYS)[number] | null = null;
    for (const day of DAYS) {
      const header =
        trimmed.match(new RegExp(`^#{1,3}\\s*(${DAY_ALIASES[day].source})`, "i")) ||
        trimmed.match(new RegExp(`^\\*\\*(${DAY_ALIASES[day].source})\\*\\*`, "i")) ||
        trimmed.match(new RegExp(`^(${DAY_ALIASES[day].source})\\s*[:\\-]`, "i"));
      if (header) {
        matched = day;
        break;
      }
    }

    if (matched) {
      currentDay = matched;
      if (!buffers[currentDay]) buffers[currentDay] = [];
      const rest = trimmed.replace(/^#+\s*|\*\*|\*\*/g, "").replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat|Sun)\s*[:\-]\s*/i, "");
      if (rest.trim()) buffers[currentDay]!.push(rest.trim());
      continue;
    }

    if (currentDay) {
      buffers[currentDay]!.push(trimmed.replace(/^[-*•]\s*/, ""));
    }
  }

  for (const day of DAYS) {
    if (buffers[day]?.length) {
      result[day] = buffers[day]!.join("\n").trim();
    }
  }

  return result;
}

function WeeklyCalendarGrid({ planText }: { planText: string }) {
  const parsed = useMemo(() => parseWeeklyPlan(planText), [planText]);
  const hasParsed = Object.keys(parsed).length > 0;

  if (!hasParsed) return null;

  return (
    <ToolSection
      title="Weekly calendar"
      description="Your plan at a glance — tap a day to see blocks in the full plan below."
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {DAYS.map((day) => (
          <div
            key={day}
            className={cn(
              "rounded-xl border p-3 min-h-[120px] flex flex-col",
              parsed[day]
                ? "bg-regal-purple-500/10 border-regal-purple-400/25"
                : "bg-white/[0.03] border-white/8"
            )}
          >
            <p className="text-[10px] font-bold text-regal-purple-300 uppercase tracking-wider text-center mb-2">
              {day}
            </p>
            <p className="text-[11px] text-white/80 leading-snug whitespace-pre-wrap flex-1">
              {parsed[day] ?? "—"}
            </p>
          </div>
        ))}
      </div>
    </ToolSection>
  );
}

export function StudyPlannerTool() {
  const [step, setStep] = useState<StepId>("courses");
  const [form, setForm] = useState<PlanForm>(DEFAULT_FORM);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const courseCount = form.courses.filter((c) => c.name.trim()).length;

  const applyTemplate = (template: (typeof TEMPLATES)[number]) => {
    const courses = template.form.courses.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      examDate: c.examDate || defaultExamDate(template.id === "finals" ? 5 : 14),
    }));
    setForm({ ...template.form, courses });
    setStep("courses");
    setResult("");
    setError("");
  };

  const addCourse = () => {
    setForm((f) => ({
      ...f,
      courses: [
        ...f.courses,
        { id: crypto.randomUUID(), name: "", examDate: "", priority: "medium" },
      ],
    }));
  };

  const updateCourse = (id: string, patch: Partial<CourseEntry>) => {
    setForm((f) => ({
      ...f,
      courses: f.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const removeCourse = (id: string) => {
    setForm((f) => ({
      ...f,
      courses: f.courses.length > 1 ? f.courses.filter((c) => c.id !== id) : f.courses,
    }));
  };

  const canProceed = useMemo(() => {
    switch (step) {
      case "courses":
        return form.courses.some((c) => c.name.trim());
      case "exams":
        return true;
      case "hours":
        return form.hoursPerDay > 0;
      case "priorities":
        return true;
      default:
        return false;
    }
  }, [step, form]);

  const generate = useCallback(
    async (followUp?: string) => {
      if (!form.courses.some((c) => c.name.trim())) {
        setError("Add at least one course to generate a plan.");
        return;
      }

      setLoading(true);
      setError("");
      if (!followUp) setResult("");

      try {
        const prompt = buildPrompt(form, followUp, followUp ? result : undefined);
        const res = await askRegalAI({ action: "study_plan", text: prompt });
        setResult(res);

        if (!followUp) {
          const label =
            form.courses
              .filter((c) => c.name.trim())
              .map((c) => c.name.trim())
              .slice(0, 2)
              .join(", ") + (courseCount > 2 ? "…" : "");

          const entry: HistoryEntry = {
            id: crypto.randomUUID(),
            label: label || "Study plan",
            form: { ...form, courses: form.courses.map((c) => ({ ...c })) },
            result: res,
            at: new Date().toISOString(),
          };

          setHistory((prev) => {
            const next = [entry, ...prev].slice(0, 10);
            saveHistory(next);
            return next;
          });
        } else {
          setHistory((prev) => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            next[0] = { ...next[0], result: res, at: new Date().toISOString() };
            saveHistory(next);
            return next;
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Regal AI error");
      } finally {
        setLoading(false);
      }
    },
    [form, result, courseCount]
  );

  const copyPlan = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setForm(entry.form);
    setResult(entry.result);
    setError("");
    setStep("priorities");
  };

  const sidebar = (
    <Card className="border-regal-purple-400/15 max-h-[520px] flex flex-col">
      <div className="flex items-center gap-2 shrink-0 mb-3">
        <History className="w-4 h-4 text-regal-pink" />
        <h3 className="text-sm font-bold text-white">Saved plans</h3>
        <span className="text-[10px] text-muted ml-auto">Last 10</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pr-1">
        {history.length === 0 ? (
          <p className="text-xs text-muted py-4">
            Generated plans are saved here for quick reload.
          </p>
        ) : (
          history.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => loadFromHistory(h)}
              className={cn(
                "w-full text-left p-3 rounded-xl border transition-colors",
                result === h.result
                  ? "bg-regal-purple-500/15 border-regal-purple-400/40"
                  : "bg-white/[0.03] border-white/8 hover:border-regal-purple-400/25"
              )}
            >
              <p className="text-xs font-medium text-white line-clamp-1">{h.label}</p>
              <p className="text-[10px] text-muted mt-1">
                {new Date(h.at).toLocaleDateString()} · {h.form.courses.filter((c) => c.name.trim()).length} courses
              </p>
            </button>
          ))
        )}
      </div>
    </Card>
  );

  return (
    <ToolShell
      stats={
        <>
          <ToolStat label="Courses" value={courseCount} icon={BookOpen} accent="purple" />
          <ToolStat label="Weekday hrs" value={form.hoursPerDay} icon={Clock} accent="pink" />
          <ToolStat label="Weekend hrs" value={form.weekendHours} icon={Calendar} accent="emerald" />
          <ToolStat label="Saved plans" value={history.length} icon={History} accent="amber" />
        </>
      }
      sidebar={sidebar}
    >
      <Card className="border-regal-purple-400/20">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <RegalAIBadge />
          <span className="text-xs text-muted">
            AI-powered weekly study schedules tailored to your exams and availability
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = s.id === step;
            const done = i < stepIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  active
                    ? "bg-regal-purple-500/25 border-regal-purple-400/50 text-white"
                    : done
                      ? "bg-white/5 border-white/15 text-white/80"
                      : "bg-white/[0.03] border-white/8 text-muted hover:text-white"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {step === "courses" && (
          <ToolSection title="Your courses" description="List every class you need to study for this week.">
            <div className="space-y-3">
              {form.courses.map((course) => (
                <div key={course.id} className="flex gap-2 items-start">
                  <Input
                    value={course.name}
                    onChange={(e) => updateCourse(course.id, { name: e.target.value })}
                    placeholder="Course name (e.g. Biology 101)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCourse(course.id)}
                    disabled={form.courses.length <= 1}
                    aria-label="Remove course"
                  >
                    <Trash2 className="w-4 h-4 text-muted" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={addCourse}>
                <Plus className="w-3.5 h-3.5" /> Add course
              </Button>
            </div>
          </ToolSection>
        )}

        {step === "exams" && (
          <ToolSection title="Exam dates" description="When are your upcoming exams? Used to prioritize study blocks.">
            <div className="space-y-3">
              {form.courses
                .filter((c) => c.name.trim())
                .map((course) => (
                  <div key={course.id} className="grid sm:grid-cols-2 gap-2 items-center">
                    <span className="text-sm text-white truncate">{course.name}</span>
                    <Input
                      type="date"
                      value={course.examDate}
                      onChange={(e) => updateCourse(course.id, { examDate: e.target.value })}
                    />
                  </div>
                ))}
              {courseCount === 0 && (
                <p className="text-sm text-muted">Go back and add at least one course.</p>
              )}
            </div>
          </ToolSection>
        )}

        {step === "hours" && (
          <ToolSection title="Hours available" description="How much time can you realistically study?">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Weekday hours per day</Label>
                <Input
                  type="number"
                  min={0}
                  max={16}
                  step={0.5}
                  value={form.hoursPerDay}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hoursPerDay: Math.max(0, +e.target.value) }))
                  }
                />
              </div>
              <div>
                <Label>Weekend hours per day</Label>
                <Input
                  type="number"
                  min={0}
                  max={16}
                  step={0.5}
                  value={form.weekendHours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, weekendHours: Math.max(0, +e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="mt-4">
              <Label>Work or fixed commitments</Label>
              <Textarea
                value={form.workSchedule}
                onChange={(e) => setForm((f) => ({ ...f, workSchedule: e.target.value }))}
                placeholder="e.g. Work Tue/Thu 2–8pm, soccer practice Wed 5pm…"
                className="min-h-[80px] mt-1"
              />
            </div>
          </ToolSection>
        )}

        {step === "priorities" && (
          <ToolSection title="Priorities & notes" description="Rank courses and add any constraints for Regal AI.">
            <div className="space-y-3">
              {form.courses
                .filter((c) => c.name.trim())
                .map((course) => (
                  <div key={course.id} className="grid sm:grid-cols-2 gap-2 items-center">
                    <span className="text-sm text-white truncate">{course.name}</span>
                    <Select
                      value={course.priority}
                      onChange={(e) =>
                        updateCourse(course.id, {
                          priority: e.target.value as CourseEntry["priority"],
                        })
                      }
                    >
                      <option value="high">High priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="low">Low priority</option>
                    </Select>
                  </div>
                ))}
            </div>
            <div className="mt-4">
              <Label>Additional constraints</Label>
              <Textarea
                value={form.constraints}
                onChange={(e) => setForm((f) => ({ ...f, constraints: e.target.value }))}
                placeholder="e.g. Prefer morning sessions, need breaks every 90 min, group study on Friday…"
                className="min-h-[80px] mt-1"
              />
            </div>
          </ToolSection>
        )}

        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/10">
          {stepIndex > 0 && (
            <Button type="button" variant="secondary" onClick={() => setStep(STEPS[stepIndex - 1].id)}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          )}
          {stepIndex < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={() => setStep(STEPS[stepIndex + 1].id)}
              disabled={!canProceed}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="button" onClick={() => generate()} disabled={loading || !canProceed}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Generate plan
            </Button>
          )}
        </div>
      </Card>

      <ToolSection title="Quick templates" description="Start from a common scenario and customize.">
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t)}
                className="flex items-center gap-2 text-left text-xs px-4 py-3 rounded-xl bg-white/[0.04] border border-white/8 text-muted hover:text-white hover:border-regal-purple-400/30 transition-colors"
              >
                <Icon className="w-4 h-4 text-regal-purple-300 shrink-0" />
                <span>
                  <span className="block font-medium text-white">{t.label}</span>
                  <span className="text-[10px] text-muted">
                    {t.form.courses.length} courses · {t.form.hoursPerDay}h weekdays
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </ToolSection>

      {error && (
        <Card className="border-red-500/30 bg-red-500/10">
          <div className="flex items-start gap-2 text-sm text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        </Card>
      )}

      {loading && !result && (
        <Card className="py-12 text-center border-dashed border-regal-purple-400/20">
          <Loader2 className="w-8 h-8 animate-spin text-regal-pink mx-auto mb-3" />
          <p className="text-sm text-white font-medium">Building your weekly plan…</p>
          <p className="text-xs text-muted mt-1">Regal AI is balancing exams, hours, and priorities</p>
        </Card>
      )}

      {result && !loading && (
        <>
          <WeeklyCalendarGrid planText={result} />
          <ToolResult
            title="Full study plan"
            actions={
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={copyPlan}>
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button variant="ghost" size="sm" disabled={loading} onClick={() => generate()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            }
          >
            {result}
          </ToolResult>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => generate("Adjust for lighter Monday — fewer blocks and shorter sessions.")}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Adjust for lighter Monday
            </Button>
            <Button variant="secondary" size="sm" disabled={loading} onClick={() => generate()}>
              <Sparkles className="w-3.5 h-3.5" /> Regenerate plan
            </Button>
          </div>
        </>
      )}

      {!result && !loading && !error && step === "courses" && courseCount === 0 && (
        <ToolEmpty
          icon={Calendar}
          title="No plan yet"
          description="Add your courses or pick a template, then walk through the steps to generate a personalized weekly schedule."
        />
      )}
    </ToolShell>
  );
}
