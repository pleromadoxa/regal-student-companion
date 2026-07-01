"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CalendarClock,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Loader2,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { format, isThisWeek, isPast } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Select } from "@/components/ui/Input";
import {
  useUserId,
  ToolShell,
  ToolStat,
  ToolSection,
  ToolEmpty,
} from "@/components/tools/shared";
import { cn } from "@/lib/utils";

type ExamPriority = "low" | "medium" | "high";

interface Exam {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  exam_date: string;
  notes: string | null;
  priority: ExamPriority;
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

type ChecklistStore = Record<string, ChecklistItem[]>;

const PRIORITY_LABELS: Record<ExamPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const PRIORITY_COLORS: Record<ExamPriority, string> = {
  low: "text-emerald-300 bg-emerald-500/15 border-emerald-500/25",
  medium: "text-amber-300 bg-amber-500/15 border-amber-500/25",
  high: "text-red-300 bg-red-500/15 border-red-500/25",
};

const CHECKLIST_KEY = "regal-exam-checklists";

const DEFAULT_CHECKLIST = [
  "Review lecture notes",
  "Practice past papers",
  "Review weak topics",
  "Pack exam materials",
];

function loadChecklists(): ChecklistStore {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "{}") as ChecklistStore;
  } catch {
    return {};
  }
}

