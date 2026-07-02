import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, hasServiceRole } from "@/lib/supabase/service";
import type { User } from "@supabase/supabase-js";

export type AdminRole = "super_admin" | "support" | "billing";

export type CompanionAdmin = {
  id: string;
  email: string;
  user_id: string | null;
  role: AdminRole;
  created_at: string;
};

export async function isCompanionAdmin(user: User): Promise<boolean> {
  try {
    const supabase = await createClient();
    await supabase.rpc("companion_link_admin_user");
    const { data, error } = await supabase.rpc("companion_is_admin");
    if (!error && data === true) return true;
  } catch {
    /* fallback below */
  }

  if (!user.email) return false;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("companion_admins")
      .select("id")
      .or(`user_id.eq.${user.id},email.ilike.${user.email}`)
      .maybeSingle();
    if (data) return true;
  } catch {
    /* service role fallback */
  }

  if (!hasServiceRole()) return false;
  const service = createServiceClient();
  const { data } = await service
    .from("companion_admins")
    .select("id")
    .or(`user_id.eq.${user.id},email.ilike.${user.email}`)
    .maybeSingle();
  return Boolean(data);
}

export const getCompanionAdminRecord = cache(async (user: User): Promise<CompanionAdmin | null> => {
  if (!user.email) return null;

  try {
    const supabase = await createClient();
    await supabase.rpc("companion_link_admin_user");
    const { data } = await supabase
      .from("companion_admins")
      .select("id, email, user_id, role, created_at")
      .or(`user_id.eq.${user.id},email.ilike.${user.email}`)
      .maybeSingle();
    if (data) return data as CompanionAdmin;
  } catch {
    /* service role fallback */
  }

  if (!hasServiceRole()) return null;
  const service = createServiceClient();
  const { data } = await service
    .from("companion_admins")
    .select("id, email, user_id, role, created_at")
    .or(`user_id.eq.${user.id},email.ilike.${user.email}`)
    .maybeSingle();
  return (data as CompanionAdmin | null) ?? null;
});

export async function requireCompanionAdmin(user: User): Promise<CompanionAdmin> {
  const admin = await getCompanionAdminRecord(user);
  if (!admin) throw new Error("Admin access required");
  return admin;
}

export async function logAdminAction(
  adminUserId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  const row = {
    admin_user_id: adminUserId,
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    details: details ?? {},
  };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("companion_admin_audit").insert(row);
    if (!error) return;
  } catch {
    /* service role fallback */
  }

  if (!hasServiceRole()) return;
  const service = createServiceClient();
  await service.from("companion_admin_audit").insert(row);
}
