"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  BookMarked,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Library,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Select } from "@/components/ui/Input";
import {
  ToolShell,
  ToolStat,
  ToolSection,
  ToolEmpty,
  useUserId,
} from "./shared";
import { cn } from "@/lib/utils";

type ReadingStatus = "to_read" | "reading" | "done";

type Book = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  status: ReadingStatus;
  notes: string | null;
  priority: number;
};

const COLUMNS: {
  id: ReadingStatus;
  label: string;
  accent: string;
  border: string;
}[] = [
  {
    id: "to_read",
    label: "To Read",
    accent: "text-regal-purple-300",
    border: "border-regal-purple-400/25",
  },
  {
    id: "reading",
    label: "Reading",
    accent: "text-amber-300",
    border: "border-amber-400/25",
  },
  {
    id: "done",
    label: "Done",
    accent: "text-emerald-300",
    border: "border-emerald-400/25",
  },
];

const PRIORITY_LABELS = ["Low", "Low+", "Medium", "High", "Urgent"] as const;

const STATUS_ORDER: ReadingStatus[] = ["to_read", "reading", "done"];

function parseNotes(notes: string | null): { progress: number; text: string } {
  if (!notes) return { progress: 0, text: "" };
  try {
    const parsed = JSON.parse(notes) as { progress?: number; text?: string };
    if (parsed && typeof parsed === "object") {
      return {
        progress: Math.min(100, Math.max(0, Number(parsed.progress) || 0)),
        text: String(parsed.text ?? ""),
      };
    }
  } catch {
    /* plain text legacy */
  }
  return { progress: 0, text: notes };
}

function serializeNotes(progress: number, text: string): string | null {
  const trimmed = text.trim();
  if (progress === 0 && !trimmed) return null;
  return JSON.stringify({ progress, text: trimmed });
}

function priorityBadge(priority: number) {
  const colors = [
    "bg-white/5 text-muted",
    "bg-white/8 text-white/70",
    "bg-regal-purple-500/20 text-regal-purple-200",
    "bg-amber-500/20 text-amber-200",
    "bg-regal-pink/20 text-regal-pink",
  ];
  const idx = Math.min(4, Math.max(0, priority - 1));
  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
        colors[idx]
      )}
    >
      {PRIORITY_LABELS[idx]}
    </span>
  );
}

function BookCard({
  book,
  onMove,
  onProgress,
  onDelete,
  onNotes,
}: {
  book: Book;
  onMove: (id: string, status: ReadingStatus) => void;
  onProgress: (id: string, progress: number) => void;
  onDelete: (id: string) => void;
  onNotes: (id: string, text: string) => void;
}) {
  const { progress, text } = parseNotes(book.notes);
  const idx = STATUS_ORDER.indexOf(book.status);
  const prev = idx > 0 ? STATUS_ORDER[idx - 1] : null;
  const next = idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;

  return (
    <Card className="p-4 space-y-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white leading-snug">{book.title}</p>
          {book.author && (
            <p className="text-xs text-muted mt-0.5 truncate">{book.author}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {priorityBadge(book.priority)}
          <button
            type="button"
            onClick={() => onDelete(book.id)}
            className="p-1 rounded-lg text-muted hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete book"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {book.status === "reading" && (
        <div>
          <div className="flex items-center justify-between text-[10px] text-muted mb-1">
            <span>Progress</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => onProgress(book.id, +e.target.value)}
            className="w-full accent-regal-purple-400"
          />
          <div
            className="h-1 rounded-full bg-white/10 mt-1.5 overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-gradient-to-r from-regal-purple-500 to-regal-pink transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {text && book.status !== "reading" && (
        <p className="text-xs text-muted line-clamp-2">{text}</p>
      )}

      {book.status === "reading" && (
        <Textarea
          value={text}
          onChange={(e) => onNotes(book.id, e.target.value)}
          placeholder="Reading notes…"
          className="min-h-[60px] text-xs"
        />
      )}

      <div className="flex items-center gap-1.5 pt-1">
        {prev && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onMove(book.id, prev)}
            className="flex-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {prev === "to_read" ? "Back" : "To read"}
          </Button>
        )}
        {next && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onMove(book.id, next)}
            className="flex-1"
          >
            {next === "done" ? "Finish" : "Start"}
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
}

