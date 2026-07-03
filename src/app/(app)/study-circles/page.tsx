import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAuthUser, getCompanionProfile } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
import { StudyCirclesClient } from "@/components/study-circles/StudyCirclesClient";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { getUserSubscription } from "@/lib/subscription";
import type { StudyCircle } from "@/types";

export const metadata: Metadata = {
  title: "Study Circles",
  description: "Collaborative group chats for study sessions with classmates.",
};

const SELECT_COLS =
  "id, name, description, subject, owner_id, is_public, created_at, active_call_id, calls_enabled, avatar_url, topic_tags";

export default async function StudyCirclesPage() {
  const user = await requireAuthUser();
  const supabase = await createClient();

  const [profile, subscription, { data: memberRows }] = await Promise.all([
    getCompanionProfile(user.id),
    getUserSubscription(supabase, user.id),
    supabase.from("companion_circle_members").select("circle_id").eq("user_id", user.id),
  ]);

  const circleIds = memberRows?.map((r) => r.circle_id) ?? [];

  let circles: StudyCircle[] = [];
  if (circleIds.length > 0) {
    const { data } = await supabase
      .from("companion_study_circles")
      .select(SELECT_COLS)
      .in("id", circleIds);
    circles = (data ?? []) as StudyCircle[];
  }

  const { data: owned } = await supabase
    .from("companion_study_circles")
    .select(SELECT_COLS)
    .eq("owner_id", user.id);

  const merged = [...circles];
  for (const c of owned ?? []) {
    if (!merged.some((m) => m.id === c.id)) merged.push(c as StudyCircle);
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <StudyCirclesClient
        initialCircles={merged}
        userId={user.id}
        displayName={profile?.display_name ?? profile?.email ?? "You"}
        planId={subscription.planId}
        callsAllowed={subscription.limits.studyCirclesUnlimited}
      />
    </Suspense>
  );
}
