"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  History,
  Lightbulb,
  RefreshCw,
  GraduationCap,
  Download,
  Calculator,
  BookOpen,
  Camera,
  ImagePlus,
  Type,
  X,
  ClipboardPaste,
  ShieldCheck,
} from "lucide-react";
import { askRegalAI } from "@/lib/regal-ai";
import {
  compressImageToBase64,
  isImageFile,
  MAX_IMAGE_BYTES,
} from "@/lib/image-utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea, Label, Select } from "@/components/ui/Input";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import {
  ToolShell,
  ToolStat,
  ToolSection,
  ToolEmpty,
} from "@/components/tools/shared";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  "Algebra",
  "Calculus",
  "Geometry",
  "Trigonometry",
  "Statistics",
  "Physics",
  "Chemistry",
  "Word Problems",
  "Linear Algebra",
  "Precalculus",
] as const;

const DIFFICULTIES = ["High School", "College", "Advanced"] as const;

const SYMBOLS = [
  "√", "π", "∫", "∑", "≤", "≥", "±", "∞", "θ", "²", "³", "÷", "×", "→", "≈", "≠",
];

const EXAMPLES: Record<(typeof SUBJECTS)[number], string[]> = {
  Algebra: ["Solve for x: 2x + 5 = 17", "Factor: x² - 5x + 6"],
  Calculus: ["Find derivative of f(x) = 3x² + 2x", "∫(2x + 1) dx from 0 to 3"],
  Geometry: ["Area of a circle with radius 7 cm", "Pythagorean theorem: legs 3 and 4"],
  Trigonometry: ["sin(30°) + cos(60°)", "Solve sin(x) = 0.5 for 0° ≤ x ≤ 180°"],
  Statistics: ["Mean and std dev of: 4, 7, 8, 9, 12", "Probability of 2 heads in 3 coin flips"],
  Physics: ["F = ma where m=5kg, a=2m/s²", "Kinetic energy of 2kg object at 3m/s"],
  Chemistry: ["Balance: Fe + O₂ → Fe₂O₃", "Moles in 36g of water (H₂O)"],
  "Word Problems": [
    "A train leaves at 60 mph. How far in 2.5 hours?",
    "Mix 30% acid with 50% acid to get 2L of 40% acid",
  ],
  "Linear Algebra": ["Find det of [[2,1],[3,4]]", "Solve Ax=b for given matrix"],
  Precalculus: ["Convert 150° to radians", "Find amplitude of f(x) = 3sin(2x)"],
};

type InputMode = "type" | "photo";

type HistoryEntry = {
  id: string;
  problem: string;
  subject: string;
  result: string;
  at: string;
  fromPhoto?: boolean;
};

type ImagePayload = { base64: string; mimeType: string; previewUrl: string };

const HISTORY_KEY = "regal-math-history";
const LEGACY_HISTORY_KEYS = ["regal-math-history-v2"];
const MAX_HISTORY = 20;
const MAX_STORED_RESULT_CHARS = 12_000;

function newHistoryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeEntry(raw: unknown): HistoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<HistoryEntry>;
  if (typeof e.problem !== "string" || typeof e.result !== "string") return null;
  if (typeof e.subject !== "string") return null;
  return {
    id: typeof e.id === "string" ? e.id : newHistoryId(),
    problem: e.problem,
    subject: e.subject,
    result: e.result,
    at: typeof e.at === "string" ? e.at : new Date().toISOString(),
    fromPhoto: Boolean(e.fromPhoto),
  };
}

