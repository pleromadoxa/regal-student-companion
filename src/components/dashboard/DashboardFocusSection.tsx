"use client";

import dynamic from "next/dynamic";

const DashboardFocusMode = dynamic(
  () => import("@/components/focus/FocusTimerClient").then((m) => m.DashboardFocusMode),
  { loading: () => <div className="shimmer h-full min-h-[14rem] rounded-2xl" /> }
);

export function DashboardFocusSection({
  initialCompleted,
  initialFocusMinutes,
}: {
  initialCompleted: number;
  initialFocusMinutes: number;
}) {
  return (
    <div className="h-full min-h-0">
      <DashboardFocusMode
        initialCompleted={initialCompleted}
        initialFocusMinutes={initialFocusMinutes}
      />
    </div>
  );
}