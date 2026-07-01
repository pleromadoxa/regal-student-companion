"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  Copy,
  Download,
  Loader2,
  Sparkles,
  Trash2,
  Library,
  FileText,
  Wand2,
} from "lucide-react";
import { askRegalAI } from "@/lib/regal-ai";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Select } from "@/components/ui/Input";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import {
  ToolShell,
  ToolStat,
  ToolSection,
  ToolEmpty,
  ToolResult,
} from "./shared";
import { cn } from "@/lib/utils";

const CITATION_STYLES = ["APA", "MLA", "Chicago", "Harvard"] as const;
type CitationStyle = (typeof CITATION_STYLES)[number];

const SOURCE_TYPES = [
  "Book",
  "Journal Article",
  "Website",
  "Newspaper",
  "Conference Paper",
  "Thesis",
  "Other",
] as const;

type SourceFields = {
  author: string;
  title: string;
  year: string;
  publisher: string;
  url: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  accessDate: string;
  sourceType: (typeof SOURCE_TYPES)[number];
};

const EMPTY_SOURCE: SourceFields = {
  author: "",
  title: "",
  year: "",
  publisher: "",
  url: "",
  journal: "",
  volume: "",
  issue: "",
  pages: "",
  accessDate: "",
  sourceType: "Book",
};

type BibliographyEntry = {
  id: string;
  style: CitationStyle;
  citation: string;
  source: SourceFields;
  createdAt: string;
};

const LIBRARY_KEY = "regal-bibliography-library";

function loadLibrary(): BibliographyEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? "[]") as BibliographyEntry[];
  } catch {
    return [];
  }
}

function saveLibrary(entries: BibliographyEntry[]) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries));
  } catch {
    /* quota */
  }
}

function sourceToText(source: SourceFields): string {
  const lines: string[] = [];
  if (source.sourceType) lines.push(`Type: ${source.sourceType}`);
  if (source.author) lines.push(`Author(s): ${source.author}`);
  if (source.title) lines.push(`Title: ${source.title}`);
  if (source.year) lines.push(`Year: ${source.year}`);
  if (source.publisher) lines.push(`Publisher: ${source.publisher}`);
  if (source.journal) lines.push(`Journal: ${source.journal}`);
  if (source.volume) lines.push(`Volume: ${source.volume}`);
  if (source.issue) lines.push(`Issue: ${source.issue}`);
  if (source.pages) lines.push(`Pages: ${source.pages}`);
  if (source.url) lines.push(`URL: ${source.url}`);
  if (source.accessDate) lines.push(`Access date: ${source.accessDate}`);
  return lines.join("\n");
}

function entryLabel(entry: BibliographyEntry): string {
  const { source } = entry;
  if (source.title) return source.title;
  if (source.author) return source.author;
  return entry.citation.slice(0, 60) + (entry.citation.length > 60 ? "…" : "");
}

