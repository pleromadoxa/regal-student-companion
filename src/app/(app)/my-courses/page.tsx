import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { PageSkeleton } from "@/components/ui/Skeleton";

const MyCoursesClient = dynamic(
  () =>
    import("@/components/my-courses/MyCoursesClient").then((m) => m.MyCoursesClient),
  { loading: () => <PageSkeleton /> }
);

export const metadata: Metadata = {
  title: "My Courses",
  description:
    "Manage your courses and subjects with AI-generated course materials.",
};

export default async function MyCoursesPage() {
  const user = await requireAuthUser();
  return <MyCoursesClient userId={user.id} />;
}
