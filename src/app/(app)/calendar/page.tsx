import dynamic from "next/dynamic";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent } from "@/types";

const CalendarClient = dynamic(
  () => import("@/components/calendar/CalendarClient").then((m) => m.CalendarClient),
  { loading: () => <div className="shimmer h-64 rounded-2xl" /> }
);

export default async function CalendarPage() {
  const user = await requireAuthUser();
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("companion_calendar_events")
    .select("id, user_id, title, description, start_at, end_at, all_day, color, created_at")
    .eq("user_id", user.id)
    .order("start_at", { ascending: true })
    .limit(200);

  return <CalendarClient initialEvents={(events ?? []) as CalendarEvent[]} />;
}
