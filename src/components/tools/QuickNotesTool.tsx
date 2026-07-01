"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StickyNote,
  Search,
  Sparkles,
  Pin,
  PinOff,
  Trash2,
  Loader2,
  Plus,
  List,
  Maximize2,
  Clock,
  Hash,
  Tag,
  Check,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { askRegalAI } from "@/lib/regal-ai";
import {
  useUserId,
  ToolShell,
  ToolStat,
  ToolSection,
  ToolEmpty,
  ToolResult,
} from "@/components/tools/shared";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { cn } from "@/lib/utils";

type Note = {
  id: string;
  title: string;
  content: string;
  course_label: string | null;
  pinned: boolean;
  updated_at: string;
  created_at: string;
};

type AIAction = "summarize" | "expand" | "bullet_points";

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function QuickNotesTool() {
  const { uid, ready } = useUserId();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [courseLabel, setCourseLabel] = useState("");
  const [search, setSearch] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiAction, setAiAction] = useState<AIAction | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase
      .from("companion_quick_notes")
      .select("id, title, content, course_label, pinned, updated_at, created_at")
      .eq("user_id", uid)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    setNotes((data ?? []) as Note[]);
  }, [uid, supabase]);

  useEffect(() => {
    if (uid) void load();
  }, [uid, load]);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeId) ?? null,
    [notes, activeId]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.course_label ?? "").toLowerCase().includes(q)
    );
  }, [notes, search]);

  const wordCount = countWords(content);

  const lastEditedLabel = activeNote?.updated_at
    ? formatDistanceToNow(new Date(activeNote.updated_at), { addSuffix: true })
    : "—";

  const selectNote = (n: Note) => {
    setActiveId(n.id);
    setIsDrafting(false);
    setTitle(n.title);
    setContent(n.content);
    setCourseLabel(n.course_label ?? "");
    setAiResult("");
    setAiAction(null);
  };

  const newNote = () => {
    setActiveId(null);
    setIsDrafting(true);
    setTitle("");
    setContent("");
    setCourseLabel("");
    setAiResult("");
    setAiAction(null);
  };

  const saveNote = useCallback(async () => {
    if (!uid) return;
    const hasContent = title.trim() || content.trim() || courseLabel.trim();
    if (!hasContent) return;

    setSaving(true);
    setSavedFlash(false);
    try {
      const payload = {
        title: title.trim() || "Untitled",
        content,
        course_label: courseLabel.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (activeId) {
        await supabase
          .from("companion_quick_notes")
          .update(payload)
          .eq("id", activeId);
      } else {
        const { data } = await supabase
          .from("companion_quick_notes")
          .insert({ user_id: uid, ...payload })
          .select("id, title, content, course_label, pinned, updated_at, created_at")
          .single();
        if (data) {
          setActiveId(data.id);
          setIsDrafting(false);
        }
      }
      await load();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [uid, activeId, title, content, courseLabel, supabase, load]);

  const handleBlur = () => {
    void saveNote();
  };

  const remove = async (id: string) => {
    await supabase.from("companion_quick_notes").delete().eq("id", id);
    setNotes((n) => n.filter((x) => x.id !== id));
    if (activeId === id) newNote();
  };

  const togglePin = async (id: string, pinned: boolean) => {
    await supabase
      .from("companion_quick_notes")
      .update({ pinned: !pinned, updated_at: new Date().toISOString() })
      .eq("id", id);
    await load();
  };

  const runAI = async (action: AIAction) => {
    if (!content.trim()) return;
    setAiLoading(true);
    setAiAction(action);
    setAiResult("");
    try {
      setAiResult((await askRegalAI({ action, text: content })).text);
    } catch (e) {
      setAiResult(e instanceof Error ? e.message : "Regal AI error");
    } finally {
      setAiLoading(false);
    }
  };

  const aiTitles: Record<AIAction, string> = {
    summarize: "Regal AI Summary",
    expand: "Regal AI Expanded Notes",
    bullet_points: "Regal AI Bullet Points",
  };

  const showEditor =
    activeId !== null || isDrafting || title || content || courseLabel;
  const showEmpty = ready && uid && notes.length === 0 && !showEditor;

  const notesSidebar = (
    <Card className="lg:max-h-[calc(100vh-12rem)] flex flex-col border-regal-purple-400/15">
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
        <h3 className="text-sm font-bold text-white">All notes</h3>
        <Button variant="secondary" size="sm" onClick={newNote}>
          <Plus className="w-3.5 h-3.5" />
          New
        </Button>
      </div>
      <div className="relative mb-3 shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes…"
          className="pl-8 text-sm"
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[200px] pr-0.5">
        {!ready ? (
          <div className="shimmer h-20 rounded-xl" />
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted py-6 text-center">
            {search.trim() ? "No matching notes" : "No notes yet"}
          </p>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={cn(
                "group rounded-xl border transition-colors",
                activeId === n.id
                  ? "border-regal-purple-400/40 bg-regal-purple-500/10"
                  : "border-white/5 hover:border-white/15"
              )}
            >
              <button
                type="button"
                onClick={() => selectNote(n)}
                className="w-full text-left p-2.5"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {n.pinned && (
                    <Pin className="w-3 h-3 text-regal-pink shrink-0 fill-regal-pink/30" />
                  )}
                  <p className="text-sm font-medium text-white truncate flex-1">
                    {n.title || "Untitled"}
                  </p>
                </div>
                {n.course_label && (
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-regal-purple-300 mt-1">
                    {n.course_label}
                  </span>
                )}
                <p className="text-xs text-muted line-clamp-2 mt-0.5">
                  {n.content || "Empty note"}
                </p>
                <p className="text-[10px] text-muted/80 mt-1">
                  {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true })}
                </p>
              </button>
              <div className="flex justify-end gap-0.5 px-2 pb-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => togglePin(n.id, n.pinned)}
                  title={n.pinned ? "Unpin" : "Pin"}
                >
                  {n.pinned ? (
                    <PinOff className="w-3.5 h-3.5" />
                  ) : (
                    <Pin className="w-3.5 h-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => remove(n.id)}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-300" />
                </Button>
              </div>
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
          <ToolStat label="Notes" value={notes.length} icon={StickyNote} accent="purple" />
          <ToolStat label="Words" value={wordCount} icon={Hash} accent="pink" />
          <ToolStat
            label="Course"
            value={courseLabel.trim() || "—"}
            icon={Tag}
            accent="emerald"
          />
          <ToolStat label="Last edited" value={lastEditedLabel} icon={Clock} accent="amber" />
        </>
      }
    >
      <div className="grid lg:grid-cols-[minmax(260px,300px)_1fr] gap-6 items-start">
        <aside className="lg:sticky lg:top-6">{notesSidebar}</aside>

        <div className="space-y-6 min-w-0">
          {!uid && ready ? (
            <ToolEmpty
              icon={StickyNote}
              title="Sign in required"
              description="Log in to capture and sync your lecture notes."
            />
          ) : showEmpty ? (
            <ToolEmpty
              icon={StickyNote}
              title="No notes yet"
              description="Capture lecture takeaways, study summaries, and ideas — Regal AI can summarize and expand them."
              action={
                <Button onClick={newNote}>
                  <Plus className="w-4 h-4" />
                  Create your first note
                </Button>
              }
            />
          ) : showEditor ? (
            <>
              <ToolSection
                title="Editor"
                description="Changes save automatically when you leave a field"
                action={
                  <span className="text-xs text-muted flex items-center gap-1.5">
                    {saving ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Saving…
                      </>
                    ) : savedFlash ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Saved
                      </>
                    ) : activeNote ? (
                      <>
                        <Clock className="w-3 h-3" />
                        {format(new Date(activeNote.updated_at), "MMM d, yyyy · h:mm a")}
                      </>
                    ) : null}
                  </span>
                }
              >
                <Card className="space-y-4 border-regal-purple-400/15">
                  <div className="flex flex-wrap items-center gap-2">
                    <RegalAIBadge />
                    <span className="text-xs text-muted">
                      Summarize, expand, or reformat with Regal AI
                    </span>
                  </div>

                  <div>
                    <Label>Title</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={handleBlur}
                      placeholder="Note title"
                      className="text-base font-medium"
                    />
                  </div>

                  <div>
                    <Label>Course / tag</Label>
                    <Input
                      value={courseLabel}
                      onChange={(e) => setCourseLabel(e.target.value)}
                      onBlur={handleBlur}
                      placeholder="e.g. BIO 201, Midterm, Lab"
                    />
                  </div>

                  <div>
                    <Label>Content</Label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onBlur={handleBlur}
                      className="min-h-[280px] text-sm leading-relaxed"
                      placeholder="Lecture notes, ideas, study takeaways…"
                    />
                    <p className="text-xs text-muted mt-2 tabular-nums">
                      {wordCount} {wordCount === 1 ? "word" : "words"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-white/10">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => runAI("summarize")}
                      disabled={aiLoading || !content.trim()}
                    >
                      {aiLoading && aiAction === "summarize" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Summarize
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => runAI("expand")}
                      disabled={aiLoading || !content.trim()}
                    >
                      {aiLoading && aiAction === "expand" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" />
                      )}
                      Expand
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => runAI("bullet_points")}
                      disabled={aiLoading || !content.trim()}
                    >
                      {aiLoading && aiAction === "bullet_points" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <List className="w-3.5 h-3.5" />
                      )}
                      Bullet points
                    </Button>
                    {activeId && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const n = notes.find((x) => x.id === activeId);
                            if (n) togglePin(n.id, n.pinned);
                          }}
                        >
                          {activeNote?.pinned ? (
                            <PinOff className="w-3.5 h-3.5" />
                          ) : (
                            <Pin className="w-3.5 h-3.5" />
                          )}
                          {activeNote?.pinned ? "Unpin" : "Pin"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(activeId)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-300" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              </ToolSection>

              {aiResult && aiAction && (
                <ToolResult
                  title={aiTitles[aiAction]}
                  actions={<RegalAIBadge />}
                >
                  {aiResult}
                </ToolResult>
              )}
            </>
          ) : (
            <ToolEmpty
              icon={StickyNote}
              title="Select or create a note"
              description="Pick a note from the sidebar or start a new one."
              action={
                <Button onClick={newNote}>
                  <Plus className="w-4 h-4" />
                  New note
                </Button>
              }
            />
          )}
        </div>
      </div>
    </ToolShell>
  );
}

export { QuickNotesTool as NotesTool };
