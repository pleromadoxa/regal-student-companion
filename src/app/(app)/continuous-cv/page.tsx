import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { PageSkeleton } from "@/components/ui/Skeleton";

const ContinuousCVClient = dynamic(
  () =>
    import("@/components/continuous-cv/ContinuousCVClient").then(
      (m) => m.ContinuousCVClient
    ),
  { loading: () => <PageSkeleton /> }
);

export const metadata: Metadata = {
  title: "Continuous CV",
  description:
    "Build your living academic CV step by step and export a beautiful PDF.",
};

export default async function ContinuousCVPage() {
  const user = await requireAuthUser();

  return (
    <ContinuousCVClient userId={user.id} initialEmail={user.email ?? undefined} />
  );
}
