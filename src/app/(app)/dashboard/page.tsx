import { Suspense } from "react";
import { requireAuthUser } from "@/lib/supabase/auth-server";
import { getTodaysWord, formatWordOfDayDate } from "@/lib/word-of-the-day";
import { WordOfTheDay } from "@/components/dictionary/WordOfTheDay";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardEmpowermentLoader } from "@/components/dashboard/DashboardEmpowermentLoader";
import { DashboardLaunchpad } from "@/components/dashboard/DashboardLaunchpad";
import { DashboardRegalTools } from "@/components/dashboard/DashboardRegalTools";
import { DashboardFocusLoader } from "@/components/dashboard/DashboardFocusLoader";
import { DashboardPanels } from "@/components/dashboard/DashboardPanels";
import { Skeleton } from "@/components/ui/Skeleton";

function DashboardHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}

function EmpowermentSkeleton() {
  return <div className="shimmer h-48 sm:h-56 rounded-2xl" />;
}

function DashboardPanelsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-32" />
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireAuthUser();
  const word = getTodaysWord();
  const dateLabel = formatWordOfDayDate();

  return (
    <div className="space-y-8 page-enter">
      <Suspense fallback={<DashboardHeaderSkeleton />}>
        <DashboardHeader userId={user.id} />
      </Suspense>

      <Suspense fallback={<EmpowermentSkeleton />}>
        <DashboardEmpowermentLoader userId={user.id} />
      </Suspense>

      <DashboardRegalTools />

      <DashboardLaunchpad />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <WordOfTheDay word={word} dateLabel={dateLabel} variant="dashboard" />
        <Suspense fallback={<div className="shimmer h-full min-h-[14rem] rounded-2xl" />}>
          <DashboardFocusLoader userId={user.id} />
        </Suspense>
      </div>

      <Suspense fallback={<DashboardPanelsSkeleton />}>
        <DashboardPanels userId={user.id} />
      </Suspense>
    </div>
  );
}