export function BibliographyTool() {
  const [style, setStyle] = useState<CitationStyle>("APA");
  const [mode, setMode] = useState<"form" | "paste">("form");
  const [source, setSource] = useState<SourceFields>(EMPTY_SOURCE);
  const [messyPaste, setMessyPaste] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [library, setLibrary] = useState<BibliographyEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    setLibrary(loadLibrary());
  }, []);

  const persistLibrary = useCallback((entries: BibliographyEntry[]) => {
    setLibrary(entries);
    saveLibrary(entries);
  }, []);

  const generate = useCallback(async () => {
    const text =
      mode === "paste"
        ? messyPaste.trim()
        : sourceToText(source).trim();

    if (!text) return;

    setLoading(true);
    setResult("");
    try {
      const { text: citation } = await askRegalAI({ action: "cite", text, style });
      setResult(citation);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Regal AI error");
    } finally {
      setLoading(false);
    }
  }, [mode, messyPaste, source, style]);

  const saveToLibrary = () => {
    if (!result.trim()) return;
    const entry: BibliographyEntry = {
      id: crypto.randomUUID(),
      style,
      citation: result,
      source: mode === "form" ? { ...source } : { ...EMPTY_SOURCE },
      createdAt: new Date().toISOString(),
    };
    persistLibrary([entry, ...library]);
  };

  const deleteEntry = (id: string) => {
    persistLibrary(library.filter((e) => e.id !== id));
  };

  const copyCitation = async (text: string, id?: string) => {
    await navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const exportAll = async () => {
    if (library.length === 0) return;
    const grouped = CITATION_STYLES.map((s) => {
      const entries = library.filter((e) => e.style === s);
      if (entries.length === 0) return null;
      return `## ${s}\n\n${entries.map((e) => e.citation).join("\n\n")}`;
    })
      .filter(Boolean)
      .join("\n\n---\n\n");

    const header = `Bibliography — ${new Date().toLocaleDateString()}\n${library.length} reference(s)\n\n`;
    const blob = new Blob([header + grouped], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bibliography-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    await navigator.clipboard.writeText(header + grouped);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const clearForm = () => {
    setSource(EMPTY_SOURCE);
    setMessyPaste("");
    setResult("");
  };

  const loadEntry = (entry: BibliographyEntry) => {
    setStyle(entry.style);
    setResult(entry.citation);
    if (entry.source.title || entry.source.author) {
      setMode("form");
      setSource(entry.source);
    }
  };

  const styleCounts = CITATION_STYLES.reduce(
    (acc, s) => {
      acc[s] = library.filter((e) => e.style === s).length;
      return acc;
    },
    {} as Record<CitationStyle, number>
  );

  const updateSource = <K extends keyof SourceFields>(key: K, value: SourceFields[K]) => {
    setSource((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <ToolShell
      stats={
        <>
          <ToolStat label="Saved references" value={library.length} icon={Library} accent="purple" />
          <ToolStat label="APA" value={styleCounts.APA} icon={BookOpen} accent="pink" />
          <ToolStat label="MLA" value={styleCounts.MLA} icon={FileText} accent="emerald" />
          <ToolStat label="Chicago + Harvard" value={styleCounts.Chicago + styleCounts.Harvard} icon={BookOpen} accent="amber" />
        </>
      }
      sidebar={
        <Card className="border-regal-purple-400/15 max-h-[640px] flex flex-col">
          <div className="flex items-center justify-between gap-2 shrink-0 mb-3">
            <div className="flex items-center gap-2">
              <Library className="w-4 h-4 text-regal-pink" />
              <h3 className="text-sm font-bold text-white">Reference library</h3>
            </div>
            {library.length > 0 && (
              <Button variant="ghost" size="sm" onClick={exportAll}>
                {exported ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
              </Button>
            )}
          </div>

          {library.length > 0 && (
            <Button variant="secondary" size="sm" className="shrink-0 mb-3 w-full" onClick={exportAll}>
              <Download className="w-3.5 h-3.5" />
              Export all citations
            </Button>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pr-1">
            {library.length === 0 ? (
              <p className="text-xs text-muted py-4">
                Generated citations you save appear here. Export them as a batch for your paper.
              </p>
            ) : (
              library.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "p-3 rounded-xl border transition-colors",
                    result === entry.citation
                      ? "bg-regal-purple-500/15 border-regal-purple-400/40"
                      : "bg-white/[0.03] border-white/8"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => loadEntry(entry)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="text-[10px] font-bold text-regal-purple-300 uppercase">
                        {entry.style}
                      </span>
                      <p className="text-xs text-white mt-0.5 line-clamp-2 font-medium">
                        {entryLabel(entry)}
                      </p>
                      <p className="text-[10px] text-muted mt-1">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </p>
                    </button>
                    <div className="flex gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCitation(entry.citation, entry.id)}
                      >
                        {copiedId === entry.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEntry(entry.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400/80" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      }
    >
      <Card className="border-regal-purple-400/20">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <RegalAIBadge />
          <span className="text-xs text-muted">
            APA, MLA, Chicago & Harvard citations powered by Regal AI
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Citation style</Label>
            <Select
              value={style}
              onChange={(e) => setStyle(e.target.value as CitationStyle)}
            >
              {CITATION_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Input mode</Label>
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value as "form" | "paste")}
            >
              <option value="form">Structured source fields</option>
              <option value="paste">Paste messy source (AI)</option>
            </Select>
          </div>
        </div>

        {mode === "form" ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Source type</Label>
                <Select
                  value={source.sourceType}
                  onChange={(e) =>
                    updateSource("sourceType", e.target.value as SourceFields["sourceType"])
                  }
                >
                  {SOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  placeholder="2024"
                  value={source.year}
                  onChange={(e) => updateSource("year", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Author(s)</Label>
              <Input
                placeholder="Last, F. M. or Organization name"
                value={source.author}
                onChange={(e) => updateSource("author", e.target.value)}
              />
            </div>

            <div>
              <Label>Title</Label>
              <Input
                placeholder="Article or book title"
                value={source.title}
                onChange={(e) => updateSource("title", e.target.value)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>
                  {source.sourceType === "Journal Article" ? "Journal" : "Publisher"}
                </Label>
                <Input
                  placeholder={
                    source.sourceType === "Journal Article"
                      ? "Journal name"
                      : "Publisher name"
                  }
                  value={
                    source.sourceType === "Journal Article"
                      ? source.journal
                      : source.publisher
                  }
                  onChange={(e) => {
                    if (source.sourceType === "Journal Article") {
                      updateSource("journal", e.target.value);
                    } else {
                      updateSource("publisher", e.target.value);
                    }
                  }}
                />
              </div>
              <div>
                <Label>Volume / Issue / Pages</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Vol."
                    value={source.volume}
                    onChange={(e) => updateSource("volume", e.target.value)}
                  />
                  <Input
                    placeholder="Iss."
                    value={source.issue}
                    onChange={(e) => updateSource("issue", e.target.value)}
                  />
                  <Input
                    placeholder="pp."
                    value={source.pages}
                    onChange={(e) => updateSource("pages", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>URL</Label>
                <Input
                  placeholder="https://..."
                  value={source.url}
                  onChange={(e) => updateSource("url", e.target.value)}
                />
              </div>
              <div>
                <Label>Access date</Label>
                <Input
                  type="date"
                  value={source.accessDate}
                  onChange={(e) => updateSource("accessDate", e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Label>Paste messy source details</Label>
            <Textarea
              value={messyPaste}
              onChange={(e) => setMessyPaste(e.target.value)}
              placeholder="Paste anything — a URL, copied bibliography line, DOI, or rough notes. Regal AI will extract fields and format the citation."
              className="min-h-[160px] mt-1"
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-5">
          <Button
            onClick={generate}
            disabled={
              loading ||
              (mode === "form"
                ? !source.author.trim() && !source.title.trim() && !source.url.trim()
                : !messyPaste.trim())
            }
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === "paste" ? (
              <Wand2 className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {mode === "paste" ? "Generate from paste" : "Generate citation"}
          </Button>
          <Button variant="secondary" onClick={clearForm} disabled={loading}>
            Clear
          </Button>
        </div>
      </Card>

      {result ? (
        <ToolSection
          title="Generated citation"
          action={
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => copyCitation(result, "result")}>
                {copiedId === "result" ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button variant="secondary" size="sm" onClick={saveToLibrary}>
                Save to library
              </Button>
            </div>
          }
        >
          <ToolResult>{result}</ToolResult>
        </ToolSection>
      ) : (
        <ToolEmpty
          icon={BookOpen}
          title="No citation yet"
          description="Fill in source details or paste a messy reference, pick a style, and generate your citation with Regal AI."
        />
      )}
    </ToolShell>
  );
}
