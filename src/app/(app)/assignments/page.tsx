import dynamic from "next/dynamic";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/ui/Skeleton";
import type { Assignment } from "@/types";

const AssignmentsClient = dynamic(
  () => import("@/components/assignments/AssignmentsClient").then((m) => m.AssignmentsClient),
  { loading: () => <PageSkeleton /> }
);

export default async function AssignmentsPage() {
  const user = await requireAuthUser();
  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("companion_assignments")
    .select("id, user_id, title, course, due_date, status, content, ai_scan_summary, citation_style, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  return <AssignmentsClient initialAssignments={(assignments ?? []) as Assignment[]} />;
}
