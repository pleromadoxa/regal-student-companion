import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
import { StudyCirclesClient } from "@/components/study-circles/StudyCirclesClient";
import { PageSkeleton } from "@/components/ui/Skeleton";
import type { StudyCircle } from "@/types";

export const metadata: Metadata = {
  title: "Study Circles",
  description: "Collaborative group chats for study sessions with classmates.",
};

export default async function StudyCirclesPage() {
  const user = await requireAuthUser();
  const supabase = await createClient();

  const { data: memberRows } = await supabase
    .from("companion_circle_members")
    .select("circle_id")
    .eq("user_id", user.id);

  const circleIds = memberRows?.map((r) => r.circle_id) ?? [];

  let circles: StudyCircle[] = [];
  if (circleIds.length > 0) {
    const { data } = await supabase
      .from("companion_study_circles")
      .select("id, name, description, subject, owner_id, is_public, created_at")
      .in("id", circleIds);
    circles = (data ?? []) as StudyCircle[];
  }

  const { data: owned } = await supabase
    .from("companion_study_circles")
    .select("id, name, description, subject, owner_id, is_public, created_at")
    .eq("owner_id", user.id);

  const merged = [...circles];
  for (const c of owned ?? []) {
    if (!merged.some((m) => m.id === c.id)) merged.push(c as StudyCircle);
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <StudyCirclesClient initialCircles={merged} userId={user.id} />
    </Suspense>
  );
}
