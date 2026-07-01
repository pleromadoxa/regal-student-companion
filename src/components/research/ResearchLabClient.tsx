"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain,
  Plus,
  FileText,
  Link2,
  StickyNote,
  Loader2,
  Sparkles,
  MessageSquare,
  List,
  Clock,
  FileBarChart,
  Trash2,
  Download,
  Pencil,
  X,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { askRegalAI } from "@/lib/regal-ai";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/PageHeader";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { downloadTextFile } from "@/lib/format-ai-content";
import { cn } from "@/lib/utils";
import type { ResearchProject, ResearchSource, ResearchNote } from "@/types";

type NoteType = ResearchNote["note_type"];
type MobileTab = "projects" | "sources" | "generate" | "notes";

const NOTE_TYPES: { id: NoteType; label: string; icon: typeof Sparkles; action: string }[] = [
  { id: "summary", label: "Summary", icon: FileText, action: "research_summary" },
  { id: "faq", label: "FAQ", icon: List, action: "research_faq" },
  { id: "timeline", label: "Timeline", icon: Clock, action: "research_timeline" },
  { id: "briefing", label: "Briefing", icon: FileBarChart, action: "research_briefing" },
  { id: "chat", label: "Chat", icon: MessageSquare, action: "research_chat" },
];

