import type { SupabaseClient } from "@supabase/supabase-js";

export type CircleInvitePreview = {
  circle_id: string | null;
  circle_name: string | null;
  circle_subject: string | null;
  circle_description: string | null;
  member_count: number;
  invite_id: string | null;
  expires_at: string | null;
  is_valid: boolean;
  already_member: boolean;
};

export type CircleCall = {
  id: string;
  circle_id: string;
  started_by: string;
  mode: "audio" | "video";
  started_at: string;
  ended_at: string | null;
  ai_enabled: boolean;
};

export type CircleCallParticipant = {
  call_id: string;
  user_id: string;
  role: "host" | "participant";
  joined_at: string;
  left_at: string | null;
  camera_on: boolean;
  mic_on: boolean;
  display_name?: string | null;
};

export function buildInviteUrl(code: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "https://regalcompanion.cloud");
  return `${base}/study-circles/join/${code}`;
}

export async function createCircleInvite(
  supabase: SupabaseClient,
  circleId: string,
  options?: { ttlHours?: number; maxUses?: number }
): Promise<{ code: string; expiresAt: string | null }> {
  const { data, error } = await supabase.rpc("companion_create_circle_invite", {
    p_circle_id: circleId,
    p_max_uses: options?.maxUses ?? null,
    p_ttl_hours: options?.ttlHours ?? 168,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.code) throw new Error("Invite creation failed");
  return { code: row.code as string, expiresAt: row.expires_at as string | null };
}

export async function previewInvite(
  supabase: SupabaseClient,
  code: string
): Promise<CircleInvitePreview | null> {
  const { data, error } = await supabase.rpc("companion_preview_circle_invite", { p_code: code });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return (row as CircleInvitePreview) ?? null;
}

export async function joinCircleByCode(
  supabase: SupabaseClient,
  code: string
): Promise<{ circleId: string | null; joined: boolean; message: string }> {
  const { data, error } = await supabase.rpc("companion_join_circle_by_code", { p_code: code });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    circleId: (row?.circle_id as string) ?? null,
    joined: Boolean(row?.joined),
    message: (row?.message as string) ?? "",
  };
}

export async function toggleReaction(
  supabase: SupabaseClient,
  messageId: string,
  emoji: string
): Promise<Record<string, string[]>> {
  const { data, error } = await supabase.rpc("companion_toggle_message_reaction", {
    p_message_id: messageId,
    p_emoji: emoji,
  });
  if (error) throw new Error(error.message);
  return (data as Record<string, string[]>) ?? {};
}

export async function startCircleCall(
  supabase: SupabaseClient,
  circleId: string,
  mode: "audio" | "video"
): Promise<CircleCall> {
  const { data: existing } = await supabase
    .from("companion_circle_calls")
    .select("*")
    .eq("circle_id", circleId)
    .is("ended_at", null)
    .maybeSingle();

  if (existing) return existing as CircleCall;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("companion_circle_calls")
    .insert({
      circle_id: circleId,
      started_by: user.id,
      mode,
      ai_enabled: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .from("companion_study_circles")
    .update({ active_call_id: (data as CircleCall).id })
    .eq("id", circleId);

  return data as CircleCall;
}

export async function endCircleCall(supabase: SupabaseClient, callId: string): Promise<void> {
  const { error } = await supabase.rpc("companion_end_circle_call", { p_call_id: callId });
  if (error) throw new Error(error.message);
}

export async function joinCircleCall(
  supabase: SupabaseClient,
  callId: string,
  isHost: boolean,
  media: { camera: boolean; mic: boolean }
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase.from("companion_circle_call_participants").upsert(
    {
      call_id: callId,
      user_id: user.id,
      role: isHost ? "host" : "participant",
      joined_at: new Date().toISOString(),
      left_at: null,
      camera_on: media.camera,
      mic_on: media.mic,
    },
    { onConflict: "call_id,user_id" }
  );
}

export async function leaveCircleCall(supabase: SupabaseClient, callId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("companion_circle_call_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("call_id", callId)
    .eq("user_id", user.id);
}

export async function setCallMedia(
  supabase: SupabaseClient,
  callId: string,
  media: { camera?: boolean; mic?: boolean }
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const patch: Record<string, boolean> = {};
  if (typeof media.camera === "boolean") patch.camera_on = media.camera;
  if (typeof media.mic === "boolean") patch.mic_on = media.mic;
  if (Object.keys(patch).length === 0) return;
  await supabase
    .from("companion_circle_call_participants")
    .update(patch)
    .eq("call_id", callId)
    .eq("user_id", user.id);
}
