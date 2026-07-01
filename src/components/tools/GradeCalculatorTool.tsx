"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  Calculator,
  Target,
  Scale,
  GraduationCap,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import {
  ToolShell,
  ToolStat,
  ToolSection,
  ToolEmpty,
} from "@/components/tools/shared";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "regal-grade-calculator";

type Category = {
  id: string;
  name: string;
  weight: number;
  score: number | null;
  isFinal?: boolean;
};

type Course = {
  id: string;
  name: string;
  credits: number;
  targetGrade: number;
  categories: Category[];
};

type CalculatorState = {
  courses: Course[];
  activeCourseId: string;
};

const GRADE_SCALE: { letter: string; min: number; gpa: number }[] = [
  { letter: "A+", min: 97, gpa: 4.0 },
  { letter: "A", min: 93, gpa: 4.0 },
  { letter: "A-", min: 90, gpa: 3.7 },
  { letter: "B+", min: 87, gpa: 3.3 },
  { letter: "B", min: 83, gpa: 3.0 },
  { letter: "B-", min: 80, gpa: 2.7 },
  { letter: "C+", min: 77, gpa: 2.3 },
  { letter: "C", min: 73, gpa: 2.0 },
  { letter: "C-", min: 70, gpa: 1.7 },
  { letter: "D+", min: 67, gpa: 1.3 },
  { letter: "D", min: 63, gpa: 1.0 },
  { letter: "D-", min: 60, gpa: 0.7 },
  { letter: "F", min: 0, gpa: 0.0 },
];

function uid() {
  return crypto.randomUUID();
}

function defaultCourse(name = "Course 1"): Course {
  return {
    id: uid(),
    name,
    credits: 3,
    targetGrade: 90,
    categories: [
      { id: uid(), name: "Homework", weight: 20, score: 85 },
      { id: uid(), name: "Midterm", weight: 30, score: 78 },
      { id: uid(), name: "Final Exam", weight: 50, score: null, isFinal: true },
    ],
  };
}

function defaultState(): CalculatorState {
  const course = defaultCourse();
  return { courses: [course], activeCourseId: course.id };
}

function loadState(): CalculatorState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as CalculatorState;
    if (!parsed.courses?.length) return defaultState();
    const active =
      parsed.courses.find((c) => c.id === parsed.activeCourseId)?.id ??
      parsed.courses[0].id;
    return { ...parsed, activeCourseId: active };
  } catch {
    return defaultState();
  }
}

