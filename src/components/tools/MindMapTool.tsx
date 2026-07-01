"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Network,
  ChevronRight,
  ChevronDown,
  Trash2,
  Download,
  BookOpen,
  Layers,
} from "lucide-react";
import { askRegalAI } from "@/lib/regal-ai";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import {
  ToolShell,
  ToolStat,
  ToolSection,
  ToolEmpty,
} from "./shared";
import { cn } from "@/lib/utils";

const EXAMPLE_TOPICS = [
  "Photosynthesis",
  "World War II causes",
  "Machine learning basics",
  "Cell biology",
  "American Revolution",
  "Climate change",
] as const;

const LIBRARY_KEY = "regal-mindmap-library";

type MindMapNode = {
  id: string;
  label: string;
  children: MindMapNode[];
};

type SavedMap = {
  id: string;
  topic: string;
  notes: string;
  raw: string;
  nodeCount: number;
  at: string;
};

function loadLibrary(): SavedMap[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? "[]") as SavedMap[];
  } catch {
    return [];
  }
}

function saveLibrary(entries: SavedMap[]) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries.slice(0, 20)));
  } catch {
    /* quota */
  }
}

function cleanLabel(raw: string): string {
  return raw
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .trim();
}

export function parseMindMap(text: string): MindMapNode[] {
  const lines = text.split("\n").filter((l) => l.trim());
  const root: MindMapNode[] = [];
  const stack: { node: MindMapNode; depth: number }[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    const bulletMatch = line.match(/^(\s*)([-*•]|\d+\.)\s+(.+)$/);

    let depth = 0;
    let label = "";

    if (headingMatch) {
      depth = headingMatch[1].length - 1;
      label = cleanLabel(headingMatch[2]);
    } else if (bulletMatch) {
      depth = Math.floor(bulletMatch[1].length / 2);
      label = cleanLabel(bulletMatch[3]);
    } else {
      label = cleanLabel(line.trim());
      depth = 0;
    }

    if (!label) continue;

    const node: MindMapNode = {
      id: crypto.randomUUID(),
      label,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, depth });
  }

  return root;
}

function countNodes(nodes: MindMapNode[]): number {
  return nodes.reduce(
    (sum, n) => sum + 1 + countNodes(n.children),
    0
  );
}

function serializeTree(nodes: MindMapNode[], depth = 0): string {
  return nodes
    .map((n) => {
      const indent = "  ".repeat(depth);
      const line = `${indent}- ${n.label}`;
      const childLines = n.children.length
        ? "\n" + serializeTree(n.children, depth + 1)
        : "";
      return line + childLines;
    })
    .join("\n");
}

