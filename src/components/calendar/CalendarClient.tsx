"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types";

export function CalendarClient({
  initialEvents,
}: {
  initialEvents: CalendarEvent[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState(initialEvents);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [color, setColor] = useState("#8A4FFF");

  const supabase = createClient();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const refresh = async () => {
    const { data } = await supabase
      .from("companion_calendar_events")
      .select("*")
      .order("start_at", { ascending: true });
    if (data) setEvents(data as CalendarEvent[]);
  };

  const dayEvents = events.filter((e) =>
    isSameDay(new Date(e.start_at), selectedDate)
  );

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.start_at), day));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("companion_calendar_events").insert({
      user_id: user.id,
      title,
      description: description || null,
      start_at: new Date(startAt).toISOString(),
      color,
    });

    setTitle("");
    setDescription("");
    setStartAt("");
    setShowForm(false);
    await refresh();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("companion_calendar_events").delete().eq("id", id);
    await refresh();
  };

  const startPad = monthStart.getDay();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-muted text-sm mt-1">
            Track classes, deadlines, and study sessions
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" /> Add Event
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Start</Label>
                <Input
                  type="datetime-local"
                  required
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>
              <div>
                <Label>Color</Label>
                <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create Event</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold text-white">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map((day) => {
              const dayEvts = getEventsForDay(day);
              const selected = isSameDay(day, selectedDate);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "aspect-square p-1 rounded-xl text-sm transition-colors relative",
                    !isSameMonth(day, currentMonth) && "opacity-30",
                    selected
                      ? "bg-regal-purple-500/40 text-white"
                      : "hover:bg-white/10 text-white/80",
                    isToday(day) && !selected && "ring-1 ring-regal-pink/50"
                  )}
                >
                  {format(day, "d")}
                  {dayEvts.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvts.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className="w-1 h-1 rounded-full"
                          style={{ backgroundColor: ev.color }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{format(selectedDate, "EEEE, MMM d")}</CardTitle>
          </CardHeader>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No events this day</p>
          ) : (
            <ul className="space-y-2">
              {dayEvents.map((event) => (
                <li
                  key={event.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/5 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-2">
                      <div
                        className="w-1 h-full min-h-[40px] rounded-full shrink-0"
                        style={{ backgroundColor: event.color }}
                      />
                      <div>
                        <p className="text-sm font-medium text-white">{event.title}</p>
                        <p className="text-xs text-muted">
                          {format(new Date(event.start_at), "h:mm a")}
                        </p>
                        {event.description && (
                          <p className="text-xs text-muted mt-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
