"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  Map,
  Zap,
  FileQuestion,
  CalendarCheck,
  CheckSquare,
  Globe,
  ChevronRight,
  Rocket,
  ExternalLink,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { askRegalAI } from "@/lib/regal-ai";
import { readLocalJson, writeLocalJson } from "@/lib/safe-storage";
import { sanitizeAIContent, downloadTextFile } from "@/lib/format-ai-content";
import {
  EXAM_REGIONS,
  EXAM_SYSTEMS,
  getExamSystem,
  getExamSystemsByRegion,
  type ExamRegionId,
} from "@/lib/exam-systems";
import {
  DEFAULT_WAR_CHECKLIST,
  serializeBriefingForApi,
  WAR_ROOM_MODULES,
  WAR_ROOM_STORAGE_KEY,
  type WarRoomBriefing,
  type WarRoomModuleId,
  type WarRoomState,
} from "@/lib/exam-war-room";
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

type TabId = "briefing" | "arsenal" | "checklist";

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Swords,
  Map,
  Target,
  Zap,
  FileQuestion,
  CalendarCheck,
};

const DEFAULT_BRIEFING: WarRoomBriefing = {
  examSystemId: "wassce",
  title: "",
  subject: "",
  examDate: "",
  weakAreas: "",
  notes: "",
  hoursPerDay: 3,
  targetGrade: "",
  paperNumber: "",
};

function loadState(userId: string): WarRoomState | null {
  return readLocalJson<WarRoomState | null>(WAR_ROOM_STORAGE_KEY(userId), null);
}

function saveState(userId: string, state: WarRoomState) {
  writeLocalJson(WAR_ROOM_STORAGE_KEY(userId), state);
}

