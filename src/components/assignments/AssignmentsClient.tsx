"use client";

import { useState } from "react";
import {
  FileText,
  Upload,
  Scan,
  Quote,
  PenLine,
  Mic,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { askRegalAI, REGAL_AI_NAME } from "@/lib/regal-ai";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { cn } from "@/lib/utils";
import type { Assignment } from "@/types";

type ToolTab = "scan" | "cite" | "essay" | "transcribe" | "humanize";

const TOOLS: { id: ToolTab; label: string; icon: typeof Scan; desc: string }[] = [
  { id: "scan", label: "Regal AI Scan", icon: Scan, desc: "Analyze uploaded documents" },
  { id: "cite", label: "Regal AI Citations", icon: Quote, desc: "Generate formatted citations" },
  { id: "essay", label: "Regal AI Essay Guide", icon: PenLine, desc: "Structured writing guidance" },
  { id: "transcribe", label: "Regal AI Transcription", icon: Mic, desc: "Clean up lecture notes" },
  { id: "humanize", label: "Regal AI Humanize", icon: Sparkles, desc: "Natural academic voice" },
];

export function AssignmentsClient({
  initialAssignments,
}: {
  initialAssignments: Assignment[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [activeTab, setActiveTab] = useState<ToolTab>("scan");
  const [inputText, setInputText] = useState("");
  const [essayTopic, setEssayTopic] = useState("");
  const [citationStyle, setCitationStyle] = useState("APA");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCourse, setNewCourse] = useState("");

  const supabase = createClient();

  const refresh = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("companion_assignments")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setAssignments(data as Assignment[]);
  };

  const runRegalAI = async () => {
    setLoading(true);
    setResult("");
    try {
      const body: Record<string, string> = { action: activeTab };
      if (activeTab === "essay") {
        body.topic = essayTopic;
        body.text = inputText;
      } else if (activeTab === "cite") {
        body.text = inputText;
        body.style = citationStyle;
      } else {
        body.text = inputText;
      }
      setResult(await askRegalAI(body as unknown as Parameters<typeof askRegalAI>[0]));
    } catch (err) {
      setResult(err instanceof Error ? err.message : `${REGAL_AI_NAME} request failed`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("companion-documents")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const text = await file.text().catch(() => `[Binary file: ${file.name}]`);

      const { data: assignment } = await supabase
        .from("companion_assignments")
        .insert({
          user_id: user.id,
          title: file.name,
          status: "draft",
        })
        .select()
        .single();

      if (assignment) {
        await supabase.from("companion_assignment_documents").insert({
          assignment_id: assignment.id,
          user_id: user.id,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type,
          scan_status: "scanning",
        });

        setInputText(text.slice(0, 10000));
        setActiveTab("scan");
        await refresh();
      }
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("companion_assignments").insert({
      user_id: user.id,
      title: newTitle,
      course: newCourse || null,
    });

    setNewTitle("");
    setNewCourse("");
    setShowNew(false);
    await refresh();
  };

  const deleteAssignment = async (id: string) => {
    await supabase.from("companion_assignments").delete().eq("id", id);
    await refresh();
  };

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Assignment Suite"
        description="Upload, scan, cite, write, transcribe, and humanize — all powered by Regal AI"
        regalAI
        action={
          <Button onClick={() => setShowNew(!showNew)}>
            <Plus className="w-4 h-4" /> New Assignment
          </Button>
        }
      />

      {showNew && (
        <Card>
          <form onSubmit={createAssignment} className="flex gap-3 flex-wrap">
            <Input
              required
              placeholder="Assignment title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Input
              placeholder="Course (optional)"
              value={newCourse}
              onChange={(e) => setNewCourse(e.target.value)}
              className="w-48"
            />
            <Button type="submit">Create</Button>
          </form>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Your Assignments</CardTitle>
          </CardHeader>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">No assignments yet</p>
          ) : (
            <ul className="space-y-2">
              {assignments.map((a) => (
                <li
                  key={a.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/5 group flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{a.title}</p>
                    <p className="text-xs text-muted capitalize">
                      {a.course ?? "No course"} · {a.status.replace("_", " ")}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteAssignment(a.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Upload</CardTitle>
              <CardDescription>
                Upload PDF, DOCX, or TXT for real-time Regal AI scanning
              </CardDescription>
            </CardHeader>
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-regal-purple-400/50 transition-colors">
              <Upload className="w-8 h-8 text-regal-purple-300 mb-2" />
              <p className="text-sm text-white font-medium">
                {uploading ? "Uploading..." : "Drop a file or click to upload"}
              </p>
              <p className="text-xs text-muted mt-1">PDF, DOCX, TXT up to 50MB</p>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </Card>

          <div className="flex flex-wrap gap-2">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTab(tool.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                  activeTab === tool.id
                    ? "bg-regal-purple-500/30 border-regal-purple-400/40 text-white"
                    : "bg-white/5 border-white/10 text-muted hover:text-white"
                )}
              >
                <tool.icon className="w-4 h-4" />
                {tool.label}
              </button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{TOOLS.find((t) => t.id === activeTab)?.label}</CardTitle>
              <CardDescription>
                {TOOLS.find((t) => t.id === activeTab)?.desc}
              </CardDescription>
            </CardHeader>

            <div className="space-y-4">
              {activeTab === "essay" && (
                <div>
                  <Label>Essay topic</Label>
                  <Input
                    value={essayTopic}
                    onChange={(e) => setEssayTopic(e.target.value)}
                    placeholder="The impact of climate change on biodiversity"
                  />
                </div>
              )}

              {activeTab === "cite" && (
                <div>
                  <Label>Citation style</Label>
                  <Select
                    value={citationStyle}
                    onChange={(e) => setCitationStyle(e.target.value)}
                  >
                    <option value="APA">APA 7th</option>
                    <option value="MLA">MLA 9th</option>
                    <option value="Chicago">Chicago</option>
                    <option value="Harvard">Harvard</option>
                  </Select>
                </div>
              )}

              {activeTab !== "essay" && (
                <div>
                  <Label>
                    {activeTab === "cite"
                      ? "Source information"
                      : "Text content"}
                  </Label>
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      activeTab === "scan"
                        ? "Paste document text or upload a file above..."
                        : activeTab === "cite"
                          ? "Author, title, year, URL, etc."
                          : "Paste your text here..."
                    }
                    className="min-h-[150px]"
                  />
                </div>
              )}

              {activeTab === "essay" && (
                <div>
                  <Label>Requirements / notes</Label>
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Word count, key points to cover, professor requirements..."
                  />
                </div>
              )}

              <Button
                onClick={runRegalAI}
                disabled={loading || (activeTab === "essay" ? !essayTopic : !inputText.trim())}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Run {REGAL_AI_NAME}
                  </>
                )}
              </Button>
            </div>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" /> {REGAL_AI_NAME} Result
                </CardTitle>
                <RegalAIBadge />
              </CardHeader>
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-white/90 font-sans">
                  {result}
                </pre>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