function parseHistoryRaw(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).filter((e): e is HistoryEntry => e !== null);
  } catch {
    return [];
  }
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];

  for (const key of [HISTORY_KEY, ...LEGACY_HISTORY_KEYS]) {
    const entries = parseHistoryRaw(localStorage.getItem(key));
    if (entries.length === 0) continue;
    if (key !== HISTORY_KEY) {
      saveHistory(entries);
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    return entries;
  }

  try {
    return parseHistoryRaw(sessionStorage.getItem(HISTORY_KEY));
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): boolean {
  const prepared = entries.slice(0, MAX_HISTORY).map((entry) => ({
    ...entry,
    result:
      entry.result.length > MAX_STORED_RESULT_CHARS
        ? `${entry.result.slice(0, MAX_STORED_RESULT_CHARS)}\n\n…(truncated for storage)`
        : entry.result,
  }));

  const write = (data: HistoryEntry[]) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
  };

  try {
    write(prepared);
    return true;
  } catch {
    for (const limit of [10, 5, 3]) {
      try {
        write(
          prepared.slice(0, limit).map((entry) => ({
            ...entry,
            result: entry.result.slice(0, 4000),
          }))
        );
        return true;
      } catch {
        continue;
      }
    }
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(prepared.slice(0, 5)));
      return true;
    } catch {
      return false;
    }
  }
}

function parseSections(markdown: string): { title: string; body: string }[] {
  const parts = markdown.split(/^## /m).filter(Boolean);
  if (parts.length <= 1 && !markdown.includes("## ")) {
    return [{ title: "Solution", body: markdown.trim() }];
  }
  return parts.map((block) => {
    const nl = block.indexOf("\n");
    if (nl === -1) return { title: block.trim(), body: "" };
    return {
      title: block.slice(0, nl).trim(),
      body: block.slice(nl + 1).trim(),
    };
  });
}

function sectionAccent(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("answer")) return "border-regal-pink/40 bg-regal-pink/5";
  if (t.includes("step")) return "border-regal-purple-400/30 bg-regal-purple-500/5";
  if (t.includes("check")) return "border-emerald-400/30 bg-emerald-500/5";
  if (t.includes("tip")) return "border-amber-400/30 bg-amber-500/5";
  return "border-white/10 bg-white/[0.03]";
}

