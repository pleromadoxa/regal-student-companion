"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Brain,
  Calendar,
  CheckSquare,
  FileText,
  LayoutDashboard,
  Library,
  Swords,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * WorkspaceDock — a macOS/iPadOS-style application dock for the student
 * companion, ported from Regal Workspace and customized for study workflows.
 *
 * - Desktop & tablet: floating glass dock pinned to the bottom of the screen.
 * - Mobile: hidden (not removed) — the sidebar + header carry navigation.
 */

interface DockApp {
  id: string;
  name: string;
  path: string;
  gradient: string;
  icon: LucideIcon;
}

const DOCK_APPS: DockApp[] = [
  { id: "dashboard", name: "Dashboard", path: "/dashboard", gradient: "from-violet-500 to-indigo-500", icon: LayoutDashboard },
  { id: "assignments", name: "Assignments", path: "/assignments", gradient: "from-sky-400 to-sky-600", icon: FileText },
  { id: "research", name: "Research Lab", path: "/research", gradient: "from-emerald-400 to-teal-600", icon: Brain },
  { id: "calendar", name: "Calendar", path: "/calendar", gradient: "from-rose-400 to-red-500", icon: Calendar },
  { id: "tasks", name: "Tasks", path: "/tasks", gradient: "from-lime-400 to-green-600", icon: CheckSquare },
  { id: "exam-prep", name: "Exam War Room", path: "/exam-prep", gradient: "from-amber-400 to-orange-500", icon: Swords },
  { id: "dictionary", name: "Dictionary", path: "/dictionary", gradient: "from-cyan-400 to-sky-600", icon: Library },
  { id: "study-circles", name: "Study Circles", path: "/study-circles", gradient: "from-fuchsia-500 to-purple-500", icon: Users },
];

export function WorkspaceDock() {
  const router = useRouter();
  const pathname = usePathname();

  const isRunning = (path: string) =>
    path === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <div
      className="fixed bottom-3 left-1/2 z-[80] hidden -translate-x-1/2 md:block"
      role="toolbar"
      aria-label="Quick dock"
    >
      <div className="dock-shell flex max-w-[94vw] items-end gap-1 overflow-x-auto rounded-2xl border border-white/[0.12] bg-black/55 px-2.5 py-2 shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        {DOCK_APPS.map((app) => {
          const running = isRunning(app.path);
          const Icon = app.icon;
          return (
            <button
              key={app.id}
              type="button"
              title={app.name}
              aria-label={app.name}
              onClick={() => router.push(app.path)}
              className="dock-item group relative flex shrink-0 flex-col items-center justify-end"
            >
              <span className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-900/95 px-2.5 py-1 text-[11px] font-bold text-white opacity-0 shadow-lg transition-all duration-150 group-hover:-translate-y-0.5 group-hover:opacity-100">
                {app.name}
              </span>
              <span
                className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${app.gradient} shadow-md transition-transform duration-150 ease-out group-hover:-translate-y-1.5 group-hover:scale-110 group-active:scale-95`}
              >
                <Icon className="size-5 text-white drop-shadow-sm" strokeWidth={2} />
              </span>
              <span
                className={`mt-1 h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                  running ? "scale-100 bg-primary opacity-100" : "scale-0 opacity-0"
                }`}
                aria-hidden
              />
            </button>
          );
        })}

        <span className="mx-1 h-9 w-px shrink-0 self-center bg-white/15" aria-hidden />

        <button
          type="button"
          title="All Student Tools"
          aria-label="All Student Tools"
          onClick={() => router.push("/tools")}
          className="dock-item group relative flex shrink-0 flex-col items-center justify-end"
        >
          <span className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-900/95 px-2.5 py-1 text-[11px] font-bold text-white opacity-0 shadow-lg transition-all duration-150 group-hover:-translate-y-0.5 group-hover:opacity-100">
            All Student Tools
          </span>
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-md transition-transform duration-150 ease-out group-hover:-translate-y-1.5 group-hover:scale-110 group-active:scale-95">
            <Wrench className="size-5 text-white drop-shadow-sm" strokeWidth={2} />
          </span>
          <span className="mt-1 h-1.5 w-1.5 scale-0 opacity-0" aria-hidden />
        </button>
      </div>
    </div>
  );
}
