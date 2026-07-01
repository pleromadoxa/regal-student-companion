"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Shield,
  ScanSearch,
  Loader2,
  Copy,
  Check,
  History,
  FileText,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { askRegalAI } from "@/lib/regal-ai";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea, Label } from "@/components/ui/Input";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { cn } from "@/lib/utils";
import {
  ToolShell,
  ToolStat,
  ToolSection,
  ToolEmpty,
  ToolResult,
} from "./shared/ToolShell";

const SAMPLE_TEXT = `Climate change represents one of the most pressing challenges of our time. According to the Intergovernmental Panel on Climate Change, global temperatures have risen approximately 1.1°C since pre-industrial times. Scientists agree that human activities, particularly the burning of fossil fuels, are the primary driver of this warming trend.

Many researchers argue that immediate action is necessary to limit warming to 1.5°C above pre-industrial levels. Renewable energy sources such as solar and wind power offer promising alternatives to coal and oil. However, transitioning entire economies requires coordinated policy, investment, and public support.

Students writing about climate change should cite peer-reviewed sources, paraphrase ideas in their own words, and clearly distinguish their analysis from quoted material.`;

type RiskLevel = "low" | "medium" | "high";

type ParsedReport = {
  originalityScore: number | null;
  riskLevel: RiskLevel;
  flaggedSections: string[];
  suggestions: string[];
  summary: string;
  raw: string;
};

type HistoryEntry = {
  id: string;
  excerpt: string;
  wordCount: number;
  score: number | null;
  riskLevel: RiskLevel;
  report: string;
  at: string;
};

const HISTORY_KEY = "regal-plagiarism-history";

const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bg: string; border: string; icon: typeof ShieldCheck }
> = {
  low: {
    label: "Low risk",
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    icon: ShieldCheck,
  },
  medium: {
    label: "Medium risk",
    color: "text-amber-300",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    icon: ShieldAlert,
  },
  high: {
    label: "High risk",
    color: "text-red-300",
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    icon: AlertTriangle,
  },
};

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function scoreToRisk(score: number | null): RiskLevel {
  if (score === null) return "medium";
  if (score >= 85) return "low";
  if (score >= 60) return "medium";
  return "high";
}

function parseBullets(block: string): string[] {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}

function extractSection(raw: string, headings: string[]): string {
  for (const heading of headings) {
    const re = new RegExp(
      `##?\\s*${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n##|\\n---|$)`,
      "i"
    );
    const match = raw.match(re);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return "";
}

function parsePlagiarismReport(raw: string): ParsedReport {
  const scoreSection = extractSection(raw, ["Originality Score", "Originality", "Score"]);
  const scoreMatch =
    scoreSection.match(/(\d{1,3})\s*%?/) ??
    raw.match(/originality[^:\d]*(\d{1,3})\s*%?/i) ??
    raw.match(/(\d{1,3})\s*%\s*original/i);

  const originalityScore = scoreMatch
    ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)))
    : null;

  const riskSection = extractSection(raw, ["Risk Level", "Risk"]);
  const riskFromText = riskSection.match(/\b(low|medium|high)\b/i)?.[1]?.toLowerCase() as
    | RiskLevel
    | undefined;

  const flaggedBlock = extractSection(raw, [
    "Flagged Sections",
    "Flagged",
    "Issues",
    "Concerns",
    "Similarity",
    "Potential Issues",
  ]);
  const suggestionsBlock = extractSection(raw, [
    "Suggestions",
    "Recommendations",
    "Improvements",
    "Next Steps",
  ]);
  const summaryBlock = extractSection(raw, ["Summary", "Overview"]);

  const flaggedSections = parseBullets(flaggedBlock);
  const suggestions = parseBullets(suggestionsBlock);

  const riskLevel =
    riskFromText && ["low", "medium", "high"].includes(riskFromText)
      ? riskFromText
      : scoreToRisk(originalityScore);

  return {
    originalityScore,
    riskLevel,
    flaggedSections,
    suggestions,
    summary: summaryBlock || raw.split("\n\n")[0]?.slice(0, 280) || "",
    raw,
  };
}

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
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 15)));
  } catch {
    /* quota */
  }
}

