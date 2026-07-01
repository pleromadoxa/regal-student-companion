import Link from "next/link";
import { format, isToday, isTomorrow } from "date-fns";
import { ArrowRight, Sparkles } from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard-data";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";

function formatDue(date: string | null) {
  if (!date) return null;
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d");
}

export async function DashboardPanels({ userId }: { userId: string }) {
  const { pendingTasks, upcomingEvents } = await getDashboardStats(userId);

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Priority Tasks</CardTitle>
              <CardDescription>Your next items to tackle</CardDescription>
            </div>
            <Link href="/tasks" prefetch>
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">No open tasks — add one to get started.</p>
          ) : (
            <ul className="space-y-2">
              {pendingTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-regal-purple-400/20 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{task.title}</p>
                    <p className="text-xs text-muted capitalize">
                      {task.priority} · {task.status.replace("_", " ")}
                    </p>
                  </div>
                  {task.due_date && (
                    <span className="text-xs text-regal-pink font-medium">
                      {formatDue(task.due_date)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Calendar</CardTitle>
              <CardDescription>Classes, deadlines, and events</CardDescription>
            </div>
            <Link href="/calendar" prefetch>
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">No upcoming events scheduled.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                >
                  <div
                    className="w-1 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{event.title}</p>
                    <p className="text-xs text-muted">
                      {format(new Date(event.start_at), "EEE, MMM d · h:mm a")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="border-regal-purple-400/25 bg-gradient-to-br from-regal-purple-900/50 via-transparent to-regal-pink/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-regal-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl regal-ai-gradient shadow-lg shadow-regal-purple-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle>Regal AI Research Lab</CardTitle>
                <RegalAIBadge />
              </div>
              <CardDescription className="mt-1">
                Upload sources, generate summaries, and chat with your research — powered by Regal AI.
              </CardDescription>
            </div>
          </div>
          <Link href="/research" prefetch>
            <Button>Open Research Lab</Button>
          </Link>
        </div>
      </Card>
    </>
  );
}