function saveState(state: CalculatorState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

function percentToLetter(percent: number): string {
  for (const g of GRADE_SCALE) {
    if (percent >= g.min) return g.letter;
  }
  return "F";
}

function percentToGpa(percent: number): number {
  for (const g of GRADE_SCALE) {
    if (percent >= g.min) return g.gpa;
  }
  return 0;
}

function computeCurrentGrade(categories: Category[]): number {
  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return 0;
  const points = categories.reduce(
    (s, c) => s + (c.score !== null ? c.weight * c.score : 0),
    0
  );
  return points / totalWeight;
}

function computeRemainingWeight(categories: Category[]): number {
  return categories
    .filter((c) => c.score === null)
    .reduce((s, c) => s + c.weight, 0);
}

function computeNeededScore(
  categories: Category[],
  target: number
): number | null {
  const remaining = computeRemainingWeight(categories);
  if (remaining <= 0) return null;
  const currentPoints = categories.reduce(
    (s, c) => s + (c.score !== null ? c.weight * c.score : 0),
    0
  );
  const needed = (target * categories.reduce((s, c) => s + c.weight, 0) - currentPoints) / remaining;
  return needed;
}

function computeOverallGpa(courses: Course[]): number {
  let totalCredits = 0;
  let weightedGpa = 0;
  for (const course of courses) {
    const grade = computeCurrentGrade(course.categories);
    const gpa = percentToGpa(grade);
    weightedGpa += gpa * course.credits;
    totalCredits += course.credits;
  }
  return totalCredits > 0 ? weightedGpa / totalCredits : 0;
}

function buildSummary(state: CalculatorState, active: Course): string {
  const grade = computeCurrentGrade(active.categories);
  const letter = percentToLetter(grade);
  const gpa = percentToGpa(grade);
  const overallGpa = computeOverallGpa(state.courses);
  const remaining = computeRemainingWeight(active.categories);
  const needed = computeNeededScore(active.categories, active.targetGrade);
  const totalWeight = active.categories.reduce((s, c) => s + c.weight, 0);

  const lines = [
    "Regal Grade Calculator Summary",
    "==============================",
    "",
    `Course: ${active.name} (${active.credits} credits)`,
    `Current Grade: ${grade.toFixed(1)}% (${letter}) · GPA ${gpa.toFixed(2)}`,
    `Target: ${active.targetGrade}% (${percentToLetter(active.targetGrade)})`,
    `Category weights: ${totalWeight}%${totalWeight !== 100 ? " ⚠ should be 100%" : ""}`,
    `Remaining weight: ${remaining}%`,
    "",
    "Categories:",
    ...active.categories.map((c) => {
      const score =
        c.score !== null ? `${c.score}%` : "pending";
      const finalTag = c.isFinal ? " [Final]" : "";
      return `- ${c.name} (${c.weight}%): ${score}${finalTag}`;
    }),
  ];

  if (needed !== null) {
    lines.push("");
    if (needed > 100) {
      lines.push(
        `Needed on remaining work: ${needed.toFixed(1)}% — target not achievable`
      );
    } else if (needed < 0) {
      lines.push(
        `Needed on remaining work: 0% — target already secured (${Math.abs(needed).toFixed(1)}% buffer)`
      );
    } else {
      lines.push(`Needed on remaining work: ${needed.toFixed(1)}% for target`);
    }
  }

  if (state.courses.length > 1) {
    lines.push("", "All courses:", "-------------");
    for (const course of state.courses) {
      const cg = computeCurrentGrade(course.categories);
      lines.push(
        `- ${course.name}: ${cg.toFixed(1)}% (${percentToLetter(cg)}) · ${course.credits} cr`
      );
    }
    lines.push("", `Cumulative GPA: ${overallGpa.toFixed(2)}`);
  }

  return lines.join("\n");
}

function GradeGauge({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const pct = Math.min(100, Math.max(0, current));
  const targetPct = Math.min(100, Math.max(0, target));
  const onTrack = current >= target;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Card className="text-center">
      <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">
        Progress to target
      </p>
      <div className="relative w-36 h-36 mx-auto">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-white/10"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--regal-purple-400)" />
              <stop offset="100%" stopColor="var(--regal-pink)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white tabular-nums">
            {current.toFixed(1)}%
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider mt-0.5",
              onTrack ? "text-emerald-400" : "text-amber-400"
            )}
          >
            {onTrack ? "On track" : "Below target"}
          </span>
        </div>
        <div
          className="absolute w-2 h-2 rounded-full bg-white shadow-lg"
          style={{
            top: `${50 - 46 * Math.sin((targetPct / 100) * 2 * Math.PI)}%`,
            left: `${50 + 46 * Math.cos((targetPct / 100) * 2 * Math.PI)}%`,
            transform: "translate(-50%, -50%)",
          }}
          title={`Target: ${target}%`}
        />
      </div>
      <div className="flex justify-center gap-6 mt-4 text-xs text-muted">
        <span>
          Current{" "}
          <strong className="text-white tabular-nums">{current.toFixed(1)}%</strong>
        </span>
        <span>
          Target{" "}
          <strong className="text-regal-pink tabular-nums">{target}%</strong>
        </span>
      </div>
    </Card>
  );
}

