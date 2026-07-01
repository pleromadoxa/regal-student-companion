import { Flame } from "lucide-react";
import { getAuthUser, getCompanionProfile } from "@/lib/supabase/auth-server";
import { getDashboardStats } from "@/lib/dashboard-data";
import { StatCard } from "@/components/ui/PageHeader";
import { CheckSquare, Calendar, Timer, Grid3x3 } from "lucide-react";
import { STUDENT_TOOLS } from "@/lib/student-tools";

export async function DashboardHeader({ userId }: { userId: string }) {
  const [profile, stats, user] = await Promise.all([
    getCompanionProfile(userId),
    getDashboardStats(userId),
    getAuthUser(),
  ]);

  const displayName =
    profile?.display_name ?? user?.email?.split("@")[0] ?? "Student";

  return (
    <>
      <div>
        <p className="text-muted text-sm mb-1">Welcome back,</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          {displayName}
        </h1>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted">
          <span>{profile?.engagement_points ?? 0} engagement pts</span>
          <span className="text-white/20">·</span>
          <span>{profile?.focus_minutes ?? 0} focus min</span>
          {(profile?.study_streak ?? 0) > 0 && (
            <>
              <span className="text-white/20">·</span>
              <span className="flex items-center gap-1 text-orange-300">
                <Flame className="w-3.5 h-3.5" /> {profile?.study_streak} day streak
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Open Tasks"
          value={stats.pendingTasks.length}
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
