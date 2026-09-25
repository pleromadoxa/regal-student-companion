import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ActivityTracker } from "@/components/activity/ActivityTracker";
import { ToastProvider } from "@/components/ui/Toast";
import { getAuthUser, getCompanionProfile } from "@/lib/supabase/auth-server";
import { isCompanionAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { syncRegalProfileAvatar } from "@/lib/profile-avatar";
import type { CompanionProfile } from "@/types";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getAuthUser();
  } catch (e) {
    console.error("[layout] getAuthUser failed:", e);
    redirect("/login");
  }

  if (!user) redirect("/login");

  let profile: CompanionProfile | null = null;
  try {
    profile = await getCompanionProfile(user.id);
  } catch (e) {
    console.error("[layout] getCompanionProfile failed:", e);
  }

  if (!profile) {
    try {
      const supabase = await createClient();
      const { error: upsertError } = await supabase.from("companion_profiles").upsert({
        id: user.id,
        email: user.email ?? "",
        display_name:
          user.user_metadata?.full_name ??
          user.email?.split("@")[0] ??
          "Student",
      });
      if (upsertError) {
        console.error("[layout] profile upsert failed:", upsertError.message);
      }
      profile = await getCompanionProfile(user.id);
    } catch (e) {
      console.error("[layout] profile upsert threw:", e);
    }
  }

  let isAdmin = false;
  try {
    isAdmin = await isCompanionAdmin(user);
  } catch (e) {
    console.error("[layout] isCompanionAdmin failed:", e);
  }

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
      <ErrorBoundary>
        <AppShell profile={profile} isAdmin={isAdmin}>{children}</AppShell>
      </ErrorBoundary>
    </ToastProvider>
  );
}