export function ReadingListTool() {
  const { uid, ready } = useUserId();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"title" | "priority">("priority");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState(3);
  const [adding, setAdding] = useState(false);
  const supabase = createClient();

  const fetchBooks = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const { data } = await supabase
      .from("companion_reading_list")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setBooks((data as Book[]) ?? []);
    setLoading(false);
  }, [uid, supabase]);

  useEffect(() => {
    if (ready && uid) fetchBooks();
    if (ready && !uid) setLoading(false);
  }, [ready, uid, fetchBooks]);

  const addBook = async () => {
    if (!uid || !title.trim()) return;
    setAdding(true);
    const { data } = await supabase
      .from("companion_reading_list")
      .insert({
        user_id: uid,
        title: title.trim(),
        author: author.trim() || null,
        notes: notes.trim() || null,
        priority,
        status: "to_read",
      })
      .select()
      .single();
    if (data) {
      setBooks((b) => [data as Book, ...b]);
      setTitle("");
      setAuthor("");
      setNotes("");
      setPriority(3);
    }
    setAdding(false);
  };

  const updateStatus = async (id: string, status: ReadingStatus) => {
    const book = books.find((b) => b.id === id);
    if (!book) return;
    let nextNotes = book.notes;
    if (status === "done") {
      const { progress, text } = parseNotes(book.notes);
      nextNotes = serializeNotes(100, text);
    } else if (status === "to_read") {
      const { text } = parseNotes(book.notes);
      nextNotes = serializeNotes(0, text);
    }
    await supabase
      .from("companion_reading_list")
      .update({ status, notes: nextNotes })
      .eq("id", id);
    setBooks((b) =>
      b.map((i) =>
        i.id === id ? { ...i, status, notes: nextNotes } : i
      )
    );
  };

  const updateProgress = async (id: string, progress: number) => {
    const book = books.find((b) => b.id === id);
    if (!book) return;
    const { text } = parseNotes(book.notes);
    const nextNotes = serializeNotes(progress, text);
    const status: ReadingStatus =
      progress >= 100 ? "done" : book.status === "done" ? "reading" : book.status;
    await supabase
      .from("companion_reading_list")
      .update({ notes: nextNotes, status })
      .eq("id", id);
    setBooks((b) =>
      b.map((i) =>
        i.id === id ? { ...i, notes: nextNotes, status } : i
      )
    );
  };

  const updateNotes = async (id: string, text: string) => {
    const book = books.find((b) => b.id === id);
    if (!book) return;
    const { progress } = parseNotes(book.notes);
    const nextNotes = serializeNotes(progress, text);
    setBooks((b) =>
      b.map((i) => (i.id === id ? { ...i, notes: nextNotes } : i))
    );
    await supabase
      .from("companion_reading_list")
      .update({ notes: nextNotes })
      .eq("id", id);
  };

  const deleteBook = async (id: string) => {
    await supabase.from("companion_reading_list").delete().eq("id", id);
    setBooks((b) => b.filter((i) => i.id !== id));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = books;
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.author?.toLowerCase().includes(q) ?? false)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((b) => b.status === statusFilter);
    }
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      return b.priority - a.priority || a.title.localeCompare(b.title);
    });
    return sorted;
  }, [books, search, statusFilter, sortBy]);

  const byColumn = useMemo(() => {
    const map: Record<ReadingStatus, Book[]> = {
      to_read: [],
      reading: [],
      done: [],
    };
    for (const book of filtered) {
      map[book.status].push(book);
    }
    return map;
  }, [filtered]);

  const stats = useMemo(
    () => ({
      total: books.length,
      reading: books.filter((b) => b.status === "reading").length,
      done: books.filter((b) => b.status === "done").length,
    }),
    [books]
  );

  const visibleColumns =
    statusFilter === "all"
      ? COLUMNS
      : COLUMNS.filter((c) => c.id === statusFilter);

  if (!ready) {
    return (
      <Card className="py-16 text-center">
        <p className="text-muted text-sm">Loading your reading list…</p>
      </Card>
    );
  }

  if (!uid) {
    return (
      <ToolEmpty
        icon={Library}
        title="Sign in to track books"
        description="Your reading list syncs across devices when you're signed in."
      />
    );
  }

  return (
    <ToolShell
      stats={
        <>
          <ToolStat
            label="Total books"
            value={stats.total}
            icon={Library}
            accent="purple"
          />
          <ToolStat
            label="Reading now"
            value={stats.reading}
            icon={BookOpen}
            accent="amber"
          />
          <ToolStat
            label="Completed"
            value={stats.done}
            icon={CheckCircle2}
            accent="emerald"
          />
        </>
      }
      sidebar={
        <Card className="border-regal-purple-400/20">
          <div className="flex items-center gap-2 mb-4">
            <BookMarked className="w-4 h-4 text-regal-pink" />
            <h3 className="text-sm font-bold text-white">Add a book</h3>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                placeholder="Book or paper title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addBook()}
              />
            </div>
            <div>
              <Label>Author</Label>
              <Input
                placeholder="Author name"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={priority}
                onChange={(e) => setPriority(+e.target.value)}
              >
                {PRIORITY_LABELS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Why you're reading this, course, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <Button
              onClick={addBook}
              disabled={adding || !title.trim()}
              className="w-full"
            >
              <Plus className="w-4 h-4" />
              Add to list
            </Button>
          </div>
        </Card>
      }
    >
      <ToolSection
        title="Your library"
        description="Track books across to-read, reading, and done. Move items with the column buttons."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <Input
                placeholder="Search title or author…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-48 sm:w-56 text-xs"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ReadingStatus | "all")
              }
              className="w-auto text-xs"
            >
              <option value="all">All statuses</option>
              <option value="to_read">To read</option>
              <option value="reading">Reading</option>
              <option value="done">Done</option>
            </Select>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "title" | "priority")}
              className="w-auto text-xs"
            >
              <option value="priority">Sort: Priority</option>
              <option value="title">Sort: Title</option>
            </Select>
          </div>
        }
      >
        {loading ? (
          <Card className="py-12 text-center">
            <p className="text-muted text-sm">Loading books…</p>
          </Card>
        ) : books.length === 0 ? (
          <ToolEmpty
            icon={BookOpen}
            title="No books yet"
            description="Add your first book using the form on the right."
          />
        ) : filtered.length === 0 ? (
          <ToolEmpty
            icon={Search}
            title="No matches"
            description="Try a different search or clear your filters."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div
            className={cn(
              "grid gap-4",
              visibleColumns.length === 1
                ? "grid-cols-1 max-w-md"
                : visibleColumns.length === 2
                  ? "sm:grid-cols-2"
                  : "lg:grid-cols-3"
            )}
          >
            {visibleColumns.map((col) => (
              <div key={col.id} className="min-w-0">
                <div
                  className={cn(
                    "flex items-center justify-between mb-3 pb-2 border-b",
                    col.border
                  )}
                >
                  <h4
                    className={cn(
                      "text-xs font-bold uppercase tracking-widest",
                      col.accent
                    )}
                  >
                    {col.label}
                  </h4>
                  <span className="text-[10px] text-muted tabular-nums">
                    {byColumn[col.id].length}
                  </span>
                </div>
                <div className="space-y-3">
                  {byColumn[col.id].length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 py-8 text-center">
                      <p className="text-xs text-muted">No books here</p>
                    </div>
                  ) : (
                    byColumn[col.id].map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onMove={updateStatus}
                        onProgress={updateProgress}
                        onDelete={deleteBook}
                        onNotes={updateNotes}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ToolSection>
    </ToolShell>
  );
}
