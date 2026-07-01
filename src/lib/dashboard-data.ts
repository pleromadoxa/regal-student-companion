import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Task, CalendarEvent } from "@/types";

export type DashboardStats = {
  pendingTasks: Task[];
  upcomingEvents: CalendarEvent[];
  focusCount: number;
};

/** Deduped dashboard fetch — shared across Suspense boundaries in one request. */
export const getDashboardStats = cache(async (userId: string): Promise<DashboardStats> => {
  const supabase = await createClient();

  const [{ data: tasks }, { data: events }, { count: focusCount }] = await Promise.all([
    supabase
      .from("companion_tasks")
      .select("id, title, priority, status, due_date")
      .eq("user_id", userId)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from("companion_calendar_events")
      .select("id, title, start_at, color")
      .eq("user_id", userId)
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(5),
    supabase
      .from("companion_focus_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", true),
  ]);

  return {
    pendingTasks: (tasks ?? []) as Task[],
    upcomingEvents: (events ?? []) as CalendarEvent[],
    focusCount: focusCount ?? 0,
  };
});