function saveChecklists(store: ChecklistStore) {
  try {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function getCountdown(examDate: string, now: number) {
  const target = new Date(examDate).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const totalHours = diff / 3600000;
  return { days, hours, minutes, totalHours, isPast: target <= now };
}

function urgencyTone(totalHours: number, isPastExam: boolean) {
  if (isPastExam) return "muted" as const;
  if (totalHours <= 24) return "critical" as const;
  if (totalHours <= 72) return "urgent" as const;
  if (totalHours <= 168) return "soon" as const;
  return "calm" as const;
}

const URGENCY_STYLES = {
  calm: {
    hero: "border-regal-purple-400/30 bg-gradient-to-br from-regal-purple-500/20 to-transparent",
    countdown: "text-regal-purple-300",
    badge: "text-emerald-300 bg-emerald-500/15",
  },
  soon: {
    hero: "border-amber-400/30 bg-gradient-to-br from-amber-500/15 to-transparent",
    countdown: "text-amber-300",
    badge: "text-amber-300 bg-amber-500/15",
  },
  urgent: {
    hero: "border-orange-400/35 bg-gradient-to-br from-orange-500/20 to-transparent",
    countdown: "text-orange-300",
    badge: "text-orange-300 bg-orange-500/15",
  },
  critical: {
    hero: "border-red-400/40 bg-gradient-to-br from-red-500/20 to-transparent",
    countdown: "text-red-300",
    badge: "text-red-300 bg-red-500/15",
  },
  muted: {
    hero: "border-white/10 bg-white/[0.03]",
    countdown: "text-muted",
    badge: "text-muted bg-white/5",
  },
};

function CountdownDisplay({
  examDate,
  now,
  size = "md",
}: {
  examDate: string;
  now: number;
  size?: "sm" | "md" | "lg";
}) {
  const { days, hours, minutes, totalHours, isPast: isPastExam } = getCountdown(
    examDate,
    now
  );
  const tone = urgencyTone(totalHours, isPastExam);
  const styles = URGENCY_STYLES[tone];

  const unitClass = cn(
    "font-bold tabular-nums",
    styles.countdown,
    size === "lg" ? "text-4xl sm:text-5xl" : size === "md" ? "text-2xl" : "text-lg"
  );
  const labelClass = cn(
    "text-[10px] uppercase tracking-widest font-bold",
    size === "lg" ? "text-muted" : "text-muted/80"
  );

  if (isPastExam) {
    return (
      <p className={cn("font-semibold", styles.countdown, size === "lg" ? "text-xl" : "text-sm")}>
        Exam passed
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      {[
        { value: days, label: "days" },
        { value: hours, label: "hrs" },
        { value: minutes, label: "min" },
      ].map(({ value, label }) => (
        <div key={label} className="text-center min-w-[3rem]">
          <p className={unitClass}>{value}</p>
          <p className={labelClass}>{label}</p>
        </div>
      ))}
    </div>
  );
}

function StudyChecklist({
  examId,
  checklists,
  onChange,
}: {
  examId: string;
  checklists: ChecklistStore;
  onChange: (store: ChecklistStore) => void;
}) {
  const [newItem, setNewItem] = useState("");
  const items = checklists[examId] ?? [];

  const ensureItems = () => {
    if (items.length > 0) return items;
    const seeded = DEFAULT_CHECKLIST.map((text) => ({
      id: crypto.randomUUID(),
      text,
      done: false,
    }));
    const next = { ...checklists, [examId]: seeded };
    onChange(next);
    saveChecklists(next);
    return seeded;
  };

  const toggle = (itemId: string) => {
    const current = ensureItems();
    const next = {
      ...checklists,
      [examId]: current.map((i) =>
        i.id === itemId ? { ...i, done: !i.done } : i
      ),
    };
    onChange(next);
    saveChecklists(next);
  };

  const addItem = () => {
    const text = newItem.trim();
    if (!text) return;
    const current = ensureItems();
    const next = {
      ...checklists,
      [examId]: [...current, { id: crypto.randomUUID(), text, done: false }],
    };
    onChange(next);
    saveChecklists(next);
    setNewItem("");
  };

  const removeItem = (itemId: string) => {
    const current = ensureItems();
    const next = {
      ...checklists,
      [examId]: current.filter((i) => i.id !== itemId),
    };
    onChange(next);
    saveChecklists(next);
  };

  const displayItems = items.length > 0 ? items : [];
  const doneCount = displayItems.filter((i) => i.done).length;

  return (
    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5" />
          Study checklist
          {displayItems.length > 0 && (
            <span className="text-regal-purple-300 normal-case font-medium">
              {doneCount}/{displayItems.length}
            </span>
          )}
        </p>
      </div>
      {displayItems.length === 0 ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => ensureItems()}
          className="w-full"
        >
          Start checklist
        </Button>
      ) : (
        <>
          <ul className="space-y-1.5">
            {displayItems.map((item) => (
              <li key={item.id} className="flex items-center gap-2 group">
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors",
                    item.done
                      ? "bg-regal-purple-500/40 border-regal-purple-400/50"
                      : "border-white/20 hover:border-regal-purple-400/40"
                  )}
                >
                  {item.done && <Check className="w-2.5 h-2.5 text-white" />}
                </button>
                <span
                  className={cn(
                    "flex-1 text-xs",
                    item.done ? "text-muted line-through" : "text-white/90"
                  )}
                >
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-300 transition-opacity"
                  aria-label="Remove item"
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              placeholder="Add study task…"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              className="text-xs py-1.5"
            />
            <Button variant="secondary" size="sm" onClick={addItem}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  title: "",
  subject: "",
  examDate: "",
  notes: "",
  priority: "medium" as ExamPriority,
};

export function ExamCountdownTool() {
  const { uid, ready } = useUserId();
  const supabase = createClient();

  const [exams, setExams] = useState<Exam[]>([]);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [checklists, setChecklists] = useState<ChecklistStore>(() =>
    typeof window === "undefined" ? {} : loadChecklists()
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const refreshExams = useCallback(async () => {
    if (!uid) return;
    setFetching(true);
    const { data } = await supabase
      .from("companion_exams")
      .select("*")
      .eq("user_id", uid)
      .order("exam_date", { ascending: true });
    setExams((data as Exam[]) ?? []);
    setFetching(false);
  }, [uid, supabase]);

  useEffect(() => {
    if (!ready || !uid) return;
    let cancelled = false;
    void (async () => {
      setFetching(true);
      const { data } = await supabase
        .from("companion_exams")
        .select("*")
        .eq("user_id", uid)
        .order("exam_date", { ascending: true });
      if (!cancelled) {
        setExams((data as Exam[]) ?? []);
        setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, uid, supabase]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.subject?.trim()) set.add(e.subject.trim());
    });
    return Array.from(set).sort();
  }, [exams]);

  const upcoming = useMemo(() => {
    const filtered =
      subjectFilter === "all"
        ? exams
        : exams.filter((e) => e.subject?.trim() === subjectFilter);
    return filtered
      .filter((e) => !isPast(new Date(e.exam_date)))
      .sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  }, [exams, subjectFilter]);

  const pastExams = useMemo(() => {
    const filtered =
      subjectFilter === "all"
        ? exams
        : exams.filter((e) => e.subject?.trim() === subjectFilter);
    return filtered
      .filter((e) => isPast(new Date(e.exam_date)))
      .sort((a, b) => b.exam_date.localeCompare(a.exam_date));
  }, [exams, subjectFilter]);

  const nextExam = upcoming[0] ?? null;
  const thisWeekCount = upcoming.filter((e) =>
    isThisWeek(new Date(e.exam_date), { weekStartsOn: 0 })
  ).length;

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (exam: Exam) => {
    setForm({
      title: exam.title,
      subject: exam.subject ?? "",
      examDate: toDatetimeLocal(exam.exam_date),
      notes: exam.notes ?? "",
      priority: exam.priority ?? "medium",
    });
    setEditingId(exam.id);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !form.title.trim() || !form.examDate) return;
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      subject: form.subject.trim() || null,
      exam_date: new Date(form.examDate).toISOString(),
      notes: form.notes.trim() || null,
      priority: form.priority,
    };

    if (editingId) {
      await supabase.from("companion_exams").update(payload).eq("id", editingId);
    } else {
      await supabase.from("companion_exams").insert({ user_id: uid, ...payload });
    }

    await refreshExams();
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("companion_exams").delete().eq("id", id);
    const nextChecklists = { ...checklists };
    delete nextChecklists[id];
    setChecklists(nextChecklists);
    saveChecklists(nextChecklists);
    setPendingDelete(null);
    await refreshExams();
  };

  if (!ready || (uid && fetching && exams.length === 0)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-regal-purple-300" />
      </div>
    );
  }

  if (!uid) {
    return (
      <ToolEmpty
        icon={CalendarClock}
        title="Sign in to track exams"
        description="Log in to add exams, countdown timers, and study checklists synced to your account."
      />
    );
  }

  const nextCountdown = nextExam ? getCountdown(nextExam.exam_date, now) : null;
  const nextTone = nextExam
    ? urgencyTone(nextCountdown!.totalHours, nextCountdown!.isPast)
    : "calm";
  const nextStyles = URGENCY_STYLES[nextTone];

  return (
    <ToolShell
      stats={
        <>
          <ToolStat
            label="Next exam"
            value={nextExam ? nextExam.title : "—"}
            icon={Target}
            accent="pink"
          />
          <ToolStat
            label="Days until"
            value={
              nextCountdown && !nextCountdown.isPast ? nextCountdown.days : "—"
            }
            icon={Calendar}
            accent="purple"
          />
          <ToolStat
            label="Upcoming"
            value={upcoming.length}
            icon={CalendarClock}
            accent="emerald"
          />
          <ToolStat
            label="This week"
            value={thisWeekCount}
            icon={Clock}
            accent="amber"
          />
        </>
      }
      sidebar={
        <Card className="border-regal-purple-400/15">
          <h3 className="text-sm font-bold text-white mb-3">Quick add</h3>
          {!showForm ? (
            <Button className="w-full" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> Add exam
            </Button>
          ) : (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <Label>Exam name</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Final exam, midterm…"
                  required
                />
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Calculus, Biology…"
                  list="exam-subjects"
                />
                <datalist id="exam-subjects">
                  {subjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label>Date & time</Label>
                <Input
                  type="datetime-local"
                  value={form.examDate}
                  onChange={(e) => setForm((f) => ({ ...f, examDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      priority: e.target.value as ExamPriority,
                    }))
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Room, topics to focus on…"
                  className="min-h-[72px] text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingId ? (
                    "Save changes"
                  ) : (
                    "Add exam"
                  )}
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      }
    >
      {nextExam && (
        <Card className={cn("border-2", nextStyles.hero)}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span
                className={cn(
                  "inline-flex text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2",
                  nextStyles.badge
                )}
              >
                Next up
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                {nextExam.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {nextExam.subject && (
                  <span className="text-xs text-regal-purple-300">
                    {nextExam.subject}
                  </span>
                )}
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                    PRIORITY_COLORS[nextExam.priority ?? "medium"]
                  )}
                >
                  {PRIORITY_LABELS[nextExam.priority ?? "medium"]}
                </span>
                <span className="text-xs text-muted">
                  {format(new Date(nextExam.exam_date), "EEE, MMM d · h:mm a")}
                </span>
              </div>
              {nextExam.notes && (
                <p className="text-sm text-muted mt-2 line-clamp-2">{nextExam.notes}</p>
              )}
            </div>
            <CountdownDisplay examDate={nextExam.exam_date} now={now} size="lg" />
          </div>
        </Card>
      )}

      <ToolSection
        title="Upcoming exams"
        description="Sorted by date. Filter by subject to focus your prep."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {subjects.length > 0 && (
              <Select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-auto text-xs py-1.5"
              >
                <option value="all">All subjects</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            )}
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        }
      >
        {upcoming.length === 0 ? (
          <ToolEmpty
            icon={Calendar}
            title="No upcoming exams"
            description="Add your exam dates to start a live countdown and build study checklists."
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" /> Add your first exam
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {upcoming.map((exam) => {
              const cd = getCountdown(exam.exam_date, now);
              const tone = urgencyTone(cd.totalHours, cd.isPast);
              const styles = URGENCY_STYLES[tone];
              const examDay = new Date(exam.exam_date);
              const isExpanded = expandedChecklist === exam.id;

              return (
                <Card
                  key={exam.id}
                  className={cn(
                    "border transition-colors",
                    exam.id === nextExam?.id
                      ? "border-regal-purple-400/25"
                      : "border-white/8"
                  )}
                >
                  <div className="flex gap-4">
                    <div className="shrink-0 w-14 text-center">
                      <p className="text-[10px] font-bold text-muted uppercase">
                        {format(examDay, "EEE")}
                      </p>
                      <p className="text-2xl font-bold text-white tabular-nums leading-none mt-0.5">
                        {format(examDay, "d")}
                      </p>
                      <p className="text-[10px] text-muted mt-0.5">
                        {format(examDay, "MMM")}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">
                            {exam.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {exam.subject && (
                              <span className="text-xs text-regal-purple-300">
                                {exam.subject}
                              </span>
                            )}
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border",
                                PRIORITY_COLORS[exam.priority ?? "medium"]
                              )}
                            >
                              {PRIORITY_LABELS[exam.priority ?? "medium"]}
                            </span>
                            <span className="text-xs text-muted">
                              {format(examDay, "h:mm a")}
                            </span>
                          </div>
                          {exam.notes && (
                            <p className="text-xs text-muted mt-1 line-clamp-1">
                              {exam.notes}
                            </p>
                          )}
                        </div>
                        <div className={cn("shrink-0", styles.countdown)}>
                          <CountdownDisplay
                            examDate={exam.exam_date}
                            now={now}
                            size="sm"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(exam)}
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedChecklist(isExpanded ? null : exam.id)
                          }
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          Checklist
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </Button>
                        {pendingDelete === exam.id ? (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-xs text-red-300">Delete?</span>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(exam.id)}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPendingDelete(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-muted hover:text-red-300"
                            onClick={() => setPendingDelete(exam.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      {isExpanded && (
                        <StudyChecklist
                          examId={exam.id}
                          checklists={checklists}
                          onChange={setChecklists}
                        />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ToolSection>

      {pastExams.length > 0 && (
        <ToolSection title="Past exams" description="Completed exam dates.">
          <div className="space-y-2 opacity-70">
            {pastExams.slice(0, 5).map((exam) => (
              <Card key={exam.id} className="py-3 border-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white/80 truncate">{exam.title}</p>
                    <p className="text-xs text-muted">
                      {format(new Date(exam.exam_date), "MMM d, yyyy")}
                      {exam.subject ? ` · ${exam.subject}` : ""}
                    </p>
                  </div>
                  {pendingDelete === exam.id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(exam.id)}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(exam.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ToolSection>
      )}
    </ToolShell>
  );
}