export function MathSolverTool() {
  const [inputMode, setInputMode] = useState<InputMode>("type");
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>("Algebra");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("High School");
  const [problem, setProblem] = useState("");
  const [image, setImage] = useState<ImagePayload | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [historySaveError, setHistorySaveError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const historyHydrated = useRef(false);

  useEffect(() => {
    historyHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!historyHydrated.current) return;
    const saved = saveHistory(history);
    setHistorySaveError(!saved && history.length > 0);
  }, [history]);

  const canSolve =
    !loading && (problem.trim().length > 0 || image !== null);

  const attachImage = async (file: File) => {
    setImageError(null);
    if (!isImageFile(file)) {
      setImageError("Please upload an image (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image must be under 8 MB.");
      return;
    }
    try {
      const { base64, mimeType } = await compressImageToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setImage((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return { base64, mimeType, previewUrl };
      });
      setInputMode("photo");
    } catch {
      setImageError("Could not process that image. Try another file.");
    }
  };

  const clearImage = () => {
    setImage((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setImageError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) =>
        i.type.startsWith("image/")
      );
      if (!item) return;
      const file = item.getAsFile();
      if (file) void attachImage(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const insertSymbol = (sym: string) => setProblem((p) => p + sym);

  const solve = useCallback(
    async (mode?: string) => {
      if (!problem.trim() && !image) return;
      setLoading(true);
      if (!mode) setResult("");
      try {
        const res = await askRegalAI({
          action: "math",
          text: problem.trim() || undefined,
          subject,
          difficulty,
          mode,
          imageBase64: image?.base64,
          imageMimeType: image?.mimeType,
        });
        setResult(res);
        if (!mode && res.trim()) {
          const label =
            problem.trim() ||
            (image ? "Photo problem" : "Problem");
          const entry: HistoryEntry = {
            id: newHistoryId(),
            problem: label,
            subject,
            result: res,
            at: new Date().toISOString(),
            fromPhoto: !!image && !problem.trim(),
          };
          setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
        }
      } catch (e) {
        setResult(e instanceof Error ? e.message : "Regal AI error");
      } finally {
        setLoading(false);
      }
    },
    [problem, subject, difficulty, image]
  );

  const handleProblemKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSolve) void solve();
    }
  };

  const copyResult = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportSolution = () => {
    if (!result) return;
    const text = [
      "Regal AI Math Solver",
      "====================",
      `Subject: ${subject} · ${difficulty}`,
      "",
      problem.trim() || "(Photo problem)",
      "",
      result,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `regal-math-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections = result ? parseSections(result) : [];

  return (
    <ToolShell
      stats={
        <>
          <ToolStat label="Solved" value={history.length} icon={Calculator} accent="emerald" />
          <ToolStat label="Subject" value={subject} icon={BookOpen} accent="purple" />
          <ToolStat label="Level" value={difficulty} icon={GraduationCap} accent="pink" />
          <ToolStat
            label="Input"
            value={inputMode === "photo" ? "Photo" : "Text"}
            icon={inputMode === "photo" ? Camera : Type}
            accent="amber"
          />
        </>
      }
      sidebar={
        history.length === 0 ? (
          <ToolEmpty
            icon={History}
            title="No history yet"
            description="Solved problems appear here for quick review."
          />
        ) : (
          <Card className="border-regal-purple-400/15 max-h-[min(520px,50vh)] lg:max-h-[520px] flex flex-col">
            <div className="flex items-center gap-2 shrink-0 mb-3">
              <History className="w-4 h-4 text-regal-pink" />
              <h3 className="text-sm font-bold text-white">Recent</h3>
            </div>
            {historySaveError && (
              <p className="text-[11px] text-amber-300 mb-2">
                Could not save history to this browser. Try clearing site data or use a smaller problem set.
              </p>
            )}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {history.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setProblem(h.fromPhoto ? "" : h.problem);
                    setSubject(h.subject as (typeof SUBJECTS)[number]);
                    setResult(h.result);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-colors",
                    result === h.result
                      ? "bg-regal-purple-500/15 border-regal-purple-400/40"
                      : "bg-white/[0.03] border-white/8 hover:border-regal-purple-400/25"
                  )}
                >
                  <span className="text-[10px] font-bold text-regal-purple-300 uppercase">
                    {h.subject}
                    {h.fromPhoto && " · photo"}
                  </span>
                  <p className="text-xs text-white mt-0.5 line-clamp-2 font-mono break-all">
                    {h.problem}
                  </p>
                </button>
              ))}
            </div>
          </Card>
        )
      }
    >
      <Card className="border-regal-purple-400/25 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-regal-purple-500/5 via-transparent to-regal-pink/5 pointer-events-none" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <RegalAIBadge />
              <span className="text-xs text-muted">
                Text, photo, or handwriting — step-by-step with Regal AI Vision
              </span>
            </div>
            <div className="flex rounded-xl border border-white/10 p-0.5 bg-black/20">
              <button
                type="button"
                onClick={() => setInputMode("type")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  inputMode === "type"
                    ? "bg-regal-purple-500/30 text-white"
                    : "text-muted hover:text-white"
                )}
              >
                <Type className="w-3.5 h-3.5" /> Type
              </button>
              <button
                type="button"
                onClick={() => setInputMode("photo")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  inputMode === "photo"
                    ? "bg-regal-purple-500/30 text-white"
                    : "text-muted hover:text-white"
                )}
              >
                <Camera className="w-3.5 h-3.5" /> Photo
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Subject</Label>
              <Select
                value={subject}
                onChange={(e) =>
                  setSubject(e.target.value as (typeof SUBJECTS)[number])
                }
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Level</Label>
              <Select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as (typeof DIFFICULTIES)[number])
                }
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </div>
          </div>

          {inputMode === "type" ? (
            <>
              <Label>Your problem</Label>
              <Textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                onKeyDown={handleProblemKeyDown}
                placeholder="Type an equation, expression, or word problem…"
                className="min-h-[130px] font-mono text-sm mt-1"
              />
              <div className="mt-3 overflow-x-auto">
                <div className="flex flex-nowrap sm:flex-wrap gap-1.5 min-w-max sm:min-w-0">
                  {SYMBOLS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => insertSymbol(sym)}
                      className="px-2.5 py-1 rounded-lg text-sm bg-white/5 border border-white/10 text-white/80 hover:border-regal-purple-400/40 shrink-0"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void attachImage(f);
                }}
              />
              {!image ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files[0];
                    if (f) void attachImage(f);
                  }}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer",
                    dragOver
                      ? "border-regal-pink bg-regal-pink/10"
                      : "border-white/15 hover:border-regal-purple-400/40 bg-white/[0.02]"
                  )}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus className="w-10 h-10 text-regal-purple-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-white">
                    Drop a photo or click to upload
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Homework, textbook, whiteboard, or handwritten notes
                  </p>
                  <p className="text-[10px] text-muted mt-3 flex items-center justify-center gap-1">
                    <ClipboardPaste className="w-3 h-3" /> Paste (Ctrl+V) also works
                  </p>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-regal-purple-400/30 bg-black/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.previewUrl}
                    alt="Math problem"
                    className="w-full max-h-[320px] object-contain"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-2 rounded-xl bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {imageError && (
                <p className="text-sm text-red-300">{imageError}</p>
              )}
              <div>
                <Label>Optional notes (help Regal AI focus)</Label>
                <Textarea
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="e.g. Solve for x only, or ignore problem 3…"
                  className="min-h-[72px] text-sm mt-1"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-5">
            <Button onClick={() => solve()} disabled={!canSolve} className="w-full sm:w-auto">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {image && !problem.trim() ? "Scan & solve photo" : "Solve with Regal AI"}
            </Button>
            <Button
              variant="secondary"
              disabled={loading}
              onClick={() => {
                setProblem("");
                clearImage();
                setResult("");
              }}
            >
              Clear all
            </Button>
          </div>
        </div>
      </Card>

      <ToolSection title="Try an example" description={`${subject} prompts`}>
        <div className="flex flex-wrap gap-2">
          {(EXAMPLES[subject] ?? []).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setInputMode("type");
                setProblem(ex);
              }}
              className="text-left text-xs px-3 py-2 rounded-xl border bg-white/[0.04] border-white/8 text-muted hover:text-white hover:border-regal-purple-400/30"
            >
              {ex}
            </button>
          ))}
        </div>
      </ToolSection>

      {loading && (
        <Card className="py-12 text-center border-regal-purple-400/20">
          <Loader2 className="w-8 h-8 animate-spin text-regal-pink mx-auto mb-3" />
          <p className="text-sm text-white font-medium">
            {image ? "Reading your photo and solving…" : "Working through the steps…"}
          </p>
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-regal-purple-300" />
              Solution
            </h3>
            <div className="flex flex-wrap gap-1">
              <Button variant="ghost" size="sm" onClick={copyResult}>
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={exportSolution}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {sections.map((sec) => (
              <Card
                key={sec.title}
                className={cn("border-l-4", sectionAccent(sec.title))}
              >
                <h4 className="text-xs font-bold uppercase tracking-widest text-regal-pink mb-2">
                  {sec.title}
                </h4>
                <pre className="whitespace-pre-wrap text-sm text-white/90 font-sans leading-relaxed">
                  {sec.body}
                </pre>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="secondary" size="sm" disabled={loading} onClick={() => solve("simpler")}>
              <Lightbulb className="w-3.5 h-3.5" /> Explain simpler
            </Button>
            <Button variant="secondary" size="sm" disabled={loading} onClick={() => solve("alternative")}>
              <RefreshCw className="w-3.5 h-3.5" /> Other method
            </Button>
            <Button variant="secondary" size="sm" disabled={loading} onClick={() => solve("practice")}>
              <Sparkles className="w-3.5 h-3.5" /> Practice problem
            </Button>
            <Button variant="secondary" size="sm" disabled={loading} onClick={() => solve("verify")}>
              <ShieldCheck className="w-3.5 h-3.5" /> Verify work
            </Button>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
