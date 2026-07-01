"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Download,
  FileText,
  Layers,
  PenLine,
  RefreshCw,
  Wand2,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { askRegalAI } from "@/lib/regal-ai";
import { sanitizeAIContent, downloadTextFile } from "@/lib/format-ai-content";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Textarea, Select } from "@/components/ui/Input";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import {
  ToolShell,
  ToolSection,
  ToolStat,
} from "@/components/tools/shared/ToolShell";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "regal-essay-planner-draft";

const ESSAY_TYPES = [
  "Argumentative",
  "Persuasive",
  "Analytical",
  "Compare & Contrast",
  "Cause & Effect",
  "Expository",
  "Narrative",
  "Research",
  "Reflective",
] as const;

const LEVELS = ["High School", "College", "Graduate"] as const;

const WORD_COUNTS = [500, 800, 1000, 1500, 2000, 2500] as const;

type EssayDraft = {
  topic: string;
  notes: string;
  essayType: string;
  level: string;
  wordCount: number;
  plan: string;
  essay: string;
};

const DEFAULT_DRAFT: EssayDraft = {
  topic: "",
  notes: "",
  essayType: "Argumentative",
  level: "College",
  wordCount: 1000,
  plan: "",
  essay: "",
};

const STEPS = [
  { id: 1, label: "Your idea", icon: Lightbulb },
  { id: 2, label: "Structure", icon: Layers },
  { id: 3, label: "Full essay", icon: FileText },
] as const;

function loadDraft(): EssayDraft {
  if (typeof window === "undefined") return DEFAULT_DRAFT;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...DEFAULT_DRAFT, ...JSON.parse(raw) } : DEFAULT_DRAFT;
  } catch {
    return DEFAULT_DRAFT;
  }
}

