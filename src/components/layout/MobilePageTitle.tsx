"use client";

import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/student-tools";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/profile": "My Profile",
  "/tools": "Student Tools",
  "/tasks": "Tasks",
  "/calendar": "Calendar",
  "/assignments": "Assignments",
  "/dictionary": "Dictionary",
  "/research": "Research Lab",
  "/study-circles": "Study Circles",
  "/leaderboard": "Leaderboard",
  "/focus": "Focus Timer",
  "/my-courses": "My Courses",
  "/continuous-cv": "Continuous CV",
  "/exam-prep": "Exam War Room",
  "/regal-mentor": "Regal Mentor",
  "/achievements": "Achievements",
};

export function MobilePageTitle() {
  const pathname = usePathname();
  if (pathname.startsWith("/tools/") && pathname !== "/tools") {
    const slug = pathname.split("/").pop();
    const allNav = NAV_SECTIONS.flatMap((s) => [...s.items]);
    const tool = allNav.find((t) => t.href === pathname);
    return (
      <p className="text-sm font-semibold text-white truncate">
        {tool?.label ?? slug?.replace(/-/g, " ") ?? "Tool"}
      </p>
    );
  }
  const title = PAGE_TITLES[pathname] ?? "Regal Companion";
  return <p className="text-sm font-semibold text-white truncate">{title}</p>;
}
