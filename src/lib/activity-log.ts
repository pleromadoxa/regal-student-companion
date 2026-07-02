import { createClient } from "@/lib/supabase/client";

export type ActivityCategory =
  | "platform"
  | "productivity"
  | "learning"
  | "ai"
  | "social"
  | "billing"
  | "exam"
  | "general";

export type ActivityLogEntry = {
  id: string;
  user_id: string;
  action: string;
  category: ActivityCategory;
  label: string;
  metadata: Record<string, unknown>;
  points_delta: number;
  path: string | null;
  created_at: string;
};

export type LogActivityInput = {
  action: string;
  category?: ActivityCategory;
  label: string;
  metadata?: Record<string, unknown>;
  pointsDelta?: number;
  path?: string;
};

/** Log a Regal Student Companion activity (marks user as app member). */
export async function logActivity(input: LogActivityInput): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("companion_log_activity", {
    p_action: input.action,
    p_category: input.category ?? "general",
    p_label: input.label,
    p_metadata: input.metadata ?? {},
    p_points_delta: input.pointsDelta ?? 0,
    p_path: input.path ?? null,
  });
}

/** Record app session / page visit without full activity log entry. */
export async function recordAppSession(path = "/dashboard"): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("companion_record_app_session", { p_path: path });
}

export const ACTIVITY_LABELS: Record<string, string> = {
  app_session: "Opened Regal Student Companion",
  engagement_points: "Earned engagement points",
  task_complete: "Completed a task",
  focus_session: "Finished a focus session",
  regal_ai: "Used Regal AI",
  exam_war_room: "Used Exam War Room",
  research_lab: "Used Research Lab",
  study_circle: "Study Circle activity",
  course_material: "Generated course material",
  mentor_chat: "Chatted with Regal Mentor",
  cloud_sync: "Synced to Regal Cloud",
  plan_upgrade: "Upgraded plan",
  support_ticket: "Submitted support request",
};
