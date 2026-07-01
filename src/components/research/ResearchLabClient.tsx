"use client";

import { useState } from "react";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { askRegalAI } from "@/lib/regal-ai";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import type { ResearchProject, ResearchSource, ResearchNote } from "@/types";

type NoteType = ResearchNote["note_type"];

const NOTE_TYPES: { id: NoteType; label: string; icon: typeof Sparkles; action: string }[] = [
  { id: "summary", label: "Regal AI Summary", icon: FileText, action: "research_summary" },
  { id: "faq", label: "Regal AI FAQ", icon: List, action: "research_faq" },
  { id: "timeline", label: "Regal AI Timeline", icon: Clock, action: "research_summary" },
  { id: "briefing", label: "Regal AI Briefing", icon: FileBarChart, action: "research_briefing" },
  { id: "chat", label: "Regal AI Chat", icon: MessageSquare, action: "research_chat" },
];

export function ResearchLabClient({
  initialProjects,
  userId,
}: {
  initialProjects: (ResearchProject & { sources?: ResearchSource[]; notes?: ResearchNote[] })[];
  userId: string;
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [activeProject, setActiveProject] = useState(initialProjects[0] ?? null);
  const [sources, setSources] = useState<ResearchSource[]>(
    initialProjects[0]?.sources ?? []
  );
  const [notes, setNotes] = useState<ResearchNote[]>(
    initialProjects[0]?.notes ?? []
  );
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState<"note" | "url" | "document">("note");
  const [chatQuestion, setChatQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeNoteType, setActiveNoteType] = useState<NoteType>("summary");

  const supabase = createClient();

  const loadProject = async (project: ResearchProject) => {
    setActiveProject(project);
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
    setNotes((nts ?? []) as ResearchNote[]);
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase
      .from("companion_research_projects")
      .insert({
        user_id: userId,
        title: projectTitle,
        description: projectDesc || null,
      })
      .select()
      .single();

    if (data) {
      const project = data as ResearchProject;
      setProjects((prev) => [project, ...prev]);
      setActiveProject(project);
      setSources([]);
      setNotes([]);
      setProjectTitle("");
      setProjectDesc("");
      setShowNewProject(false);
    }
  };

  const addSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const { data } = await supabase
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

  const generateNote = async (noteType: NoteType) => {
    if (!activeProject || sources.length === 0) return;
    setLoading(true);
    setActiveNoteType(noteType);

    const sourcesText = sources
      .map(
        (s) =>
          `[${s.title}] (${s.source_type})\n${s.content ?? s.url ?? ""}`
      )
      .join("\n\n---\n\n");

    const action =
      NOTE_TYPES.find((n) => n.id === noteType)?.action ?? "research_summary";

    try {
      const data = { result: await askRegalAI({ action, sources: sourcesText, question: chatQuestion || undefined }) };

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
          content: data.result,
          note_type: noteType,
        })
        .select()
        .single();

      if (note) setNotes((prev) => [note as ResearchNote, ...prev]);
      setChatQuestion("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Regal AI Research Lab"
        description="Regal AI research workspace — upload sources, generate insights, and chat with your materials"
        regalAI
        action={
          <Button onClick={() => setShowNewProject(!showNewProject)}>
            <Plus className="w-4 h-4" /> New Project
          </Button>
        }
      />

      {showNewProject && (
        <Card>
          <form onSubmit={createProject} className="space-y-4">
            <div>
              <Label>Project title</Label>
              <Input
                required
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Climate Policy Literature Review"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create Project</Button>
              <Button type="button" variant="ghost" onClick={() => setShowNewProject(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid lg:grid-cols-4 gap-4 min-h-[600px]">
        <Card className="lg:col-span-1 overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-base">Projects</CardTitle>
          </CardHeader>
          {projects.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">
              Create a research project to begin
            </p>
          ) : (
            <ul className="space-y-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadProject(p)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-colors",
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
              ))}
            </ul>
          )}
        </Card>

        {activeProject ? (
          <>
            <Card className="lg:col-span-1 overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-base">Sources</CardTitle>
                <CardDescription>{sources.length} source(s)</CardDescription>
              </CardHeader>

              <form onSubmit={addSource} className="space-y-3 mb-4">
                <Input
                  required
                  placeholder="Source title"
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                />
                <div className="flex gap-1">
                  {(
                    [
                      { id: "note" as const, icon: StickyNote },
                      { id: "url" as const, icon: Link2 },
                      { id: "document" as const, icon: FileText },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSourceType(t.id)}
                      className={cn(
                        "p-2 rounded-lg border transition-colors",
                        sourceType === t.id
                          ? "bg-regal-purple-500/30 border-regal-purple-400/40"
                          : "border-white/10 text-muted"
                      )}
                    >
                      <t.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
                {sourceType === "url" ? (
                  <Input
                    placeholder="https://..."
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                ) : (
                  <Textarea
                    placeholder="Paste content or notes..."
                    value={sourceContent}
                    onChange={(e) => setSourceContent(e.target.value)}
                    className="min-h-[80px]"
                  />
                )}
                <Button type="submit" size="sm" className="w-full">
                  Add Source
                </Button>
              </form>

              <ul className="space-y-2">
                {sources.map((s) => (
                  <li
                    key={s.id}
                    className="p-2 rounded-lg bg-white/5 text-xs group flex justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{s.title}</p>
                      <p className="text-muted capitalize">{s.source_type}</p>
                    </div>
                    <button
                      onClick={() => deleteSource(s.id)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted hover:text-red-300 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Regal AI Generate</CardTitle>
                  <CardDescription>
                    Regal AI-powered outputs from your sources
                  </CardDescription>
                </CardHeader>
                <div className="flex flex-wrap gap-2 mb-4">
                  {NOTE_TYPES.filter((n) => n.id !== "chat").map((n) => (
                    <Button
                      key={n.id}
                      size="sm"
                      variant="secondary"
                      disabled={loading || sources.length === 0}
                      onClick={() => generateNote(n.id)}
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
                    placeholder="Ask a question about your sources..."
                    className="flex-1"
                  />
                  <Button
                    disabled={loading || !chatQuestion.trim() || sources.length === 0}
                    onClick={() => generateNote("chat")}
                  >
                    {loading && activeNoteType === "chat" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {sources.length === 0 && (
                  <p className="text-xs text-amber-300/80 mt-3">
                    Add at least one source to generate insights
                  </p>
                )}
              </Card>

              <Card className="overflow-y-auto max-h-[500px]">
                <CardHeader>
                  <CardTitle className="text-base">Generated Notes</CardTitle>
                </CardHeader>
                {notes.length === 0 ? (
                  <p className="text-sm text-muted text-center py-8">
                    Generate summaries, FAQs, briefings, or chat with your research
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {notes.map((note) => (
                      <li
                        key={note.id}
                        className="p-4 rounded-xl bg-white/5 border border-white/5"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-regal-pink" />
                          <p className="text-sm font-medium text-white">{note.title}</p>
                          <span className="text-xs text-muted capitalize ml-auto">
                            {note.note_type}
                          </span>
                        </div>
                        <pre className="whitespace-pre-wrap text-sm text-white/85 font-sans">
                          {note.content}
                        </pre>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        ) : (
          <Card className="lg:col-span-3 flex items-center justify-center">
            <div className="text-center text-muted py-16">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select or create a research project</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
