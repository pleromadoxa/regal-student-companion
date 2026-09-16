import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ActivityTracker } from "@/components/activity/ActivityTracker";
import { ToastProvider } from "@/components/ui/Toast";
import { getAuthUser, getCompanionProfile } from "@/lib/supabase/auth-server";
import { isCompanionAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { syncRegalProfileAvatar } from "@/lib/profile-avatar";
import type { CompanionProfile } from "@/types";

async function safeGetProfile(userId: string): Promise<CompanionProfile | null> {
  try {
    return await getCompanionProfile(userId);
  } catch (e) {
    console.error("[layout] getCompanionProfile failed:", e);
    return null;
  }
}

async function safeUpsertProfile(userId: string, email: string, meta: Record<string, unknown>): Promise<void> {
  try {
    const supabase = await createClient();
    const { error: upsertError } = await supabase.from("companion_profiles").upsert({
      id: userId,
      email,
      display_name:
        (meta.full_name as string) ??
        email.split("@")[0] ??
        "Student",
    });
    if (upsertError) {
      console.error("[layout] profile upsert failed:", upsertError.message);
    }
  } catch (e) {
    console.error("[layout] profile upsert threw:", e);
  }
}

async function safeIsAdmin(user: { id: string; email?: string | null }): Promise<boolean> {
  try {
    return await isCompanionAdmin(user as never);
  } catch (e) {
    console.error("[layout] isCompanionAdmin failed:", e);
    return false;
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  let profile = await safeGetProfile(user.id);

  if (!profile) {
    await safeUpsertProfile(user.id, user.email ?? "", user.user_metadata ?? {});
    profile = await safeGetProfile(user.id);
  }

  const isAdmin = await safeIsAdmin(user);

  // Best-effort avatar sync (safe for Cloudflare Workers)
  try {
    const supabase = await createClient();
    await syncRegalProfileAvatar(supabase, user);
  } catch {
    /* avatar sync is best-effort */
  }

  return (
    <ToastProvider>
      <ActivityTracker />
      <AppShell profile={profile} isAdmin={isAdmin}>{children}</AppShell>
    </ToastProvider>
  );
}
