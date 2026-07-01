"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Calendar,
  DollarSign,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import {
  ToolEmpty,
  ToolShell,
  ToolStat,
  useUserId,
} from "./shared";
import { cn } from "@/lib/utils";

const LINK_PREFIX = "@@link:";

const STATUSES = ["researching", "applied", "won", "lost"] as const;
type ScholarshipStatus = (typeof STATUSES)[number];

type Scholarship = {
  id: string;
  name: string;
  amount: string | null;
  deadline: string | null;
  status: ScholarshipStatus;
  notes: string | null;
};

const STATUS_META: Record<
  ScholarshipStatus,
  { label: string; accent: string; border: string }
> = {
  researching: {
    label: "Researching",
    accent: "text-regal-purple-300",
    border: "border-regal-purple-400/25",
  },
  applied: {
    label: "Applied",
    accent: "text-sky-300",
    border: "border-sky-400/25",
  },
  won: {
    label: "Won",
    accent: "text-emerald-300",
    border: "border-emerald-400/25",
  },
  lost: {
    label: "Lost",
    accent: "text-white/50",
    border: "border-white/10",
  },
};

type FormState = {
  name: string;
  amount: string;
  deadline: string;
  link: string;
  notes: string;
  status: ScholarshipStatus;
};

const EMPTY_FORM: FormState = {
  name: "",
  amount: "",
  deadline: "",
  link: "",
  notes: "",
  status: "researching",
};

function encodeNotes(link: string, notes: string): string | null {
  const parts: string[] = [];
  const trimmedLink = link.trim();
  const trimmedNotes = notes.trim();
  if (trimmedLink) parts.push(`${LINK_PREFIX}${trimmedLink}`);
  if (trimmedNotes) parts.push(trimmedNotes);
  return parts.length ? parts.join("\n") : null;
}

function decodeNotes(raw: string | null): { link: string; notes: string } {
  if (!raw) return { link: "", notes: "" };
  if (raw.startsWith(LINK_PREFIX)) {
    const newlineIdx = raw.indexOf("\n");
    if (newlineIdx === -1) {
      return { link: raw.slice(LINK_PREFIX.length), notes: "" };
    }
    return {
      link: raw.slice(LINK_PREFIX.length, newlineIdx),
      notes: raw.slice(newlineIdx + 1),
    };
  }
  return { link: "", notes: raw };
}

function parseAmount(amount: string | null): number {
  if (!amount) return 0;
  const n = parseFloat(amount.replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const d = parseISO(deadline);
  if (!isValid(d)) return null;
  return differenceInCalendarDays(d, new Date());
}

function deadlineLabel(days: number | null, deadline: string | null): string {
  if (days === null) return "No deadline";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `${days}d left`;
  return deadline && isValid(parseISO(deadline))
    ? format(parseISO(deadline), "MMM d")
    : `${days}d left`;
}

function deadlineAccent(days: number | null): "urgent" | "soon" | "ok" | "overdue" | "muted" {
  if (days === null) return "muted";
  if (days < 0) return "overdue";
  if (days <= 3) return "urgent";
  if (days <= 14) return "soon";
  return "ok";
}

const BADGE_STYLES = {
  urgent: "bg-red-500/15 text-red-300 border-red-400/30",
  soon: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  ok: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  overdue: "bg-white/5 text-white/40 border-white/10 line-through",
  muted: "bg-white/5 text-muted border-white/10",
};

function sortByDeadline(a: Scholarship, b: Scholarship): number {
  if (!a.deadline && !b.deadline) return a.name.localeCompare(b.name);
  if (!a.deadline) return 1;
  if (!b.deadline) return -1;
  return a.deadline.localeCompare(b.deadline);
}

function ScholarshipCard({
  item,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  item: Scholarship;
  onEdit: (item: Scholarship) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ScholarshipStatus) => void;
}) {
  const { link, notes } = decodeNotes(item.notes);
  const days = daysUntil(item.deadline);
  const badge = deadlineAccent(days);

  return (
    <Card className={cn("p-3 space-y-2", STATUS_META[item.status].border)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-snug truncate">
            {item.name}
          </p>
          {item.amount && (
            <p className="text-xs text-regal-pink font-medium mt-0.5 tabular-nums">
              {item.amount.startsWith("$") ? item.amount : formatCurrency(parseAmount(item.amount))}
            </p>
          )}
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Edit scholarship"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-lg text-muted hover:text-red-300 hover:bg-red-500/10 transition-colors"
            aria-label="Delete scholarship"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
            BADGE_STYLES[badge]
          )}
        >
          <Calendar className="w-3 h-3" />
          {deadlineLabel(days, item.deadline)}
        </span>
        {item.deadline && (
          <span className="text-[10px] text-muted">
            {format(parseISO(item.deadline), "MMM d, yyyy")}
          </span>
        )}
      </div>

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-regal-purple-300 hover:text-regal-purple-200 transition-colors truncate max-w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="truncate">{link.replace(/^https?:\/\//, "")}</span>
        </a>
      )}

      {notes && (
        <p className="text-xs text-muted line-clamp-2 leading-relaxed">{notes}</p>
      )}

      <div className="flex flex-wrap gap-1 pt-1">
        {STATUSES.filter((s) => s !== item.status).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onStatusChange(item.id, s)}
            className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-muted hover:text-white hover:border-white/20 transition-colors"
          >
            → {STATUS_META[s].label}
          </button>
        ))}
      </div>
    </Card>
  );
}

