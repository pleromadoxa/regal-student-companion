"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Grid3X3,
  List,
  MapPin,
  Plus,
  Trash2,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import {
  ToolShell,
  ToolStat,
  ToolSection,
  ToolEmpty,
  useUserId,
} from "./shared";
import { cn } from "@/lib/utils";

type ScheduleBlock = {
  id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  color: string;
  location: string | null;
};

const WEEK_DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
] as const;

const COLORS = [
  "#a855f7",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#06b6d4",
  "#8b5cf6",
];

const GRID_START = 7;
const GRID_END = 22;
const HOUR_HEIGHT = 56;

const EMPTY_FORM = {
  title: "",
  day_of_week: 1,
  start_time: "09:00",
  end_time: "10:00",
  color: COLORS[0],
  location: "",
};

function parseTime(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatTime(t: string): string {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function durationHours(start: string, end: string): number {
  return Math.max(0, (parseTime(end) - parseTime(start)) / 60);
}

function blockStyle(block: ScheduleBlock) {
  const startMin = parseTime(block.start_time);
  const endMin = parseTime(block.end_time);
  const gridStartMin = GRID_START * 60;
  const top = ((startMin - gridStartMin) / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT - 2, 24);
  return { top, height };
}

export function ScheduleTool() {
  const { uid, ready } = useUserId();
  const supabase = createClient();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [now, setNow] = useState(() => new Date());
  const [saving, setSaving] = useState(false);

  const todayDow = now.getDay();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const loadBlocks = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const { data } = await supabase
      .from("companion_schedule_blocks")
      .select("*")
      .eq("user_id", uid)
      .order("day_of_week")
      .order("start_time");
    setBlocks((data as ScheduleBlock[]) ?? []);
    setLoading(false);
  }, [uid, supabase]);

  useEffect(() => {
    if (ready && uid) loadBlocks();
    else if (ready) setLoading(false);
  }, [ready, uid, loadBlocks]);

  const totalHours = useMemo(
    () =>
      blocks.reduce(
        (sum, b) => sum + durationHours(b.start_time, b.end_time),
        0
      ),
    [blocks]
  );

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  };

  const startEdit = (block: ScheduleBlock) => {
    setEditingId(block.id);
    setForm({
      title: block.title,
      day_of_week: block.day_of_week,
      start_time: block.start_time.slice(0, 5),
      end_time: block.end_time.slice(0, 5),
      color: block.color || COLORS[0],
      location: block.location ?? "",
    });
  };

  const saveBlock = async () => {
    if (!uid || !form.title.trim()) return;
    if (parseTime(form.end_time) <= parseTime(form.start_time)) return;

    setSaving(true);
    const payload = {
      user_id: uid,
      title: form.title.trim(),
      day_of_week: form.day_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
      color: form.color,
      location: form.location.trim() || null,
    };

    if (editingId) {
      const { data } = await supabase
        .from("companion_schedule_blocks")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (data) {
        setBlocks((prev) =>
          prev.map((b) => (b.id === editingId ? (data as ScheduleBlock) : b))
        );
        resetForm();
      }
    } else {
      const { data } = await supabase
        .from("companion_schedule_blocks")
        .insert(payload)
        .select()
        .single();
      if (data) {
        setBlocks((prev) => [...prev, data as ScheduleBlock]);
        resetForm();
      }
    }
    setSaving(false);
  };

  const deleteBlock = async (id: string) => {
    await supabase.from("companion_schedule_blocks").delete().eq("id", id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (editingId === id) resetForm();
  };

  const hours = Array.from(
    { length: GRID_END - GRID_START },
    (_, i) => GRID_START + i
  );

  const currentTimeTop =
    ((now.getHours() * 60 + now.getMinutes() - GRID_START * 60) / 60) *
    HOUR_HEIGHT;

  const showTimeIndicator =
    view === "grid" &&
    currentTimeTop >= 0 &&
    currentTimeTop <= (GRID_END - GRID_START) * HOUR_HEIGHT;

  const sidebar = (
    <Card className="space-y-4 border-regal-purple-400/15">
      <div>
        <h3 className="text-sm font-bold text-white">
          {editingId ? "Edit class" : "Add class"}
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Set day, time, color, and location.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Class name</Label>
          <Input
            placeholder="e.g. Calculus II"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div>
          <Label>Day</Label>
          <Select
            value={form.day_of_week}
            onChange={(e) =>
              setForm((f) => ({ ...f, day_of_week: +e.target.value }))
            }
          >
            {WEEK_DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Start</Label>
            <Input
              type="time"
              value={form.start_time}
              onChange={(e) =>
                setForm((f) => ({ ...f, start_time: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>End</Label>
            <Input
              type="time"
              value={form.end_time}
              onChange={(e) =>
                setForm((f) => ({ ...f, end_time: e.target.value }))
              }
            />
          </div>
        </div>
        <div>
          <Label>Location</Label>
          <Input
            placeholder="Room 204, Building A"
            value={form.location}
            onChange={(e) =>
              setForm((f) => ({ ...f, location: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={cn(
                  "w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110",
                  form.color === c
                    ? "border-white scale-110"
                    : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          className="flex-1 min-w-[120px]"
          onClick={saveBlock}
          disabled={saving || !form.title.trim()}
        >
          <Plus className="w-4 h-4" />
          {editingId ? "Save changes" : "Add class"}
        </Button>
        {editingId && (
          <>
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => deleteBlock(editingId)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </Card>
  );

  return (
    <ToolShell
      stats={
        <>
          <ToolStat
            label="Classes this week"
            value={blocks.length}
            icon={BookOpen}
            accent="purple"
          />
          <ToolStat
            label="Hours scheduled"
            value={totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}
            icon={Clock}
            accent="pink"
          />
        </>
      }
      sidebar={sidebar}
    >
      <ToolSection
        title="Weekly timetable"
        description="Your recurring class schedule. Click a block to edit."
        action={
          <div className="flex rounded-xl border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors",
                view === "grid"
                  ? "bg-regal-purple-500/25 text-white"
                  : "text-muted hover:text-white"
              )}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors",
                view === "list"
                  ? "bg-regal-purple-500/25 text-white"
                  : "text-muted hover:text-white"
              )}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>
        }
      >
        {loading ? (
          <Card className="py-16 text-center">
            <p className="text-sm text-muted">Loading schedule…</p>
          </Card>
        ) : blocks.length === 0 && view === "list" ? (
          <ToolEmpty
            icon={Calendar}
            title="No classes yet"
            description="Add your first class using the form on the right to build your weekly timetable."
          />
        ) : view === "grid" ? (
          <Card className="p-0 overflow-hidden border-regal-purple-400/15">
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                {/* Day headers */}
                <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-white/10">
                  <div className="p-2" />
                  {WEEK_DAYS.map((d) => {
                    const isToday = d.value === todayDow;
                    return (
                      <div
                        key={d.value}
                        className={cn(
                          "p-2 text-center border-l border-white/5",
                          isToday && "bg-regal-purple-500/10"
                        )}
                      >
                        <p
                          className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            isToday ? "text-regal-pink" : "text-muted"
                          )}
                        >
                          {d.label}
                        </p>
                        {isToday && (
                          <p className="text-[10px] text-regal-pink/80 mt-0.5">
                            Today
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Time grid */}
                <div className="grid grid-cols-[52px_repeat(7,1fr)] relative">
                  {/* Time labels */}
                  <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
                    {hours.map((h, i) => (
                      <div
                        key={h}
                        className="absolute right-2 text-[10px] text-muted tabular-nums -translate-y-1/2"
                        style={{ top: i * HOUR_HEIGHT }}
                      >
                        {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {WEEK_DAYS.map((d) => {
                    const isToday = d.value === todayDow;
                    const dayBlocks = blocks.filter(
                      (b) => b.day_of_week === d.value
                    );

                    return (
                      <div
                        key={d.value}
                        className={cn(
                          "relative border-l border-white/5",
                          isToday && "bg-regal-purple-500/[0.06]"
                        )}
                        style={{ height: hours.length * HOUR_HEIGHT }}
                      >
                        {hours.map((_, i) => (
                          <div
                            key={i}
                            className="absolute inset-x-0 border-t border-white/[0.06]"
                            style={{ top: i * HOUR_HEIGHT }}
                          />
                        ))}

                        {isToday && showTimeIndicator && (
                          <div
                            className="absolute inset-x-0 z-20 pointer-events-none"
                            style={{ top: currentTimeTop }}
                          >
                            <div className="relative">
                              <div className="absolute -left-1 w-2 h-2 rounded-full bg-red-400 -translate-y-1/2" />
                              <div className="h-0.5 bg-red-400/90 shadow-[0_0_6px_rgba(248,113,113,0.6)]" />
                            </div>
                          </div>
                        )}

                        {dayBlocks.map((block) => {
                          const { top, height } = blockStyle(block);
                          const isEditing = editingId === block.id;
                          return (
                            <button
                              key={block.id}
                              type="button"
                              onClick={() => startEdit(block)}
                              className={cn(
                                "absolute inset-x-1 z-10 rounded-lg px-2 py-1 text-left overflow-hidden transition-all hover:brightness-110 hover:z-30",
                                isEditing && "ring-2 ring-white/60 z-30"
                              )}
                              style={{
                                top,
                                height,
                                backgroundColor: `${block.color || COLORS[0]}33`,
                                borderLeft: `3px solid ${block.color || COLORS[0]}`,
                              }}
                            >
                              <p className="text-[11px] font-semibold text-white truncate leading-tight">
                                {block.title}
                              </p>
                              <p className="text-[10px] text-white/70 truncate">
                                {formatTime(block.start_time)} –{" "}
                                {formatTime(block.end_time)}
                              </p>
                              {block.location && height > 40 && (
                                <p className="text-[10px] text-white/50 truncate flex items-center gap-0.5 mt-0.5">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                                  {block.location}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {WEEK_DAYS.map((d) => {
              const dayBlocks = blocks
                .filter((b) => b.day_of_week === d.value)
                .sort(
                  (a, b) =>
                    parseTime(a.start_time) - parseTime(b.start_time)
                );
              const isToday = d.value === todayDow;

              if (dayBlocks.length === 0) return null;

              return (
                <div key={d.value}>
                  <p
                    className={cn(
                      "text-xs font-bold uppercase tracking-wider mb-2",
                      isToday ? "text-regal-pink" : "text-muted"
                    )}
                  >
                    {d.label}
                    {isToday && " · Today"}
                  </p>
                  <div className="space-y-2">
                    {dayBlocks.map((block) => (
                      <Card
                        key={block.id}
                        hover
                        className={cn(
                          "flex items-center gap-3 py-3 cursor-pointer",
                          editingId === block.id &&
                            "ring-1 ring-regal-purple-400/50"
                        )}
                        onClick={() => startEdit(block)}
                      >
                        <div
                          className="w-1 self-stretch rounded-full shrink-0"
                          style={{
                            backgroundColor: block.color || COLORS[0],
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {block.title}
                          </p>
                          <p className="text-xs text-muted mt-0.5">
                            {formatTime(block.start_time)} –{" "}
                            {formatTime(block.end_time)}
                            {block.location && (
                              <span className="inline-flex items-center gap-1 ml-2">
                                <MapPin className="w-3 h-3" />
                                {block.location}
                              </span>
                            )}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBlock(block.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
            {blocks.length === 0 && (
              <ToolEmpty
                icon={Calendar}
                title="No classes yet"
                description="Add your first class using the form on the right."
              />
            )}
          </div>
        )}
      </ToolSection>
    </ToolShell>
  );
}