export function EssayPlannerTool() {
  const [draft, setDraft] = useState<EssayDraft>(DEFAULT_DRAFT);
  const [planLoading, setPlanLoading] = useState(false);
  const [essayLoading, setEssayLoading] = useState(false);
  const [copied, setCopied] = useState<"plan" | "essay" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(loadDraft());
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const activeStep = !draft.plan ? 1 : !draft.essay ? 2 : 3;

  const update = (patch: Partial<EssayDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  };

  const generatePlan = useCallback(async () => {
    if (!draft.topic.trim()) return;
    setPlanLoading(true);
    setError(null);
    try {
      const { text: raw } = await askRegalAI({
        action: "essay_plan",
        topic: draft.topic.trim(),
        text: draft.notes.trim() || undefined,
        subject: draft.essayType,
        difficulty: draft.level,
        count: draft.wordCount,
      });
      update({ plan: sanitizeAIContent(raw), essay: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate structure");
    } finally {
      setPlanLoading(false);
    }
  }, [draft.topic, draft.notes, draft.essayType, draft.level, draft.wordCount]);

  const generateEssay = useCallback(async () => {
    if (!draft.plan.trim() || !draft.topic.trim()) return;
    setEssayLoading(true);
    setError(null);
    try {
      const { text: raw } = await askRegalAI({
        action: "essay_generate",
        topic: draft.topic.trim(),
        text: draft.plan,
        subject: draft.essayType,
        difficulty: draft.level,
        count: draft.wordCount,
      });
      update({ essay: sanitizeAIContent(raw) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate essay");
    } finally {
      setEssayLoading(false);
    }
  }, [draft.topic, draft.plan, draft.essayType, draft.level, draft.wordCount]);

  const copyText = async (text: string, which: "plan" | "essay") => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const wordEstimate = draft.essay.trim().split(/\s+/).filter(Boolean).length;

  return (
    <ToolShell
      stats={
        <>
          <ToolStat label="Target words" value={draft.wordCount} icon={FileText} accent="purple" />
          <ToolStat label="Essay type" value={draft.essayType.split(" ")[0]} icon={PenLine} accent="pink" />
          <ToolStat label="Plan ready" value={draft.plan ? "Yes" : "No"} icon={Layers} accent="emerald" />
          <ToolStat label="Essay words" value={wordEstimate || "—"} icon={Sparkles} accent="amber" />
        </>
      }
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 sm:gap-4 mb-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done =
            step.id === 1
              ? !!draft.topic.trim()
              : step.id === 2
                ? !!draft.plan
                : !!draft.essay;
          const current = activeStep === step.id;
          return (
            <div key={step.id} className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <div
                className={cn(
                  "flex items-center gap-2 min-w-0",
                  current ? "opacity-100" : done ? "opacity-80" : "opacity-40"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                    current
                      ? "regal-ai-gradient border-transparent shadow-lg shadow-regal-purple-500/25"
                      : done
                        ? "bg-emerald-500/15 border-emerald-400/30"
                        : "bg-white/5 border-white/10"
                  )}
                >
                  <Icon className={cn("w-4 h-4", current || done ? "text-white" : "text-white/50")} />
                </div>
                <span className="text-xs font-medium text-white truncate hidden sm:inline">
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-white/20 shrink-0 hidden sm:block" />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Input + Plan */}
        <div className="space-y-6">
          <ToolSection
            title="1. Essay idea"
            description="Describe your topic or prompt — Regal AI will architect the structure."
            action={<RegalAIBadge />}
          >
            <Card className="space-y-4 border-regal-purple-400/15">
              <div>
                <Label>Topic or essay idea *</Label>
                <Textarea
                  rows={3}
                  value={draft.topic}
                  onChange={(e) => update({ topic: e.target.value, plan: "", essay: "" })}
                  placeholder="e.g. The impact of social media on teenage mental health and academic performance"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Essay type</Label>
                  <Select
                    value={draft.essayType}
                    onChange={(e) => update({ essayType: e.target.value, plan: "", essay: "" })}
                  >
                    {ESSAY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Academic level</Label>
                  <Select
                    value={draft.level}
                    onChange={(e) => update({ level: e.target.value, plan: "", essay: "" })}
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label>Target word count</Label>
                <Select
                  value={String(draft.wordCount)}
                  onChange={(e) =>
                    update({ wordCount: Number(e.target.value), plan: "", essay: "" })
                  }
                >
                  {WORD_COUNTS.map((n) => (
                    <option key={n} value={n}>
                      ~{n.toLocaleString()} words
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Notes & requirements (optional)</Label>
                <Textarea
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                  placeholder="Required sources, angle to take, professor instructions..."
                />
              </div>
              <Button
                onClick={generatePlan}
                disabled={planLoading || !draft.topic.trim()}
                className="w-full"
              >
                {planLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Layers className="w-4 h-4" />
                )}
                Generate essay structure
              </Button>
            </Card>
          </ToolSection>

          {draft.plan && (
            <ToolSection
              title="2. Essay structure"
              description="Review and edit the plan before auto-generating your full essay."
              action={
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyText(draft.plan, "plan")}
                  >
                    {copied === "plan" ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Copy
                  </Button>
                  <Button variant="secondary" size="sm" onClick={generatePlan} disabled={planLoading}>
                    <RefreshCw className={cn("w-3.5 h-3.5", planLoading && "animate-spin")} />
                  </Button>
                </div>
              }
            >
              <Card className="border-emerald-400/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <Textarea
                  rows={14}
                  value={draft.plan}
                  onChange={(e) => update({ plan: e.target.value, essay: "" })}
                  className="font-mono text-xs leading-relaxed bg-transparent border-0 focus:ring-0 min-h-[280px]"
                />
              </Card>
            </ToolSection>
          )}
        </div>

        {/* Right: Generate + Output */}
        <div className="space-y-6">
          <ToolSection
            title="3. Auto-generate full essay"
            description="Regal AI writes the complete essay using the exact structure and plan above."
          >
            <Card
              className={cn(
                "relative overflow-hidden border-regal-pink/20",
                draft.plan ? "bg-gradient-to-br from-regal-purple-900/30 to-transparent" : ""
              )}
            >
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-regal-pink/10 rounded-full blur-3xl pointer-events-none" />

              {!draft.plan ? (
                <div className="py-12 text-center relative">
                  <Wand2 className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-muted">
                    Generate a structure first — then Auto Generate will write the full essay from
                    that plan.
                  </p>
                </div>
              ) : (
                <div className="relative space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/8">
                    <Sparkles className="w-5 h-5 text-regal-pink shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white">Advanced generation</p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">
                        The AI follows your approved plan — same thesis, sections, and arguments —
                        to produce a complete ~{draft.wordCount.toLocaleString()}-word{" "}
                        {draft.essayType.toLowerCase()} essay.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={generateEssay}
                    disabled={essayLoading || !draft.plan.trim()}
                    size="lg"
                    className="w-full shadow-lg shadow-regal-purple-500/25"
                  >
                    {essayLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Writing your essay...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        Auto Generate full essay
                      </>
                    )}
                  </Button>

                  {draft.essay && !essayLoading && (
                    <Button
                      variant="secondary"
                      onClick={generateEssay}
                      disabled={essayLoading}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4" /> Regenerate from same plan
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </ToolSection>

          {error && (
            <Card className="border-red-400/30 bg-red-500/10">
              <p className="text-sm text-red-200">{error}</p>
            </Card>
          )}

          {draft.essay && (
            <ToolSection
              title="Your essay"
              action={
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => copyText(draft.essay, "essay")}>
                    {copied === "essay" ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Copy
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      downloadTextFile(
                        draft.essay,
                        `${draft.topic.slice(0, 40).replace(/\s+/g, "-").toLowerCase()}-essay.md`
                      )
                    }
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </Button>
                </div>
              }
            >
              <Card className="border-regal-purple-400/25 max-h-[70vh] overflow-y-auto">
                <div className="p-5 sm:p-6">
                  <MarkdownContent content={draft.essay} />
                </div>
              </Card>
            </ToolSection>
          )}
        </div>
      </div>

      <p className="text-[11px] text-white/30 text-center pt-2">
        Always review and edit AI-generated essays. Cite sources and follow your institution&apos;s
        academic integrity policies.
      </p>
    </ToolShell>
  );
}
