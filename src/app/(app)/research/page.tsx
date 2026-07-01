import dynamic from "next/dynamic";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/ui/Skeleton";
import type { ResearchProject } from "@/types";

const ResearchLabClient = dynamic(
  () => import("@/components/research/ResearchLabClient").then((m) => m.ResearchLabClient),
  { loading: () => <PageSkeleton /> }
);

export default async function ResearchPage() {
  const user = await requireAuthUser();
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("companion_research_projects")
    .select("id, user_id, title, description, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  return (
    <ResearchLabClient
      initialProjects={((projects ?? []) as ResearchProject[]).map((p) => ({
        ...p,
        sources: [],
        notes: [],
      }))}
      userId={user.id}
    />
  );
}
