import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/** Public Regal Mail avatar path in shared Supabase storage (read-only) */
export function getRegalStorageAvatarUrl(userId: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/avatars/${userId}/avatar.jpg`;
}

/** Prefer stored URL, then fall back to the standard Regal storage path */
export function resolveAvatarUrl(
  userId: string,
  avatarUrl?: string | null
): string {
  const trimmed = avatarUrl?.trim();
  if (trimmed) return trimmed;
  return getRegalStorageAvatarUrl(userId);
}

type RegalMailProfile = { full_name: string | null; avatar_url: string | null };

/**
 * Read Regal Mail profile via SECURITY DEFINER RPC (own row only).
 * Falls back to direct select only if RPC is not deployed yet.
 * Never writes to shared `profiles` — only updates companion_profiles.
 */
async function fetchRegalMailProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<RegalMailProfile | null> {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "companion_get_regal_mail_profile"
  );

  if (!rpcError && rpcData?.length) {
    const row = rpcData[0] as RegalMailProfile;
    return row;
  }

  if (rpcError) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    return data ?? null;
  }

  return null;
}

/** Pull avatar + name from Regal Mail into companion_profiles (companion table only) */
export async function syncRegalProfileAvatar(
  supabase: SupabaseClient,
  user: User
): Promise<void> {
  const regal = await fetchRegalMailProfile(supabase, user.id);

  const avatar_url = regal?.avatar_url ?? null;
  const display_name =
    regal?.full_name ??
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    "Student";

  const { data: existing } = await supabase
    .from("companion_profiles")
    .select("id, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("companion_profiles").insert({
      id: user.id,
      email: user.email ?? "",
      display_name,
      avatar_url,
    });
    return;
  }

  const updates: Record<string, string> = {};
  if (avatar_url && avatar_url !== existing.avatar_url) {
    updates.avatar_url = avatar_url;
  }
  if (!existing.display_name && display_name) {
    updates.display_name = display_name;
  }
  if (Object.keys(updates).length > 0) {
    await supabase
      .from("companion_profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id);
  }
}
