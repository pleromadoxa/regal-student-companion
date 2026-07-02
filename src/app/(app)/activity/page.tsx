import type { Metadata } from "next";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
import { ActivityClient } from "@/components/activity/ActivityClient";
import type { ActivityLogEntry } from "@/lib/activity-log";

export const metadata: Metadata = {
  title: "Activity Log",
  description: "Your Regal Student Companion activity on Quantum Regal.",
};

export default async function ActivityPage() {
  const user = await requireAuthUser();
  const supabase = await createClient();

  const [{ data: entries }, { data: member }] = await Promise.all([
    supabase
      .from("companion_activity_log")
      .select("id, user_id, action, category, label, metadata, points_delta, path, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("companion_app_members")
      .select("activity_count, session_count, first_seen_at, last_seen_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <ActivityClient
      entries={(entries ?? []) as ActivityLogEntry[]}
      memberStats={
        member
          ? {
              activityCount: member.activity_count,
              sessionCount: member.session_count,
              firstSeen: member.first_seen_at,
              lastSeen: member.last_seen_at,
            }
          : null
      }
    />
  );
}