function ChecklistPanel({
  checklist,
  checklistDone,
  onToggle,
  className,
}: {
  checklist: { id: string; text: string; done: boolean }[];
  checklistDone: number;
  onToggle: (id: string) => void;
  className?: string;
}) {
  return (
    <Card className={cn("border-white/10", className)}>
      <div className="flex items-center gap-2 mb-4">
        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
        <p className="font-semibold text-white">Exam day checklist</p>
        <span className="text-xs text-muted ml-auto tabular-nums">
          {checklistDone}/{checklist.length} done
        </span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {checklist.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl border text-left text-sm transition-colors min-h-[44px]",
                item.done
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : "border-white/10 hover:border-regal-purple-400/30 text-white/85"
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5",
                  item.done ? "bg-emerald-500 border-emerald-400" : "border-white/20"
                )}
              >
                {item.done && <Check className="w-3 h-3 text-white" />}
              </span>
              <span className="leading-snug">{item.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ExamWarRoomClient({ userId }: { userId: string }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [region, setRegion] = useState<ExamRegionId>("west_africa");
  const [briefing, setBriefing] = useState<WarRoomBriefing>(DEFAULT_BRIEFING);
  const [modules, setModules] = useState<WarRoomState["modules"]>({});
  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean }[]>(
    DEFAULT_WAR_CHECKLIST.map((text, i) => ({ id: `c-${i}`, text, done: false }))
  );
  const [activeModule, setActiveModule] = useState<WarRoomModuleId>("full_plan");
  const [activeTab, setActiveTab] = useState<TabId>("briefing");
  const [loadingModule, setLoadingModule] = useState<WarRoomModuleId | "all" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const systemsInRegion = useMemo(() => getExamSystemsByRegion(region), [region]);
  const selectedSystem = getExamSystem(briefing.examSystemId);

  const daysLeft = briefing.examDate
    ? Math.max(0, differenceInDays(new Date(briefing.examDate), new Date()))
    : null;

  const persist = useCallback(
    (
      patch: Partial<{
        briefing: WarRoomBriefing;
        modules: WarRoomState["modules"];
        checklist: WarRoomState["checklist"];
      }>
    ) => {
      const next: WarRoomState = {
        version: 2,
        briefing: patch.briefing ?? briefing,
        modules: patch.modules ?? modules,
        checklist: patch.checklist ?? checklist,
        updatedAt: new Date().toISOString(),
      };
      saveState(userId, next);
    },
    [userId, briefing, modules, checklist]
  );

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
    const saved = loadState(userId);
    if (saved?.version === 2) {
      setBriefing(saved.briefing);
      setModules(saved.modules);
      setChecklist(saved.checklist);
      if (saved.briefing.examSystemId) {
        const sys = getExamSystem(saved.briefing.examSystemId);
        if (sys) setRegion(sys.region);
      }
    }
  }, [loadExams, userId]);

  useEffect(() => {
    const exam = exams.find((e) => e.id === selectedExamId);
    if (exam) {
      setBriefing((b) => ({
        ...b,
        title: exam.title,
        subject: exam.subject ?? b.subject,
        examDate: exam.exam_date.slice(0, 10),
      }));
    }
  }, [selectedExamId, exams]);

  const updateBriefing = (patch: Partial<WarRoomBriefing>) => {
    setBriefing((b) => {
      const next = { ...b, ...patch };
      persist({ briefing: next });
      return next;
    });
  };

  const generateModule = async (moduleId: WarRoomModuleId) => {
    if (!briefing.title.trim() || !briefing.examDate) {
      setError("Enter exam name and date in the mission briefing first.");
      setActiveTab("briefing");
      return;
    }
    setLoadingModule(moduleId);
    setError(null);
    try {
      const { text: raw } = await askRegalAI({
        action: "exam_war_module",
        mode: moduleId,
        topic: briefing.title.trim(),
        subject: briefing.subject.trim() || "General",
        text: serializeBriefingForApi(briefing, daysLeft ?? 7),
        count: daysLeft ?? 7,
      });
      const content = sanitizeAIContent(raw);
      const result = { id: moduleId, content, generatedAt: new Date().toISOString() };
      setModules((m) => {
        const next = { ...m, [moduleId]: result };
        persist({ modules: next });
        return next;
      });
      setActiveModule(moduleId);
      setActiveTab("arsenal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regal AI could not generate this module");
    } finally {
      setLoadingModule(null);
    }
  };

  const generateAllModules = async () => {
    if (!briefing.title.trim() || !briefing.examDate) {
      setError("Complete the mission briefing first.");
      setActiveTab("briefing");
      return;
    }
    setLoadingModule("all");
    setError(null);
    const order: WarRoomModuleId[] = [
      "full_plan",
      "syllabus_map",
      "drills",
      "cram_sheet",
      "mock_prep",
      "day_of",
    ];
    const accumulated: WarRoomState["modules"] = { ...modules };
    try {
      for (const moduleId of order) {
        const { text: raw } = await askRegalAI({
          action: "exam_war_module",
          mode: moduleId,
          topic: briefing.title.trim(),
          subject: briefing.subject.trim() || "General",
          text: serializeBriefingForApi(briefing, daysLeft ?? 7),
          count: daysLeft ?? 7,
        });
        accumulated[moduleId] = {
          id: moduleId,
          content: sanitizeAIContent(raw),
          generatedAt: new Date().toISOString(),
        };
        setModules({ ...accumulated });
      }
      persist({ modules: accumulated });
      setActiveTab("arsenal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Full arsenal generation failed partway");
      persist({ modules: accumulated });
    } finally {
      setLoadingModule(null);
    }
  };

  const toggleCheck = (id: string) => {
    setChecklist((list) => {
      const next = list.map((c) => (c.id === id ? { ...c, done: !c.done } : c));
      persist({ checklist: next });
      return next;
    });
  };

  const activeContent = modules[activeModule]?.content;
  const completedModules = WAR_ROOM_MODULES.filter((m) => modules[m.id]?.content).length;
  const checklistDone = checklist.filter((c) => c.done).length;

  const showBriefing = activeTab === "briefing";
  const showArsenal = activeTab === "arsenal";
  const showChecklist = activeTab === "checklist";

  return (
    <div className="page-enter w-full max-w-6xl mx-auto space-y-5 sm:space-y-6 pb-8">
      <PageHeader
        title="Exam War Room"
        description="World-class exam prep for WASSCE, BECE, JAMB, KCSE, Matric, SAT, GCSE, university finals, and professional licensure — powered by Regal AI."
        regalAI
        action={
          <Link href="/tools/exam-countdown">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Exam Countdown
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Days left", value: daysLeft ?? "—" },
          { label: "Modules ready", value: `${completedModules}/6` },
          { label: "Checklist", value: `${checklistDone}/${checklist.length}` },
          { label: "Study hrs/day", value: briefing.hoursPerDay },
        ].map((s) => (
          <Card key={s.label} className="p-3 sm:p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted">{s.label}</p>
            <p className="text-lg sm:text-2xl font-bold text-white mt-1 tabular-nums">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Mobile / tablet tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl bg-black/30 border border-white/10 xl:hidden"
        role="tablist"
        aria-label="Exam War Room sections"
      >
        {(
          [
            { id: "briefing" as const, label: "Briefing" },
            { id: "arsenal" as const, label: "Arsenal" },
            { id: "checklist" as const, label: "Checklist" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px]",
              activeTab === t.id ? "bg-regal-purple-500/30 text-white" : "text-muted"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid xl:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Briefing — left column on desktop */}
        <section
          className={cn(
            "xl:col-span-5 min-w-0",
            !showBriefing && "hidden xl:block"
          )}
          aria-label="Mission briefing"
        >
          <Card className="border-rose-400/20 space-y-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 shrink-0">
                <Swords className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white">Mission briefing</p>
                <p className="text-xs text-muted">Exam system, subject, and targets</p>
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
              <Label className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Region
              </Label>
              <Select
                value={region}
                onChange={(e) => {
                  const r = e.target.value as ExamRegionId;
                  setRegion(r);
                  const first = getExamSystemsByRegion(r)[0];
                  if (first) updateBriefing({ examSystemId: first.id });
                }}
              >
                {EXAM_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </Select>
              <p className="text-[10px] text-muted mt-1">
                {EXAM_REGIONS.find((r) => r.id === region)?.description}
              </p>
            </div>

            <div>
              <Label>Exam system *</Label>
              <Select
                value={briefing.examSystemId}
                onChange={(e) => updateBriefing({ examSystemId: e.target.value })}
              >
                {systemsInRegion.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shortName} — {s.countries.slice(0, 2).join(", ")}
                  </option>
                ))}
              </Select>
              {selectedSystem && (
                <p className="text-[11px] text-muted mt-1.5 leading-relaxed">{selectedSystem.description}</p>
              )}
            </div>

            <div>
              <Label>Exam name *</Label>
              <Input
                value={briefing.title}
                onChange={(e) => updateBriefing({ title: e.target.value })}
                placeholder={selectedSystem ? `${selectedSystem.shortName} — Core Mathematics` : "Exam title"}
              />
            </div>

            <div>
              <Label>Subject / paper focus</Label>
              <Select
                value={briefing.subject}
                onChange={(e) => updateBriefing({ subject: e.target.value })}
              >
                <option value="">Select or type below</option>
                {(selectedSystem?.typicalSubjects ?? ["General"]).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Input
                className="mt-2"
                value={briefing.subject}
                onChange={(e) => updateBriefing({ subject: e.target.value })}
                placeholder="e.g. Core Mathematics Paper 2"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Exam date *</Label>
                <Input
                  type="date"
                  value={briefing.examDate}
                  onChange={(e) => updateBriefing({ examDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Hours/day</Label>
                <Input
                  type="number"
                  min={1}
                  max={14}
                  value={briefing.hoursPerDay}
                  onChange={(e) => updateBriefing({ hoursPerDay: Number(e.target.value) || 3 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Target grade</Label>
                <Input
                  value={briefing.targetGrade}
                  onChange={(e) => updateBriefing({ targetGrade: e.target.value })}
                  placeholder="A1, 320 JAMB, 7.0 IELTS..."
                />
              </div>
              <div>
                <Label>Paper / component</Label>
                <Input
                  value={briefing.paperNumber}
                  onChange={(e) => updateBriefing({ paperNumber: e.target.value })}
                  placeholder="Paper 1, Section B..."
                />
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
                {daysLeft === 0 ? "Exam is today — deploy arsenal now" : `${daysLeft} days until exam`}
              </div>
            )}

            {selectedSystem && (
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/8 text-[11px] text-muted space-y-1">
                <p><strong className="text-white/80">Format:</strong> {selectedSystem.format}</p>
                <p><strong className="text-white/80">Scoring:</strong> {selectedSystem.scoringNotes}</p>
              </div>
            )}

            <div>
              <Label>Weak areas</Label>
              <Textarea
                rows={2}
                value={briefing.weakAreas}
                onChange={(e) => updateBriefing({ weakAreas: e.target.value })}
                placeholder="Topics or question types you struggle with..."
              />
            </div>
            <div>
              <Label>Additional context</Label>
              <Textarea
                rows={2}
                value={briefing.notes}
                onChange={(e) => updateBriefing({ notes: e.target.value })}
                placeholder="Retake, access arrangements, open book, CA weighting..."
              />
            </div>

            {error && (
              <p className="text-sm text-red-300 p-3 rounded-xl bg-red-500/10 border border-red-500/20">{error}</p>
            )}

            <Button
              onClick={() => void generateAllModules()}
              disabled={loadingModule !== null || !briefing.title.trim() || !briefing.examDate}
              className="w-full gap-2"
              size="lg"
            >
              {loadingModule !== null ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {loadingModule === "all" ? "Deploying full arsenal..." : `Generating ${loadingModule}...`}
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" /> Deploy full arsenal (all 6 modules)
                </>
              )}
            </Button>
          </Card>
        </section>

        {/* Arsenal + checklist — right column on desktop */}
        <section
          className={cn(
            "xl:col-span-7 min-w-0 flex flex-col gap-5 sm:gap-6",
            showBriefing && "hidden xl:flex"
          )}
          aria-label="Arsenal and checklist"
        >
          <div className={cn("flex flex-col gap-5 sm:gap-6", !showArsenal && "hidden xl:flex")}>
            <Card className="border-regal-purple-400/20 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-regal-pink shrink-0" />
                <p className="text-sm font-semibold text-white">Regal AI Arsenal</p>
                <RegalAIBadge className="ml-auto shrink-0" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WAR_ROOM_MODULES.map((mod) => {
                  const Icon = MODULE_ICONS[mod.icon] ?? Target;
                  const ready = Boolean(modules[mod.id]?.content);
                  const isLoading = loadingModule === mod.id || (loadingModule === "all" && !ready);
                  return (
                    <div
                      key={mod.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveModule(mod.id)}
                      onKeyDown={(e) => e.key === "Enter" && setActiveModule(mod.id)}
                      className={cn(
                        "text-left p-3 rounded-xl border transition-all cursor-pointer",
                        activeModule === mod.id
                          ? "border-regal-purple-400/50 bg-regal-purple-500/15"
                          : "border-white/10 hover:border-regal-purple-400/30 bg-white/[0.02]"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn("p-1.5 rounded-lg shrink-0", ready ? "bg-emerald-500/20" : "bg-white/10")}>
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-regal-pink" />
                          ) : (
                            <Icon className="w-4 h-4 text-regal-purple-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white flex items-center gap-1">
                            {mod.label}
                            {ready && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                          </p>
                          <p className="text-[10px] text-muted mt-0.5 line-clamp-2">{mod.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-8 px-2"
                          disabled={loadingModule !== null}
                          onClick={(e) => {
                            e.stopPropagation();
                            void generateModule(mod.id);
                          }}
                        >
                          {ready ? <RefreshCw className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {activeContent ? (
              <Card className="border-regal-purple-400/20 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <p className="text-sm font-semibold text-white">
                    {WAR_ROOM_MODULES.find((m) => m.id === activeModule)?.label}
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void generateModule(activeModule)}
                      disabled={loadingModule !== null}
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", loadingModule === activeModule && "animate-spin")} />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(activeContent);
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
                        downloadTextFile(
                          activeContent,
                          `${briefing.title.replace(/\s+/g, "-").toLowerCase()}-${activeModule}.md`
                        )
                      }
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="max-h-[min(60vh,640px)] overflow-y-auto overflow-x-hidden pr-1">
                  <MarkdownContent content={activeContent} />
                </div>
              </Card>
            ) : (
              <Card className="py-12 sm:py-14 text-center border-dashed border-white/10">
                <Target className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white font-medium">No module selected</p>
                <p className="text-xs text-muted mt-1 max-w-sm mx-auto px-4">
                  Complete your briefing, then deploy the full arsenal or generate modules individually.
                </p>
              </Card>
            )}
          </div>

          {/* Checklist: mobile tab OR always below arsenal on desktop */}
          <ChecklistPanel
            checklist={checklist}
            checklistDone={checklistDone}
            onToggle={toggleCheck}
            className={cn(!showChecklist && "hidden xl:block")}
          />
        </section>
      </div>
    </div>
  );
}
