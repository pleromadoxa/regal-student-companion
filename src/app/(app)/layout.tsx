import { redirect } from "next/navigation";
import { after } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { ActivityTracker } from "@/components/activity/ActivityTracker";
import { ToastProvider } from "@/components/ui/Toast";
import { getAuthUser, getCompanionProfile } from "@/lib/supabase/auth-server";
import { isCompanionAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { syncRegalProfileAvatar } from "@/lib/profile-avatar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  // Non-blocking: sync avatar after the shell starts streaming (Next.js after())
  after(async () => {
    try {
      const supabase = await createClient();
      await syncRegalProfileAvatar(supabase, user);
    } catch {
      /* avatar sync is best-effort */
    }
  });

  let profile = await getCompanionProfile(user.id);

  if (!profile) {
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
  }

  const isAdmin = await isCompanionAdmin(user);

  return (
    <ToastProvider>
      <ActivityTracker />
      <AppShell profile={profile} isAdmin={isAdmin}>{children}</AppShell>
    </ToastProvider>
  );
}
