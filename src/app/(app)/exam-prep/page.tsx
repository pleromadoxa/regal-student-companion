import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { PageSkeleton } from "@/components/ui/Skeleton";

const ExamWarRoomClient = dynamic(
  () => import("@/components/exam-prep/ExamWarRoomClient").then((m) => m.ExamWarRoomClient),
  { loading: () => <PageSkeleton /> }
);

export const metadata: Metadata = {
  title: "Exam War Room",
  description: "AI-generated exam battle plans and cram strategies.",
};

export default async function ExamPrepPage() {
  const user = await requireAuthUser();
  return <ExamWarRoomClient userId={user.id} />;
}
