import Link from "next/link";
import { Calendar, CheckSquare, Flame, Grid3x3, Moon, Timer } from "lucide-react";
import { getAuthUser, getCompanionProfile } from "@/lib/supabase/auth-server";
import { getDashboardStats, type DashboardStats } from "@/lib/dashboard-data";
import { StatCard } from "@/components/ui/PageHeader";
import { STUDENT_TOOLS } from "@/lib/student-tools";

function timeBasedGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export async function DashboardHeader({ userId }: { userId: string }) {
  let profile: Awaited<ReturnType<typeof getCompanionProfile>> = null;
  let stats: DashboardStats = { pendingTasks: [], upcomingEvents: [], focusCount: 0 };
  let user: Awaited<ReturnType<typeof getAuthUser>> = null;

  try {
    [profile, stats, user] = await Promise.all([
      getCompanionProfile(userId),
      getDashboardStats(userId),
      getAuthUser(),
    ]);
  } catch (e) {
    console.error("[DashboardHeader] data fetch failed:", e);
  }

  const displayName =
    profile?.display_name ?? user?.email?.split("@")[0] ?? "Student";
  const firstName = displayName.trim().split(/\s+/)[0] || "Student";

  const now = new Date();
  const greeting = timeBasedGreeting(now);
  const dateLine = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const openTasks = stats.pendingTasks.length;
  const streak = profile?.study_streak ?? 0;

  const focusStatus =
    openTasks > 0
      ? {
          tone: "tasks" as const,
          icon: CheckSquare,
          label: `${openTasks} open task${openTasks === 1 ? "" : "s"}`,
          detail:
            "Your queue is ready — clear one item to keep momentum for today.",
        }
      : {
          tone: "clear" as const,
          icon: Timer,
          label: "All clear",
          detail: "Nothing pending. A good moment to get ahead on revision.",
        };

  return (
    <>
      {/* ── Workspace-style greeting card ─────────────────────────────── */}
      <section
        className="home-greeting relative overflow-hidden rounded-2xl border border-[var(--regal-border)] bg-[var(--regal-surface)]"
        aria-label="Welcome"
      >
        <div className="home-greeting__wash" aria-hidden />
        <div className="home-greeting__grid" aria-hidden />
        <div className="home-greeting__orb" aria-hidden />

        <div className="relative z-[1] flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:p-7">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--regal-text-muted)]">
                Dashboard
              </span>
              <span
                className="hidden h-1 w-1 rounded-full bg-[var(--regal-text-muted)]/50 sm:inline-block"
                aria-hidden
              />
              <span className="text-[12px] font-medium text-[var(--regal-text-muted)]">
                {dateLine}
              </span>
            </div>

            <h1 className="home-greeting__title text-balance">
              <span className="home-greeting__salute">{greeting},</span>
              <span className="home-greeting__name">{firstName}</span>
            </h1>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <span
                className={
                  focusStatus.tone === "clear"
                    ? "inline-flex w-fit items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
                    : "inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary/12 px-2.5 py-1 text-[11px] font-semibold text-primary"
                }
              >
                <focusStatus.icon className="size-3.5" />
                {focusStatus.label}
              </span>
              <p className="max-w-xl text-sm leading-relaxed text-[var(--regal-text-muted)]">
                {focusStatus.detail}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-[var(--regal-text-muted)]">
              <span className="tabular-nums">
                {profile?.engagement_points ?? 0} engagement pts
              </span>
              <span className="tabular-nums">
                {profile?.focus_minutes ?? 0} focus min
              </span>
              {streak > 0 && (
                <span className="inline-flex items-center gap-1 tabular-nums text-amber-300">
                  <Flame className="size-3.5" /> {streak} day streak
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href="/calendar"
              className="regal-btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
            >
              <Calendar className="size-4" />
              Calendar
            </Link>
            <Link
              href="/focus"
              className="regal-btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
            >
              <Moon className="size-4" />
              Focus
            </Link>
            <Link
              href="/tasks"
              className="regal-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white"
            >
              <CheckSquare className="size-4" />
              New task
            </Link>
          </div>
        </div>
      </section>

      {/* ── Focus stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open Tasks"
          value={openTasks}
          icon={CheckSquare}
          accent="purple"
          href="/tasks"
        />
        <StatCard
          label="Upcoming Events"
          value={stats.upcomingEvents.length}
          icon={Calendar}
          accent="pink"
          href="/calendar"
        />
        <StatCard
          label="Focus Sessions"
          value={stats.focusCount}
          icon={Timer}
          accent="emerald"
          href="/dashboard#focus"
        />
        <StatCard
          label="Student Tools"
          value={STUDENT_TOOLS.length}
          icon={Grid3x3}
          accent="amber"
          href="/tools"
        />
      </div>
    </>
  );
}