function formatReport(report: ParsedReport, wordCount: number): string {
  const lines = [
    "REGAL AI PLAGIARISM REPORT",
    "==========================",
    `Originality estimate: ${report.originalityScore ?? "N/A"}%`,
    `Risk level: ${RISK_CONFIG[report.riskLevel].label}`,
    `Word count: ${wordCount}`,
    "",
  ];

  if (report.summary) {
    lines.push("Summary", report.summary, "");
  }
  if (report.flaggedSections.length) {
    lines.push("Flagged sections");
    report.flaggedSections.forEach((s) => lines.push(`  • ${s}`));
    lines.push("");
  }
  if (report.suggestions.length) {
    lines.push("Suggestions");
    report.suggestions.forEach((s) => lines.push(`  • ${s}`));
    lines.push("");
  }
  lines.push("Full analysis", report.raw);
  return lines.join("\n");
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg = RISK_CONFIG[level];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
        cfg.bg,
        cfg.border,
        cfg.color
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

export function PlagiarismTool() {
  const [text, setText] = useState("");
  const [report, setReport] = useState<ParsedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [error, setError] = useState("");

  const wordCount = useMemo(() => countWords(text), [text]);
  const charCount = text.length;

  const scan = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    setReport(null);
    setProgress(8);

    const progressInterval = setInterval(() => {
      setProgress((p) => (p >= 92 ? p : p + 6 + Math.random() * 8));
    }, 450);

    try {
      const { text: raw } = await askRegalAI({ action: "plagiarism", text: trimmed });
      const parsed = parsePlagiarismReport(raw);
      setProgress(100);
      setReport(parsed);

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        excerpt: trimmed.slice(0, 120) + (trimmed.length > 120 ? "…" : ""),
        wordCount: countWords(trimmed),
        score: parsed.originalityScore,
        riskLevel: parsed.riskLevel,
        report: raw,
        at: new Date().toISOString(),
      };
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 15);
        saveHistory(next);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  }, [text, loading]);

  const copyReport = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(formatReport(report, wordCount));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadSample = () => setText(SAMPLE_TEXT);

  const restoreHistory = (entry: HistoryEntry) => {
    setReport(parsePlagiarismReport(entry.report));
    setError("");
  };

  const stats = report ? (
    <>
      <ToolStat
        label="Originality"
        value={report.originalityScore !== null ? `${report.originalityScore}%` : "—"}
        icon={Shield}
        accent="purple"
      />
      <ToolStat
        label="Flagged"
        value={report.flaggedSections.length}
        icon={AlertTriangle}
        accent={report.riskLevel === "high" ? "amber" : "pink"}
      />
      <ToolStat
        label="Words scanned"
        value={wordCount}
        icon={FileText}
        accent="emerald"
      />
      <ToolStat
        label="Risk level"
        value={RISK_CONFIG[report.riskLevel].label}
        icon={RISK_CONFIG[report.riskLevel].icon}
        accent={
          report.riskLevel === "low"
            ? "emerald"
            : report.riskLevel === "medium"
              ? "amber"
              : "pink"
        }
      />
    </>
  ) : undefined;

  const sidebar = (
    <Card className="border-regal-purple-400/15 max-h-[560px] flex flex-col">
      <div className="flex items-center gap-2 shrink-0 mb-3">
        <History className="w-4 h-4 text-regal-pink" />
        <h3 className="text-sm font-bold text-white">Scan history</h3>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pr-1">
        {history.length === 0 ? (
          <p className="text-xs text-muted py-4">
            Past scans are saved locally for quick review.
          </p>
        ) : (
          history.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => restoreHistory(h)}
              className={cn(
                "w-full text-left p-3 rounded-xl border transition-colors",
                report?.raw === h.report
                  ? "bg-regal-purple-500/15 border-regal-purple-400/40"
                  : "bg-white/[0.03] border-white/8 hover:border-regal-purple-400/25"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <RiskBadge level={h.riskLevel} />
                {h.score !== null && (
                  <span className="text-xs font-bold text-white tabular-nums">
                    {h.score}%
                  </span>
                )}
              </div>
              <p className="text-xs text-white mt-2 line-clamp-2">{h.excerpt}</p>
              <p className="text-[10px] text-muted mt-1">
                {h.wordCount} words · {new Date(h.at).toLocaleDateString()}
              </p>
            </button>
          ))
        )}
      </div>
    </Card>
  );

  return (
    <ToolShell stats={stats} sidebar={sidebar}>
      <Card className="border-regal-purple-400/20">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <RegalAIBadge />
          <span className="text-xs text-muted">
            Academic integrity scan powered by Regal AI
          </span>
        </div>

        <ToolSection
          title="Document to scan"
          description="Paste an essay, report, or assignment. Regal AI estimates originality and highlights areas to revise."
          action={
            <Button variant="secondary" size="sm" onClick={loadSample} disabled={loading}>
              <FileText className="w-3.5 h-3.5" /> Load sample
            </Button>
          }
        >
          <div>
            <Label>Your text</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your essay, paper, or assignment here for an originality and citation review…"
              className="min-h-[220px] text-sm mt-1 leading-relaxed"
              disabled={loading}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-muted">
              <span>
                {wordCount.toLocaleString()} words · {charCount.toLocaleString()} characters
              </span>
              {wordCount > 0 && wordCount < 50 && (
                <span className="text-amber-400">Add more text for a reliable scan</span>
              )}
            </div>
          </div>

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-regal-purple-300" />
                  Scanning for originality…
                </span>
                <span className="text-white font-medium tabular-nums">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-regal-purple-500 to-regal-pink transition-all duration-300 ease-out"
                  style={{ width: `${Math.round(progress)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={scan} disabled={loading || !text.trim() || wordCount < 20}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ScanSearch className="w-4 h-4" />
              )}
              Scan with Regal AI
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setText("");
                setReport(null);
                setError("");
              }}
              disabled={loading}
            >
              Clear
            </Button>
          </div>
        </ToolSection>
      </Card>

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-300">{error}</p>
        </Card>
      )}

      {report && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <RiskBadge level={report.riskLevel} />
            {report.originalityScore !== null && (
              <p className="text-sm text-muted">
                Estimated originality:{" "}
                <span className="font-bold text-white tabular-nums">
                  {report.originalityScore}%
                </span>
              </p>
            )}
          </div>

          {report.summary && (
            <ToolResult title="Summary">{report.summary}</ToolResult>
          )}

          {report.flaggedSections.length > 0 ? (
            <ToolSection title="Flagged sections">
              <div className="space-y-2">
                {report.flaggedSections.map((item, i) => (
                  <Card
                    key={i}
                    className={cn(
                      "p-3 border",
                      RISK_CONFIG[report.riskLevel].border,
                      "bg-white/[0.02]"
                    )}
                  >
                    <div className="flex gap-2">
                      <AlertTriangle
                        className={cn("w-4 h-4 shrink-0 mt-0.5", RISK_CONFIG[report.riskLevel].color)}
                      />
                      <p className="text-sm text-white/90">{item}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </ToolSection>
          ) : (
            !report.summary && (
              <ToolEmpty
                icon={ShieldCheck}
                title="No major flags detected"
                description="Regal AI did not identify significant originality concerns in this scan."
              />
            )
          )}

          {report.suggestions.length > 0 && (
            <ToolSection title="Suggestions">
              <div className="space-y-2">
                {report.suggestions.map((item, i) => (
                  <Card key={i} className="p-3 bg-regal-purple-500/5 border-regal-purple-400/15">
                    <div className="flex gap-2">
                      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-regal-purple-300" />
                      <p className="text-sm text-white/90">{item}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </ToolSection>
          )}

          <ToolResult
            title="Full report"
            actions={
              <Button variant="ghost" size="sm" onClick={copyReport}>
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy report
                  </>
                )}
              </Button>
            }
          >
            {report.raw}
          </ToolResult>
        </>
      )}

      {!report && !loading && !error && (
        <ToolEmpty
          icon={Sparkles}
          title="Ready to scan"
          description="Paste at least 20 words and run a scan to see originality estimates, flagged passages, and revision suggestions."
          action={
            <Button variant="secondary" size="sm" onClick={loadSample}>
              Try sample text
            </Button>
          }
        />
      )}
    </ToolShell>
  );
}
