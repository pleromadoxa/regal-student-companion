import dynamic from "next/dynamic";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/ui/Skeleton";
import type { Task } from "@/types";

const TasksClient = dynamic(
  () => import("@/components/tasks/TasksClient").then((m) => m.TasksClient),
  { loading: () => <PageSkeleton /> }
);

export default async function TasksPage() {
  const user = await requireAuthUser();
  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("companion_tasks")
    .select("id, user_id, title, description, due_date, priority, status, tags, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return <TasksClient initialTasks={(tasks ?? []) as Task[]} />;
}
