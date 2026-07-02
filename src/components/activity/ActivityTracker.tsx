"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Records Regal Student Companion app sessions (not Regal Mail). */
export function ActivityTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/login")) return;
    void fetch("/api/activity/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