export function ScholarshipsTool() {
  const { uid, ready } = useUserId();
  const [items, setItems] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchScholarships = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const { data } = await supabase
      .from("companion_scholarships")
      .select("*")
      .eq("user_id", uid)
      .order("deadline", { ascending: true, nullsFirst: false });
    setItems((data as Scholarship[] | null) ?? []);
    setLoading(false);
  }, [uid, supabase]);

  useEffect(() => {
    if (ready && uid) fetchScholarships();
    else if (ready) setLoading(false);
  }, [ready, uid, fetchScholarships]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) => {
      const { link, notes } = decodeNotes(s.notes);
      return (
        s.name.toLowerCase().includes(q) ||
        (s.amount?.toLowerCase().includes(q) ?? false) ||
        s.status.includes(q) ||
        link.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const stats = useMemo(() => {
    const potential = items
      .filter((s) => s.status === "researching" || s.status === "applied")
      .reduce((sum, s) => sum + parseAmount(s.amount), 0);
    const won = items
      .filter((s) => s.status === "won")
      .reduce((sum, s) => sum + parseAmount(s.amount), 0);
    const applied = items.filter((s) => s.status === "applied").length;
    return { potential, won, applied, total: items.length };
  }, [items]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (item: Scholarship) => {
    const { link, notes } = decodeNotes(item.notes);
    setForm({
      name: item.name,
      amount: item.amount ?? "",
      deadline: item.deadline ? format(parseISO(item.deadline), "yyyy-MM-dd") : "",
      link,
      notes,
      status: item.status,
    });
    setEditingId(item.id);
  };

  const save = async () => {
    if (!uid || !form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      amount: form.amount.trim() || null,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      status: form.status,
      notes: encodeNotes(form.link, form.notes),
    };

    if (editingId) {
      const { data } = await supabase
        .from("companion_scholarships")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (data) {
        setItems((prev) =>
          prev.map((s) => (s.id === editingId ? (data as Scholarship) : s))
        );
      }
    } else {
      const { data } = await supabase
        .from("companion_scholarships")
        .insert({ user_id: uid, ...payload })
        .select()
        .single();
      if (data) setItems((prev) => [...prev, data as Scholarship]);
    }

    setSaving(false);
    resetForm();
  };

  const remove = async (id: string) => {
    await supabase.from("companion_scholarships").delete().eq("id", id);
    setItems((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) resetForm();
  };

  const changeStatus = async (id: string, status: ScholarshipStatus) => {
    await supabase.from("companion_scholarships").update({ status }).eq("id", id);
    setItems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  if (!ready || loading) {
    return <div className="shimmer h-48 rounded-2xl" />;
  }

  if (!uid) {
    return (
      <ToolEmpty
        icon={Award}
        title="Sign in to track scholarships"
        description="Log in to save scholarships, deadlines, and application status."
      />
    );
  }

  return (
    <ToolShell
      stats={
        <>
          <ToolStat
            label="Potential awards"
            value={formatCurrency(stats.potential)}
            icon={DollarSign}
            accent="pink"
          />
          <ToolStat
            label="Tracked"
            value={stats.total}
            icon={Award}
            accent="purple"
          />
          <ToolStat
            label="Applied"
            value={stats.applied}
            icon={Send}
            accent="amber"
          />
          <ToolStat
            label="Won"
            value={formatCurrency(stats.won)}
            icon={Trophy}
            accent="emerald"
          />
        </>
      }
      sidebar={
        <Card className="border-regal-purple-400/20">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-bold text-white">
              {editingId ? "Edit scholarship" : "Add scholarship"}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/10"
                aria-label="Cancel edit"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                placeholder="e.g. STEM Excellence Award"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                placeholder="e.g. $5,000"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label>Deadline</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>
            <div>
              <Label>Application link</Label>
              <Input
                placeholder="https://..."
                value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as ScholarshipStatus,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-regal-purple-400"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Requirements, essay prompts, contacts..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="min-h-[88px]"
              />
            </div>
            <Button
              className="w-full"
              onClick={save}
              disabled={saving || !form.name.trim()}
            >
              {editingId ? (
                <>Save changes</>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Track scholarship
                </>
              )}
            </Button>
          </div>
        </Card>
      }
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        <Input
          placeholder="Search scholarships..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <ToolEmpty
          icon={Award}
          title={search ? "No matches" : "No scholarships yet"}
          description={
            search
              ? "Try a different search term or clear the filter."
              : "Add your first scholarship to start tracking deadlines and awards."
          }
          action={
            search ? (
              <Button variant="secondary" size="sm" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map((status) => {
            const column = filtered
              .filter((s) => s.status === status)
              .sort(sortByDeadline);
            return (
              <div key={status} className="min-w-0">
                <div className="flex items-center justify-between gap-2 mb-3 px-0.5">
                  <h3
                    className={cn(
                      "text-xs font-bold uppercase tracking-widest",
                      STATUS_META[status].accent
                    )}
                  >
                    {STATUS_META[status].label}
                  </h3>
                  <span className="text-[10px] font-bold text-muted tabular-nums">
                    {column.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {column.length === 0 ? (
                    <p className="text-xs text-muted text-center py-6 border border-dashed border-white/10 rounded-xl">
                      None
                    </p>
                  ) : (
                    column.map((item) => (
                      <ScholarshipCard
                        key={item.id}
                        item={item}
                        onEdit={startEdit}
                        onDelete={remove}
                        onStatusChange={changeStatus}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ToolShell>
  );
}