export function GradeCalculatorTool() {
  const [state, setState] = useState<CalculatorState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const activeCourse = useMemo(
    () =>
      state.courses.find((c) => c.id === state.activeCourseId) ??
      state.courses[0],
    [state.courses, state.activeCourseId]
  );

  const updateCourse = useCallback(
    (courseId: string, updater: (c: Course) => Course) => {
      setState((s) => ({
        ...s,
        courses: s.courses.map((c) => (c.id === courseId ? updater(c) : c)),
      }));
    },
    []
  );

  const currentGrade = computeCurrentGrade(activeCourse.categories);
  const remainingWeight = computeRemainingWeight(activeCourse.categories);
  const totalWeight = activeCourse.categories.reduce((s, c) => s + c.weight, 0);
  const weightValid = totalWeight === 100;
  const neededScore = computeNeededScore(
    activeCourse.categories,
    activeCourse.targetGrade
  );
  const letter = percentToLetter(currentGrade);
  const courseGpa = percentToGpa(currentGrade);
  const overallGpa = computeOverallGpa(state.courses);

  const finalCategory = activeCourse.categories.find((c) => c.isFinal && c.score === null);

  const addCourse = () => {
    const course = defaultCourse(`Course ${state.courses.length + 1}`);
    setState((s) => ({
      courses: [...s.courses, course],
      activeCourseId: course.id,
    }));
  };

  const removeCourse = (id: string) => {
    if (state.courses.length <= 1) return;
    setState((s) => {
      const courses = s.courses.filter((c) => c.id !== id);
      return {
        courses,
        activeCourseId:
          s.activeCourseId === id ? courses[0].id : s.activeCourseId,
      };
    });
  };

  const addCategory = () => {
    updateCourse(activeCourse.id, (c) => ({
      ...c,
      categories: [
        ...c.categories,
        { id: uid(), name: `Category ${c.categories.length + 1}`, weight: 0, score: null },
      ],
    }));
  };

  const removeCategory = (catId: string) => {
    updateCourse(activeCourse.id, (c) => ({
      ...c,
      categories: c.categories.filter((cat) => cat.id !== catId),
    }));
  };

  const moveCategory = (catId: string, dir: -1 | 1) => {
    updateCourse(activeCourse.id, (c) => {
      const idx = c.categories.findIndex((cat) => cat.id === catId);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= c.categories.length) return c;
      const categories = [...c.categories];
      [categories[idx], categories[next]] = [categories[next], categories[idx]];
      return { ...c, categories };
    });
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(buildSummary(state, activeCourse));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hydrated) {
    return (
      <Card className="py-12 text-center">
        <Calculator className="w-8 h-8 text-muted mx-auto animate-pulse" />
      </Card>
    );
  }

  return (
    <ToolShell
      stats={
        <>
          <ToolStat
            label="Current grade"
            value={`${currentGrade.toFixed(1)}%`}
            icon={Calculator}
            accent="purple"
          />
          <ToolStat
            label="Letter / GPA"
            value={`${letter} · ${courseGpa.toFixed(2)}`}
            icon={GraduationCap}
            accent="pink"
          />
          <ToolStat
            label="Target"
            value={`${activeCourse.targetGrade}%`}
            icon={Target}
            accent="emerald"
          />
          <ToolStat
            label="Remaining weight"
            value={`${remainingWeight}%`}
            icon={Scale}
            accent="amber"
          />
        </>
      }
      sidebar={
        <>
          <GradeGauge current={currentGrade} target={activeCourse.targetGrade} />

          <Card className="space-y-3">
            <h3 className="text-sm font-bold text-white">What do I need on final?</h3>
            {neededScore === null ? (
              <p className="text-xs text-muted">
                All categories are graded — no remaining weight to calculate.
              </p>
            ) : neededScore > 100 ? (
              <div className="flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">
                  You need <strong>{neededScore.toFixed(1)}%</strong>
                  {finalCategory ? ` on ${finalCategory.name}` : " on remaining work"} — target
                  is not achievable.
                </p>
              </div>
            ) : neededScore < 0 ? (
              <p className="text-sm text-emerald-300">
                Target already secured — you have a{" "}
                <strong>{Math.abs(neededScore).toFixed(1)}%</strong> buffer even with 0% on
                remaining work.
              </p>
            ) : (
              <p className="text-sm text-white/90">
                Score at least{" "}
                <strong className="text-regal-pink text-lg tabular-nums">
                  {neededScore.toFixed(1)}%
                </strong>
                {finalCategory ? (
                  <> on <span className="text-white">{finalCategory.name}</span></>
                ) : (
                  <> on remaining categories</>
                )}{" "}
                to hit {activeCourse.targetGrade}%.
              </p>
            )}
            {state.courses.length > 1 && (
              <p className="text-xs text-muted pt-1 border-t border-white/10">
                Cumulative GPA across {state.courses.length} courses:{" "}
                <strong className="text-white tabular-nums">{overallGpa.toFixed(2)}</strong>
              </p>
            )}
          </Card>

          <Button variant="secondary" className="w-full" onClick={copySummary}>
            {copied ? (
              <>
                <Check className="w-4 h-4" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy summary
              </>
            )}
          </Button>
        </>
      }
    >
      <ToolSection
        title="Courses"
        description="Track multiple courses and their weighted grade categories."
        action={
          <Button size="sm" onClick={addCourse}>
            <Plus className="w-4 h-4" /> Add course
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {state.courses.map((course) => (
            <div
              key={course.id}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border",
                course.id === activeCourse.id
                  ? "bg-regal-purple-500/20 border-regal-purple-400/40 text-white"
                  : "bg-white/5 border-white/10 text-muted hover:text-white hover:border-white/20"
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setState((s) => ({ ...s, activeCourseId: course.id }))
                }
                className="inline-flex items-center gap-2"
              >
                <BookOpen className="w-3.5 h-3.5" />
                {course.name}
              </button>
              {state.courses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCourse(course.id)}
                  className="p-0.5 rounded hover:bg-red-500/20 text-muted hover:text-red-300"
                  aria-label={`Remove ${course.name}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </ToolSection>

      <ToolSection title="Course details">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Course name</Label>
            <Input
              value={activeCourse.name}
              onChange={(e) =>
                updateCourse(activeCourse.id, (c) => ({ ...c, name: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Credits</Label>
            <Input
              type="number"
              min={0}
              max={12}
              step={0.5}
              value={activeCourse.credits}
              onChange={(e) =>
                updateCourse(activeCourse.id, (c) => ({
                  ...c,
                  credits: Math.max(0, +e.target.value || 0),
                }))
              }
            />
          </div>
          <div>
            <Label>Target grade (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={activeCourse.targetGrade}
              onChange={(e) =>
                updateCourse(activeCourse.id, (c) => ({
                  ...c,
                  targetGrade: Math.min(100, Math.max(0, +e.target.value || 0)),
                }))
              }
            />
          </div>
        </div>
      </ToolSection>

      <ToolSection
        title="Weighted categories"
        description="Weights must sum to 100%. Leave score blank for ungraded work."
        action={
          <Button size="sm" variant="secondary" onClick={addCategory}>
            <Plus className="w-4 h-4" /> Add category
          </Button>
        }
      >
        {!weightValid && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Weights sum to {totalWeight}% — adjust categories to total 100%.
          </div>
        )}

        {activeCourse.categories.length === 0 ? (
          <ToolEmpty
            icon={Calculator}
            title="No categories yet"
            description="Add weighted categories like homework, midterms, and finals."
            action={
              <Button size="sm" onClick={addCategory}>
                <Plus className="w-4 h-4" /> Add category
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px_auto] gap-2 px-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                Category
              </span>
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                Weight %
              </span>
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                Score %
              </span>
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                Final?
              </span>
              <span className="sr-only">Actions</span>
            </div>

            {activeCourse.categories.map((cat, i) => (
              <Card
                key={cat.id}
                className="p-3 sm:grid sm:grid-cols-[1fr_80px_80px_80px_auto] gap-2 items-center"
              >
                <Input
                  value={cat.name}
                  onChange={(e) =>
                    updateCourse(activeCourse.id, (c) => ({
                      ...c,
                      categories: c.categories.map((x) =>
                        x.id === cat.id ? { ...x, name: e.target.value } : x
                      ),
                    }))
                  }
                  className="sm:col-span-1"
                  placeholder="Category name"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={cat.weight}
                  onChange={(e) =>
                    updateCourse(activeCourse.id, (c) => ({
                      ...c,
                      categories: c.categories.map((x) =>
                        x.id === cat.id
                          ? { ...x, weight: Math.max(0, +e.target.value || 0) }
                          : x
                      ),
                    }))
                  }
                  placeholder="Weight"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={cat.score ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateCourse(activeCourse.id, (c) => ({
                      ...c,
                      categories: c.categories.map((x) =>
                        x.id === cat.id
                          ? {
                              ...x,
                              score: val === "" ? null : Math.min(100, Math.max(0, +val)),
                            }
                          : x
                      ),
                    }));
                  }}
                  placeholder="—"
                />
                <label className="flex items-center justify-center gap-1.5 text-xs text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!cat.isFinal}
                    onChange={(e) =>
                      updateCourse(activeCourse.id, (c) => ({
                        ...c,
                        categories: c.categories.map((x) =>
                          x.id === cat.id
                            ? { ...x, isFinal: e.target.checked }
                            : { ...x, isFinal: e.target.checked ? false : x.isFinal }
                        ),
                      }))
                    }
                    className="rounded border-white/20 bg-white/5 text-regal-purple-400 focus:ring-regal-purple-400/50"
                  />
                  Final
                </label>
                <div className="flex items-center gap-0.5 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={i === 0}
                    onClick={() => moveCategory(cat.id, -1)}
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={i === activeCourse.categories.length - 1}
                    onClick={() => moveCategory(cat.id, 1)}
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeCategory(cat.id)}
                    aria-label="Remove category"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ToolSection>
    </ToolShell>
  );
}
