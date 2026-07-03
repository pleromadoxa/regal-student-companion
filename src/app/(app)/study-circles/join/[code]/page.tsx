import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthUser, getCompanionProfile } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
import { JoinInviteClient } from "@/components/study-circles/JoinInviteClient";

export const metadata: Metadata = {
  title: "Join study circle",
  description: "Preview and join a Regal Student Companion study circle.",
  robots: { index: false, follow: false },
};

export default async function JoinInvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireAuthUser();
  const profile = await getCompanionProfile(user.id);

  if (!profile) {
    redirect("/dashboard?onboard=1");
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("companion_preview_circle_invite", { p_code: code });
  const preview = Array.isArray(data) ? data[0] : data;

  return (
    <JoinInviteClient
      code={code}
      preview={preview ?? null}
      viewerName={profile.display_name ?? profile.email ?? "You"}
    />
  );
}
