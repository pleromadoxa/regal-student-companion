"use client";

import { useMemo, useState } from "react";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import {
  Plus,
  Trash2,
  Loader2,
  Search,
  Pencil,
  Sparkles,
  CheckSquare,
  Clock,
  AlertTriangle,
  LayoutGrid,
  List,
  X,
  Tag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { askRegalAI } from "@/lib/regal-ai";
import { incrementEngagement } from "@/lib/engagement";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/PageHeader";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority, TaskStatus } from "@/types";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "text-emerald-300 bg-emerald-500/15 border-emerald-500/25",
  medium: "text-amber-300 bg-amber-500/15 border-amber-500/25",
  high: "text-red-300 bg-red-500/15 border-red-500/25",
};

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

type ViewMode = "board" | "list";
type FilterStatus = "all" | TaskStatus;

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function sortTasks(a: Task, b: Task): number {
  const pa = PRIORITY_ORDER[a.priority];
  const pb = PRIORITY_ORDER[b.priority];
  if (pa !== pb) return pa - pb;
  if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  if (a.due_date) return -1;
  if (b.due_date) return 1;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function dueLabel(due: string | null): { text: string; urgent: boolean } | null {
  if (!due) return null;
  const d = new Date(due);
  if (isToday(d)) return { text: "Due today", urgent: true };
  if (isPast(d)) return { text: "Overdue", urgent: true };
  const days = differenceInDays(d, new Date());
  if (days <= 3) return { text: `Due in ${days}d`, urgent: true };
  return { text: format(d, "MMM d"), urgent: false };
}

export function TasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const toast = useToast();
  const [tasks, setTasks] = useState(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiTaskId, setAiTaskId] = useState<string | null>(null);
  const [aiPlan, setAiPlan] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("board");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [tagsInput, setTagsInput] = useState("");

  const supabase = createClient();

  const stats = useMemo(() => {
    const open = tasks.filter((t) => t.status !== "done");
    const overdue = open.filter(
      (t) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
    );
    return {
      total: tasks.length,
      open: open.length,
      done: tasks.filter((t) => t.status === "done").length,
      overdue: overdue.length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
    };
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (filterStatus !== "all" && t.status !== filterStatus) return false;
        if (filterPriority !== "all" && t.priority !== filterPriority) return false;
        if (!q) return true;
        const hay = [t.title, t.description, ...(t.tags ?? [])].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort(sortTasks);
  }, [tasks, search, filterStatus, filterPriority]);

  const grouped = useMemo(
    () => ({
      todo: filtered.filter((t) => t.status === "todo"),
      in_progress: filtered.filter((t) => t.status === "in_progress"),
      done: filtered.filter((t) => t.status === "done"),
    }),
    [filtered]
  );

  const refresh = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("companion_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setTasks(data as Task[]);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("medium");
    setTagsInput("");
    setEditTask(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDueDate(task.due_date ? task.due_date.slice(0, 16) : "");
    setPriority(task.priority);
    setTagsInput((task.tags ?? []).join(", "));
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      tags: parseTags(tagsInput),
    };

    if (editTask) {
      const { error } = await supabase.from("companion_tasks").update(payload).eq("id", editTask.id);
      if (error) toast.error("Could not update task.");
      else toast.success("Task updated.");
    } else {
      const { error } = await supabase.from("companion_tasks").insert({
        user_id: user.id,
        ...payload,
      });
      if (error) toast.error("Could not create task.");
      else toast.success("Task created.");
    }

    setShowForm(false);
    resetForm();
    await refresh();
    setLoading(false);
  };

  const updateStatus = async (id: string, status: TaskStatus) => {
    const prev = tasks.find((t) => t.id === id);
    const { error } = await supabase.from("companion_tasks").update({ status }).eq("id", id);
    if (error) {
      toast.error("Could not update task.");
      return;
    }
    if (status === "done" && prev?.status !== "done") {
      void incrementEngagement(3);
      toast.success("Task complete — +3 engagement points!");
    }
    await refresh();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("companion_tasks").delete().eq("id", id);
    if (error) toast.error("Could not delete task.");
    else toast.success("Task deleted.");
    setDeleteId(null);
    await refresh();
  };

  const breakdownWithAI = async (task: Task) => {
    setAiTaskId(task.id);
    setAiPlan(null);
    try {
      const { text } = await askRegalAI({
        action: "study_plan",
        text: [
          `Task: ${task.title}`,
          task.description && `Details: ${task.description}`,
          task.due_date && `Due: ${task.due_date}`,
          `Priority: ${task.priority}`,
          (task.tags ?? []).length > 0 && `Tags: ${task.tags.join(", ")}`,
          "",
          "Break this into actionable sub-steps with time estimates. Format as markdown with checkboxes.",
        ]
          .filter(Boolean)
          .join("\n"),
        topic: task.title,
        subject: "Task management",
      });
      setAiPlan(text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Regal AI unavailable");
    } finally {
      setAiTaskId(null);
    }
  };

  const renderTaskCard = (task: Task, col: TaskStatus) => {
    const due = dueLabel(task.due_date);
    return (
      <li
        key={task.id}
        className={cn(
          "p-3 rounded-xl border group transition-all",
          due?.urgent && col !== "done"
            ? "bg-red-500/5 border-red-500/20"
            : "bg-white/5 border-white/5 hover:border-white/15"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">{task.title}</p>
            {task.description && (
              <p className="text-xs text-muted mt-1 line-clamp-2">{task.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border",
                  PRIORITY_COLORS[task.priority]
                )}
              >
                {task.priority}
              </span>
              {due && (
                <span
                  className={cn(
                    "text-[10px] flex items-center gap-0.5",
                    due.urgent ? "text-red-300" : "text-muted"
                  )}
                >
                  {due.urgent ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {due.text}
                </span>
              )}
            </div>
            {(task.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-regal-purple-500/15 text-regal-purple-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => openEdit(task)}
              className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/10"
              aria-label="Edit task"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void breakdownWithAI(task)}
              disabled={aiTaskId === task.id}
              className="p-1.5 rounded-lg text-muted hover:text-regal-pink hover:bg-regal-pink/10"
              aria-label="AI breakdown"
            >
              {aiTaskId === task.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setDeleteId(task.id)}
              className="p-1.5 rounded-lg text-muted hover:text-red-300 hover:bg-red-500/10"
              aria-label="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {col !== "todo" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateStatus(task.id, col === "in_progress" ? "todo" : "in_progress")}
            >
              ← Back
            </Button>
          )}
          {col !== "done" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => updateStatus(task.id, col === "todo" ? "in_progress" : "done")}
            >
              {col === "todo" ? "Start →" : "Complete ✓"}
            </Button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Task Management"
        description="Organize assignments, readings, and study goals — with Regal AI breakdowns and engagement rewards when you finish."
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Task
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Open tasks" value={stats.open} icon={CheckSquare} accent="purple" />
        <StatCard label="In progress" value={stats.inProgress} icon={Clock} accent="amber" />
        <StatCard label="Completed" value={stats.done} icon={CheckSquare} accent="emerald" />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} accent="pink" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, tags..."
              className="pl-9"
            />
          </div>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="sm:w-36"
          >
            <option value="all">All status</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </Select>
          <Select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as TaskPriority | "all")}
            className="sm:w-36"
          >
            <option value="all">All priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
          <div className="flex rounded-xl border border-white/10 p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === "board" ? "bg-regal-purple-500/30 text-white" : "text-muted"
              )}
              aria-label="Board view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === "list" ? "bg-regal-purple-500/30 text-white" : "text-muted"
              )}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {showForm && (
        <Card className="border-regal-purple-400/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {editTask ? "Edit task" : "New task"}
            </h2>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="text-muted hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Complete chapter 5 review" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details..." rows={3} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Due date</Label>
                <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Tags (comma-separated)
              </Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="exam, reading, urgent" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editTask ? "Save changes" : "Create task"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {aiPlan && (
        <Card className="border-regal-pink/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RegalAIBadge />
              <p className="text-sm font-semibold text-white">Regal AI task breakdown</p>
            </div>
            <button type="button" onClick={() => setAiPlan(null)} className="text-muted hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <MarkdownContent content={aiPlan} />
        </Card>
      )}

      {tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={CheckSquare}
            title="No tasks yet"
            description="Create your first task to track assignments, readings, and study goals. Complete tasks to earn engagement points."
            action={
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4" /> Add your first task
              </Button>
            }
          />
        </Card>
      ) : viewMode === "board" ? (
        <div className="grid lg:grid-cols-3 gap-4">
          {(
            [
              { key: "todo" as const, label: "To Do", color: "border-white/10" },
              { key: "in_progress" as const, label: "In Progress", color: "border-amber-500/20" },
              { key: "done" as const, label: "Done", color: "border-emerald-500/20" },
            ] as const
          ).map((col) => (
            <Card key={col.key} className={cn("min-h-[240px]", col.color)}>
              <CardHeader>
                <CardTitle className="text-base">
                  {col.label}{" "}
                  <span className="text-muted font-normal">({grouped[col.key].length})</span>
                </CardTitle>
              </CardHeader>
              {grouped[col.key].length === 0 ? (
                <p className="text-xs text-muted text-center py-6 px-4">No tasks in this column</p>
              ) : (
                <ul className="space-y-2">{grouped[col.key].map((t) => renderTaskCard(t, col.key))}</ul>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">No tasks match your filters</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {filtered.map((task) => (
                <li key={task.id} className="py-3 first:pt-0">
                  {renderTaskCard(task, task.status)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <Card className="max-w-sm w-full">
            <p className="text-white font-medium">Delete this task?</p>
            <p className="text-sm text-muted mt-1">This cannot be undone.</p>
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-red-500/80 hover:bg-red-500" onClick={() => void deleteTask(deleteId)}>
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
