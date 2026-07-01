"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { Task, TaskPriority, TaskStatus } from "@/types";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "text-emerald-300",
  medium: "text-amber-300",
  high: "text-red-300",
};

export function TasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const toast = useToast();
  const [tasks, setTasks] = useState(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  const supabase = createClient();

  const refresh = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("companion_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setTasks(data as Task[]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("companion_tasks").insert({
      user_id: user.id,
      title,
      description: description || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
    });

    if (error) {
      toast.error("Could not create task. Please try again.");
      setLoading(false);
      return;
    }

    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("medium");
    setShowForm(false);
    await refresh();
    setLoading(false);
  };

  const updateStatus = async (id: string, status: TaskStatus) => {
    const { error } = await supabase.from("companion_tasks").update({ status }).eq("id", id);
    if (error) {
      toast.error("Could not update task.");
      return;
    }
    await refresh();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("companion_tasks").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete task.");
      return;
    }
    await refresh();
  };

  const grouped = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Task Management</h1>
          <p className="text-muted text-sm mt-1">
            Organize assignments, readings, and study goals
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" /> New Task
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Complete chapter 5 review"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details..."
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Due date</Label>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Task"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {(
          [
            { key: "todo" as const, label: "To Do" },
            { key: "in_progress" as const, label: "In Progress" },
            { key: "done" as const, label: "Done" },
          ] as const
        ).map((col) => (
          <Card key={col.key} className="min-h-[200px]">
            <CardHeader>
              <CardTitle className="text-base">
                {col.label}{" "}
                <span className="text-muted font-normal">
                  ({grouped[col.key].length})
                </span>
              </CardTitle>
            </CardHeader>
            <ul className="space-y-2">
              {grouped[col.key].map((task) => (
                <li
                  key={task.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/5 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className={PRIORITY_COLORS[task.priority]}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span className="text-muted">
                            {format(new Date(task.due_date), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-300 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {col.key !== "todo" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateStatus(
                            task.id,
                            col.key === "in_progress" ? "todo" : "in_progress"
                          )
                        }
                      >
                        ← Back
                      </Button>
                    )}
                    {col.key !== "done" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          updateStatus(
                            task.id,
                            col.key === "todo" ? "in_progress" : "done"
                          )
                        }
                      >
                        {col.key === "todo" ? "Start →" : "Complete ✓"}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