export function ResearchLabClient({
  initialProjects,
  userId,
}: {
  initialProjects: (ResearchProject & { sources?: ResearchSource[]; notes?: ResearchNote[] })[];
  userId: string;
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [activeProject, setActiveProject] = useState<ResearchProject | null>(null);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [editProject, setEditProject] = useState<ResearchProject | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState<"note" | "url" | "document">("note");
  const [chatQuestion, setChatQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeNoteType, setActiveNoteType] = useState<NoteType>("summary");
  const [mobileTab, setMobileTab] = useState<MobileTab>("sources");
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  const supabase = createClient();
  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? notes[0] ?? null;

  const stats = useMemo(
    () => ({
      projects: projects.length,
      sources: sources.length,
      notes: notes.length,
    }),
    [projects.length, sources.length, notes.length]
  );

  const loadProject = useCallback(
    async (project: ResearchProject) => {
      setActiveProject(project);
      setSelectedNoteId(null);
      const [{ data: srcs }, { data: nts }] = await Promise.all([
        supabase
          .from("companion_research_sources")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("companion_research_notes")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false }),
      ]);
      setSources((srcs ?? []) as ResearchSource[]);
      const loadedNotes = (nts ?? []) as ResearchNote[];
      setNotes(loadedNotes);
      if (loadedNotes[0]) setSelectedNoteId(loadedNotes[0].id);
    },
    [supabase]
  );

  useEffect(() => {
    if (initialProjects[0] && !activeProject) {
      void loadProject(initialProjects[0]);
    }
  }, [initialProjects, activeProject, loadProject]);

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editProject) {
      const { data } = await supabase
        .from("companion_research_projects")
        .update({ title: projectTitle, description: projectDesc || null })
        .eq("id", editProject.id)
        .select()
        .single();
      if (data) {
        setProjects((prev) => prev.map((p) => (p.id === editProject.id ? (data as ResearchProject) : p)));
        if (activeProject?.id === editProject.id) setActiveProject(data as ResearchProject);
      }
      setEditProject(null);
    } else {
      const { data } = await supabase
        .from("companion_research_projects")
        .insert({ user_id: userId, title: projectTitle, description: projectDesc || null })
        .select()
        .single();
      if (data) {
        const project = data as ResearchProject;
        setProjects((prev) => [project, ...prev]);
        void loadProject(project);
      }
    }
    setProjectTitle("");
    setProjectDesc("");
    setShowNewProject(false);
  };

  const removeProject = async (id: string) => {
    await supabase.from("companion_research_projects").delete().eq("id", id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProject?.id === id) {
      const next = projects.find((p) => p.id !== id);
      if (next) void loadProject(next);
      else {
        setActiveProject(null);
        setSources([]);
        setNotes([]);
      }
    }
    setDeleteProjectId(null);
  };

  const addSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    if (sourceType === "url" && !sourceUrl.trim()) {
      setError("Enter a URL for this source.");
      return;
    }
    if (sourceType !== "url" && !sourceContent.trim()) {
      setError("Add content or notes for this source.");
      return;
    }
    setError(null);
    const { data, error: insertError } = await supabase
      .from("companion_research_sources")
      .insert({
        project_id: activeProject.id,
        user_id: userId,
        title: sourceTitle,
        source_type: sourceType,
        content: sourceContent || null,
        url: sourceUrl || null,
      })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (data) {
      setSources((prev) => [data as ResearchSource, ...prev]);
      setSourceTitle("");
      setSourceContent("");
      setSourceUrl("");
    }
  };

  const deleteSource = async (id: string) => {
    await supabase.from("companion_research_sources").delete().eq("id", id);
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const deleteNote = async (id: string) => {
    await supabase.from("companion_research_notes").delete().eq("id", id);
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (selectedNoteId === id) setSelectedNoteId(next[0]?.id ?? null);
      return next;
    });
  };

  const generateNote = async (noteType: NoteType) => {
    if (!activeProject || sources.length === 0) return;
    setLoading(true);
    setActiveNoteType(noteType);
    setError(null);
    const sourcesText = sources
      .map((s) => {
        const body =
          s.source_type === "url"
            ? `URL: ${s.url ?? ""}${s.content ? `\nNotes: ${s.content}` : ""}`
            : (s.content ?? "").trim() || `[${s.title}]`;
        return `[${s.title}] (${s.source_type})\n${body}`;
      })
      .join("\n\n---\n\n");
    const action = NOTE_TYPES.find((n) => n.id === noteType)?.action ?? "research_summary";
    try {
      const { text } = await askRegalAI({
        action,
        sources: sourcesText,
        question: chatQuestion || undefined,
      });
      const title =
        noteType === "chat"
          ? chatQuestion.slice(0, 80)
          : `${NOTE_TYPES.find((n) => n.id === noteType)?.label} — ${activeProject.title}`;
      const { data: note } = await supabase
        .from("companion_research_notes")
        .insert({
          project_id: activeProject.id,
          user_id: userId,
          title,
          content: text,
          note_type: noteType,
        })
        .select()
        .single();
      if (note) {
        setNotes((prev) => [note as ResearchNote, ...prev]);
        setSelectedNoteId((note as ResearchNote).id);
        setMobileTab("notes");
      }
      setChatQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regal AI generation failed");
    } finally {
      setLoading(false);
    }
  };

  const exportAllNotes = () => {
    if (!activeProject || notes.length === 0) return;
    const body = notes
      .map((n) => `# ${n.title}\n\n${n.content ?? ""}`)
      .join("\n\n---\n\n");
    downloadTextFile(body, `${activeProject.title.replace(/\s+/g, "-").toLowerCase()}-research.md`);
  };

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Regal AI Research Lab"
        description="Notebook-style research workspace — collect sources, generate summaries, FAQs, timelines, and chat with your materials."
        regalAI
        action={
          <Button onClick={() => { setShowNewProject(true); setEditProject(null); setProjectTitle(""); setProjectDesc(""); }}>
            <Plus className="w-4 h-4" /> New Project
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Projects" value={stats.projects} icon={Brain} accent="purple" />
        <StatCard label="Sources" value={stats.sources} icon={BookOpen} accent="emerald" />
        <StatCard label="Notes" value={stats.notes} icon={FileText} accent="pink" />
      </div>

      {(showNewProject || editProject) && (
        <Card className="border-regal-purple-400/20">
          <form onSubmit={saveProject} className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              {editProject ? "Edit project" : "New project"}
            </h2>
            <div>
              <Label>Project title</Label>
              <Input required value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="Climate Policy Literature Review" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">{editProject ? "Save" : "Create"}</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowNewProject(false); setEditProject(null); }}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex lg:hidden gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
        {(["projects", "sources", "generate", "notes"] as MobileTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={cn(
              "flex-1 py-2 text-[10px] font-medium rounded-lg capitalize transition-colors",
              mobileTab === tab ? "bg-regal-purple-500/30 text-white" : "text-muted"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-4 min-h-[560px]">
        <Card className={cn("lg:col-span-2 overflow-y-auto", mobileTab !== "projects" && "hidden lg:block")}>
          <CardHeader>
            <CardTitle className="text-base">Projects</CardTitle>
          </CardHeader>
          {projects.length === 0 ? (
            <p className="text-sm text-muted text-center py-4 px-2">Create a project to begin</p>
          ) : (
            <ul className="space-y-1 px-2 pb-2">
              {projects.map((p) => (
                <li key={p.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => void loadProject(p)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl transition-colors pr-8",
                      activeProject?.id === p.id
                        ? "bg-regal-purple-500/30 border border-regal-purple-400/30"
                        : "hover:bg-white/5"
                    )}
                  >
                    <p className="text-sm font-medium text-white truncate">{p.title}</p>
                    {p.description && (
                      <p className="text-xs text-muted truncate mt-0.5">{p.description}</p>
                    )}
                  </button>
                  <div className="absolute top-2 right-1 flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditProject(p);
                        setProjectTitle(p.title);
                        setProjectDesc(p.description ?? "");
                        setShowNewProject(false);
                      }}
                      className="p-1 text-muted hover:text-white"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteProjectId(p.id);
                      }}
                      className="p-1 text-muted hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {activeProject ? (
          <>
            <Card className={cn("lg:col-span-3 overflow-y-auto", mobileTab !== "sources" && "hidden lg:block")}>
              <CardHeader>
                <CardTitle className="text-base">Sources</CardTitle>
                <CardDescription>{sources.length} added</CardDescription>
              </CardHeader>
              <form onSubmit={addSource} className="space-y-3 mb-4 px-1">
                <Input required placeholder="Source title" value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)} />
                <div className="flex gap-1">
                  {(
                    [
                      { id: "note" as const, icon: StickyNote, label: "Note" },
                      { id: "url" as const, icon: Link2, label: "URL" },
                      { id: "document" as const, icon: FileText, label: "Doc" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSourceType(t.id)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] transition-colors",
                        sourceType === t.id
                          ? "bg-regal-purple-500/30 border-regal-purple-400/40 text-white"
                          : "border-white/10 text-muted"
                      )}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
                {sourceType === "url" ? (
                  <>
                    <Input required placeholder="https://..." value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
                    <Textarea placeholder="Optional notes about this URL..." value={sourceContent} onChange={(e) => setSourceContent(e.target.value)} rows={2} />
                  </>
                ) : (
                  <Textarea
                    required
                    placeholder={sourceType === "document" ? "Paste document text..." : "Paste notes..."}
                    value={sourceContent}
                    onChange={(e) => setSourceContent(e.target.value)}
                    className="min-h-[80px]"
                  />
                )}
                <Button type="submit" size="sm" className="w-full">Add source</Button>
              </form>
              <ul className="space-y-2 px-1">
                {sources.map((s) => (
                  <li key={s.id} className="p-2 rounded-lg bg-white/5 text-xs group flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{s.title}</p>
                      <p className="text-muted capitalize">{s.source_type}</p>
                    </div>
                    <button type="button" onClick={() => void deleteSource(s.id)} className="text-muted hover:text-red-300 shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <div className={cn("lg:col-span-7 space-y-4", mobileTab !== "generate" && mobileTab !== "notes" && "hidden lg:block")}>
              <Card className={cn(mobileTab !== "generate" && "hidden lg:block")}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Regal AI Generate</CardTitle>
                    <RegalAIBadge className="scale-90" />
                  </div>
                  <CardDescription>Outputs from {sources.length} source(s)</CardDescription>
                </CardHeader>
                <div className="flex flex-wrap gap-2 mb-4">
                  {NOTE_TYPES.filter((n) => n.id !== "chat").map((n) => (
                    <Button
                      key={n.id}
                      size="sm"
                      variant="secondary"
                      disabled={loading || sources.length === 0}
                      onClick={() => void generateNote(n.id)}
                    >
                      {loading && activeNoteType === n.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <n.icon className="w-3 h-3" />
                      )}
                      {n.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={chatQuestion}
                    onChange={(e) => setChatQuestion(e.target.value)}
                    placeholder="Ask about your sources..."
                    className="flex-1"
                  />
                  <Button disabled={loading || !chatQuestion.trim() || sources.length === 0} onClick={() => void generateNote("chat")}>
                    {loading && activeNoteType === "chat" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  </Button>
                </div>
                {sources.length === 0 && (
                  <p className="text-xs text-amber-300/80 mt-3">Add at least one source to generate insights.</p>
                )}
                {error && (
                  <p className="text-xs text-red-300 mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">{error}</p>
                )}
              </Card>

              <Card className={cn("overflow-hidden", mobileTab !== "notes" && "hidden lg:block")}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base">Generated notes</CardTitle>
                  {notes.length > 0 && (
                    <Button size="sm" variant="secondary" onClick={exportAllNotes}>
                      <Download className="w-3.5 h-3.5" /> Export all
                    </Button>
                  )}
                </CardHeader>
                {notes.length === 0 ? (
                  <EmptyState icon={Sparkles} title="No notes yet" description="Generate summaries, FAQs, or chat with your research sources." />
                ) : (
                  <div className="grid lg:grid-cols-[220px_1fr] max-h-[480px]">
                    <ul className="border-r border-white/10 overflow-y-auto p-2 space-y-1">
                      {notes.map((note) => (
                        <li key={note.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedNoteId(note.id)}
                            className={cn(
                              "w-full text-left p-2 rounded-lg text-xs transition-colors group",
                              selectedNote?.id === note.id
                                ? "bg-regal-purple-500/25 text-white"
                                : "hover:bg-white/5 text-muted"
                            )}
                          >
                            <p className="font-medium truncate">{note.title}</p>
                            <p className="capitalize text-[10px] opacity-70">{note.note_type}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {selectedNote && (
                      <div className="overflow-y-auto p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <p className="text-sm font-semibold text-white">{selectedNote.title}</p>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                downloadTextFile(
                                  selectedNote.content ?? "",
                                  `${selectedNote.title.slice(0, 40).replace(/\s+/g, "-")}.md`
                                )
                              }
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => void deleteNote(selectedNote.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <MarkdownContent content={selectedNote.content ?? ""} />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </>
        ) : (
          <Card className="lg:col-span-10 flex items-center justify-center">
            <EmptyState icon={Brain} title="Select a project" description="Create or choose a research project to add sources and generate Regal AI insights." />
          </Card>
        )}
      </div>

      {deleteProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <Card className="max-w-sm w-full">
            <p className="text-white font-medium">Delete this project?</p>
            <p className="text-sm text-muted mt-1">All sources and notes will be removed.</p>
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteProjectId(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-500/80 hover:bg-red-500" onClick={() => void removeProject(deleteProjectId)}>Delete</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