function MindMapTreeNode({
  node,
  depth = 0,
  defaultExpanded = true,
}: {
  node: MindMapNode;
  depth?: number;
  defaultExpanded?: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = useState(defaultExpanded || depth < 2);

  const depthColors = [
    "border-regal-purple-400/50 bg-regal-purple-500/20 text-white",
    "border-regal-pink/40 bg-regal-pink/10 text-white/95",
    "border-emerald-400/30 bg-emerald-500/10 text-white/90",
    "border-amber-400/25 bg-amber-500/10 text-white/85",
  ];
  const colorClass = depthColors[Math.min(depth, depthColors.length - 1)];

  return (
    <li className="mind-map-node relative">
      <div
        className={cn(
          "flex items-start gap-1.5 py-1.5 group",
          depth > 0 && "pl-1"
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 shrink-0 p-0.5 rounded-md text-muted hover:text-white hover:bg-white/10 transition-colors"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse branch" : "Expand branch"}
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-[18px] shrink-0 mt-1.5 flex justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors",
            colorClass,
            hasChildren && "cursor-pointer hover:brightness-110",
            !expanded && hasChildren && "opacity-80"
          )}
          onClick={hasChildren ? () => setExpanded(!expanded) : undefined}
          onKeyDown={
            hasChildren
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpanded(!expanded);
                  }
                }
              : undefined
          }
          role={hasChildren ? "button" : undefined}
          tabIndex={hasChildren ? 0 : undefined}
        >
          {node.label}
          {hasChildren && !expanded && (
            <span className="ml-2 text-[10px] text-muted font-normal">
              +{node.children.length}
            </span>
          )}
        </span>
      </div>
      {hasChildren && expanded && (
        <ul className="ml-4 pl-3 border-l border-white/10 space-y-0.5">
          {node.children.map((child) => (
            <MindMapTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              defaultExpanded={depth < 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function MindMapTree({
  nodes,
  topic,
}: {
  nodes: MindMapNode[];
  topic: string;
}) {
  if (nodes.length === 0) return null;

  const displayNodes =
    nodes.length === 1
      ? nodes
      : [
          {
            id: "root",
            label: topic || "Mind Map",
            children: nodes,
          },
        ];

  return (
    <div className="mind-map-tree overflow-x-auto">
      <ul className="space-y-1 min-w-0">
        {displayNodes.map((node) => (
          <MindMapTreeNode key={node.id} node={node} depth={0} />
        ))}
      </ul>
    </div>
  );
}

export function MindMapTool() {
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [library, setLibrary] = useState<SavedMap[]>(() => loadLibrary());
  const [activeId, setActiveId] = useState<string | null>(null);

  const nodes = useMemo(() => parseMindMap(raw), [raw]);
  const nodeCount = useMemo(() => countNodes(nodes), [nodes]);

  const generate = useCallback(async () => {
    const t = topic.trim();
    const n = notes.trim();
    if (!t && !n) return;

    setLoading(true);
    setRaw("");
    setActiveId(null);
    try {
      const input = [t && `Topic: ${t}`, n].filter(Boolean).join("\n\n");
      const { text: res } = await askRegalAI({
        action: "mindmap",
        text: input,
        topic: t || undefined,
      });
      setRaw(res);

      const parsed = parseMindMap(res);
      const entry: SavedMap = {
        id: crypto.randomUUID(),
        topic: t || parsed[0]?.label || "Untitled map",
        notes: n,
        raw: res,
        nodeCount: countNodes(parsed),
        at: new Date().toISOString(),
      };
      setActiveId(entry.id);
      setLibrary((prev) => {
        const next = [entry, ...prev].slice(0, 20);
        saveLibrary(next);
        return next;
      });
    } catch (e) {
      setRaw(e instanceof Error ? e.message : "Regal AI error");
    } finally {
      setLoading(false);
    }
  }, [topic, notes]);

  const loadMap = (map: SavedMap) => {
    setTopic(map.topic);
    setNotes(map.notes);
    setRaw(map.raw);
    setActiveId(map.id);
  };

  const deleteMap = (id: string) => {
    setLibrary((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveLibrary(next);
      return next;
    });
    if (activeId === id) setActiveId(null);
  };

  const copyExport = async () => {
    if (!raw) return;
    const tree = serializeTree(nodes);
    const text = topic ? `# ${topic}\n\n${tree}` : tree || raw;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadExport = () => {
    if (!raw) return;
    const blob = new Blob(
      [`${topic ? `# ${topic}\n\n` : ""}${raw}`],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(topic || "mind-map").replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sidebar = (
    <Card className="border-regal-purple-400/15 max-h-[560px] flex flex-col">
      <div className="flex items-center gap-2 shrink-0 mb-3">
        <BookOpen className="w-4 h-4 text-regal-pink" />
        <h3 className="text-sm font-bold text-white">Saved maps</h3>
        <span className="text-[10px] text-muted ml-auto">{library.length}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pr-1">
        {library.length === 0 ? (
          <p className="text-xs text-muted py-4">
            Generated mind maps are saved here for quick access.
          </p>
        ) : (
          library.map((m) => (
            <div
              key={m.id}
              className={cn(
                "relative rounded-xl border transition-colors",
                activeId === m.id
                  ? "bg-regal-purple-500/15 border-regal-purple-400/40"
                  : "bg-white/[0.03] border-white/8 hover:border-regal-purple-400/25"
              )}
            >
              <button
                type="button"
                onClick={() => loadMap(m)}
                className="w-full text-left p-3 pr-9"
              >
                <p className="text-xs font-medium text-white line-clamp-1">
                  {m.topic}
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  {m.nodeCount} nodes · {new Date(m.at).toLocaleDateString()}
                </p>
              </button>
              <button
                type="button"
                onClick={() => deleteMap(m.id)}
                className="absolute top-2 right-2 p-1 rounded-lg text-muted hover:text-red-400 hover:bg-white/5 transition-colors"
                aria-label="Delete map"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  return (
    <ToolShell
      stats={
        <>
          <ToolStat
            label="Nodes"
            value={nodeCount || "—"}
            icon={Network}
            accent="purple"
          />
          <ToolStat
            label="Saved maps"
            value={library.length}
            icon={BookOpen}
            accent="pink"
          />
          <ToolStat
            label="Branches"
            value={nodes.length || "—"}
            icon={Layers}
            accent="emerald"
          />
          <ToolStat
            label="Topic"
            value={topic ? "Set" : "—"}
            icon={Sparkles}
            accent="amber"
          />
        </>
      }
      sidebar={sidebar}
    >
      <Card className="border-regal-purple-400/20">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <RegalAIBadge />
          <span className="text-xs text-muted">
            Hierarchical concept maps powered by Regal AI
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Topic</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Photosynthesis, WWI causes, Calculus derivatives…"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste lecture notes, textbook excerpts, or bullet points to expand into a mind map…"
              className="min-h-[140px] mt-1"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            onClick={generate}
            disabled={loading || (!topic.trim() && !notes.trim())}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate mind map
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setTopic("");
              setNotes("");
              setRaw("");
              setActiveId(null);
            }}
            disabled={loading}
          >
            Clear
          </Button>
        </div>
      </Card>

      <Card>
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
          Example topics
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_TOPICS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setTopic(ex)}
              className="text-xs px-3 py-2 rounded-xl bg-white/[0.04] border border-white/8 text-muted hover:text-white hover:border-regal-purple-400/30 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </Card>

      {raw && nodes.length > 0 ? (
        <ToolSection
          title={topic || nodes[0]?.label || "Mind map"}
          description={`${nodeCount} concepts · click branches to expand or collapse`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={copyExport}>
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadExport}>
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={loading}
                onClick={generate}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </Button>
            </div>
          }
        >
          <Card className="border-regal-pink/20 overflow-hidden">
            <div className="p-4 sm:p-6">
              <MindMapTree
                key={activeId ?? "live"}
                nodes={nodes}
                topic={topic}
              />
            </div>
          </Card>
        </ToolSection>
      ) : raw && nodes.length === 0 ? (
        <Card className="border-regal-pink/20">
          <pre className="whitespace-pre-wrap text-sm text-white/90 font-sans leading-relaxed">
            {raw}
          </pre>
          <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
            <Button variant="secondary" size="sm" disabled={loading} onClick={generate}>
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </Button>
          </div>
        </Card>
      ) : !loading ? (
        <ToolEmpty
          icon={Network}
          title="No mind map yet"
          description="Enter a topic or paste notes, then generate a hierarchical concept map."
        />
      ) : null}
    </ToolShell>
  );
}
