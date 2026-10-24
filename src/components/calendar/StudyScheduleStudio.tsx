"use client";

import { useMemo, useState } from "react";
import { Sparkles, Loader2, Check, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

/**
 * StudyScheduleStudio (web) — parity with the mobile Regal AI schedule flow.
 * Calls the shared companion-ai edge function (mode "study_plan"), previews
 * the generated sessions, then writes them to companion_calendar_events and
 * fires the schedule_created confirmation email.
 */

type StudySession = {
  date: string;
  start: string;
  end: string;
  subject: string;
  topic: string;
};

type SubjectRow = { name: string; topics: string };

const TIME_CHIPS = [
  { key: "night", label: "Nights · 8–10 PM", start: "20:00", end: "22:00" },
  { key: "evening", label: "Evenings · 6–9 PM", start: "18:00", end: "21:00" },
  { key: "morning", label: "Mornings · 6–9 AM", start: "06:00", end: "09:00" },
  { key: "day", label: "Daytime · 12–4 PM", start: "12:00", end: "16:00" },
] as const;

const SUBJECT_COLORS = ["#8A4FFF", "#F472B6", "#3DD598", "#74B9FF", "#F6C453", "#E879F9"];

function subjectColor(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i += 1) {
    hash = (hash * 31 + subject.charCodeAt(i)) >>> 0;
  }
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
}

function sessionToIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function StudyScheduleStudio({ onCreated }: { onCreated: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"subjects" | "window" | "preview">("subjects");
  const [subjects, setSubjects] = useState<SubjectRow[]>([{ name: "", topics: "" }]);
  const [days, setDays] = useState(7);
  const [chip, setChip] = useState<string>("night");
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [generatedBy, setGeneratedBy] = useState<string>("ai");
  const [done, setDone] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const parsed = useMemo(
    () =>
      subjects
        .map((s) => ({
          name: s.name.trim(),
          topics: s.topics
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        }))
        .filter((s) => s.name),
    [subjects]
  );

  const reset = () => {
    setStep("subjects");
    setSubjects([{ name: "", topics: "" }]);
    setDays(7);
    setChip("night");
    setSessionMinutes(60);
    setSessions([]);
    setError(null);
    setDone(false);
    setLoading(false);
    setSaving(false);
  };

  const close = () => {
    setOpen(false);
    setTimeout(reset, 250);
  };

  const generate = async () => {
    if (parsed.length === 0) {
      setError("Add at least one subject for Regal AI to schedule.");
      return;
    }
    setLoading(true);
    setError(null);
    const window = TIME_CHIPS.find((c) => c.key === chip) ?? TIME_CHIPS[0];
    try {
      const { data, error: fnError } = await supabase.functions.invoke("companion-ai", {
        body: {
          mode: "study_plan",
          subjects: parsed,
          days,
          startDate: new Date().toISOString().slice(0, 10),
          windowStart: window.start,
          windowEnd: window.end,
          sessionMinutes
        }
      });
      if (fnError) {
        const status = (fnError as { context?: { status?: number } }).context?.status ?? 0;
        if (status === 401) throw new Error("Your session expired. Sign in again to use Regal AI.");
        if (status === 429) throw new Error("You reached today's Regal AI allowance. Try again tomorrow.");
        throw new Error("Regal AI is unreachable right now. Retry in a moment.");
      }
      const list = (data as { sessions?: StudySession[]; generatedBy?: string } | null)?.sessions ?? [];
      if (list.length === 0) throw new Error("Regal AI returned an empty schedule. Adjust your subjects and try again.");
      setSessions(list);
      setGeneratedBy((data as { generatedBy?: string })?.generatedBy ?? "ai");
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const populate = async () => {
    setSaving(true);
    setError(null);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in again to save your schedule.");

      const rows = sessions.map((s) => ({
        user_id: user.id,
        title: `${s.subject} — ${s.topic}`,
        description: `${s.topic}\nSubject: ${s.subject}\nGenerated by Regal AI`,
        start_at: sessionToIso(s.date, s.start),
        end_at: sessionToIso(s.date, s.end),
        color: subjectColor(s.subject),
        reminder_email: true,
        source: "regal_ai_study"
      }));

      const { error: insertError } = await supabase.from("companion_calendar_events").insert(rows);
      if (insertError) throw new Error("Could not save the schedule. Try again.");

      // Confirmation email — same pipeline as mobile; never blocks on failure.
      const subjectNames = Array.from(new Set(sessions.map((s) => s.subject)));
      void supabase.functions.invoke("companion-ai", {
        body: {
          kind: "schedule_created",
          dedupe_key: `schedule_created:${Date.now()}`,
          payload: {
            session_count: sessions.length,
            subject_names: subjectNames,
            days,
            first_session_at: sessionToIso(sessions[0].date, sessions[0].start)
          }
        }
      });

      await onCreated();
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the schedule.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Sparkles className="w-4 h-4 text-regal-purple-400" /> Regal AI Study Plan
      </Button>
    );
  }

  return (
    <Card className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-regal-purple-400" /> Regal AI Study Plan
          </h3>
          <p className="text-sm text-muted mt-1">
            Tell Regal AI your subjects and study window — it builds a systematic schedule.
          </p>
        </div>
        <button onClick={close} className="text-muted hover:text-white" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {done ? (
        <div className="mt-6 flex flex-col items-center gap-3 py-6">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Check className="w-6 h-6 text-emerald-300" />
          </div>
          <p className="text-white font-medium">Schedule added to your calendar</p>
          <p className="text-sm text-muted text-center max-w-sm">
            {sessions.length} sessions across {Array.from(new Set(sessions.map((s) => s.subject))).length} subjects.
            Reminders are armed and a confirmation email is on its way.
          </p>
          <Button onClick={close}>Done</Button>
        </div>
      ) : (
        <>
          {step === "subjects" && (
            <div className="mt-5 space-y-3">
              {subjects.map((row, i) => (
                <div key={i} className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Subject {i + 1}</Label>
                    <Input
                      value={row.name}
                      placeholder="e.g. Physics"
                      onChange={(e) =>
                        setSubjects((cur) =>
                          cur.map((s, j) => (j === i ? { ...s, name: e.target.value } : s))
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Topics (comma separated, optional)</Label>
                    <Input
                      value={row.topics}
                      placeholder="e.g. Mechanics, Optics"
                      onChange={(e) =>
                        setSubjects((cur) =>
                          cur.map((s, j) => (j === i ? { ...s, topics: e.target.value } : s))
                        )
                      }
                    />
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSubjects((cur) => [...cur, { name: "", topics: "" }])}
                >
                  <Plus className="w-3.5 h-3.5" /> Add subject
                </Button>
                <Button
                  size="sm"
                  onClick={() => (parsed.length > 0 ? setStep("window") : setError("Add at least one subject."))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === "window" && (
            <div className="mt-5 space-y-4">
              <div>
                <Label>Study window</Label>
                <div className="grid sm:grid-cols-2 gap-2 mt-1">
                  {TIME_CHIPS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setChip(c.key)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-sm border transition-colors text-left",
                        chip === c.key
                          ? "border-regal-purple-500/60 bg-regal-purple-500/15 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Plan length (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={days}
                    onChange={(e) => setDays(Math.min(30, Math.max(1, Number(e.target.value) || 7)))}
                  />
                </div>
                <div>
                  <Label>Session length (minutes)</Label>
                  <Input
                    type="number"
                    min={20}
                    max={240}
                    step={10}
                    value={sessionMinutes}
                    onChange={(e) => setSessionMinutes(Math.min(240, Math.max(20, Number(e.target.value) || 60)))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep("subjects")}>
                  Back
                </Button>
                <Button size="sm" onClick={() => void generate()} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {loading ? "Generating…" : "Generate with Regal AI"}
                </Button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-muted">
                {sessions.length} sessions planned
                {generatedBy === "planner" ? " (offline planner fallback)" : ""} — review, then add to your calendar.
              </p>
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                {sessions.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5 text-sm"
                  >
                    <div
                      className="w-1 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: subjectColor(s.subject) }}
                    />
                    <div className="min-w-0">
                      <p className="text-white truncate">
                        {s.subject} — {s.topic}
                      </p>
                      <p className="text-xs text-muted">
                        {s.date} · {s.start}–{s.end}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep("window")}>
                  Back
                </Button>
                <Button size="sm" onClick={() => void populate()} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? "Adding…" : `Add ${sessions.length} sessions`}
                </Button>
              </div>
            </div>
          )}

          {error ? <p className="text-sm text-red-300 mt-3">{error}</p> : null}
        </>
      )}
    </Card>
  );
}
