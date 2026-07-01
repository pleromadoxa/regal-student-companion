"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Moon,
  Smile,
  Zap,
  Brain,
  Calendar,
  Lightbulb,
  History,
  Loader2,
  Check,
  TrendingUp,
} from "lucide-react";
import { format, subDays, parseISO, isToday } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useUserId } from "./shared/useUserId";
import { ToolShell, ToolStat, ToolSection } from "./shared";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type WellnessLog = {
  id: string;
  user_id: string;
  log_date: string;
  sleep_hours: number | null;
  mood: number | null;
  energy: number | null;
  stress: number | null;
  notes: string | null;
};

const MOOD_EMOJI = ["😫", "😕", "😐", "🙂", "😄"];
const MOOD_LABELS = ["Rough", "Low", "Okay", "Good", "Great"];
const ENERGY_LABELS = ["Drained", "Tired", "Steady", "Alert", "Energized"];
const STRESS_LABELS = ["Calm", "Mild", "Moderate", "High", "Overwhelmed"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function avg(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function getSleepTip(hours: number): { title: string; tips: string[] } {
  if (hours < 6) {
    return {
      title: "Prioritize rest tonight",
      tips: [
        "Aim for 7–9 hours — sleep debt affects focus and memory.",
        "Try a consistent bedtime, even on weekends.",
        "Avoid screens 30 minutes before bed.",
      ],
    };
  }
  if (hours < 7) {
    return {
      title: "Almost there",
      tips: [
        "You're close to the recommended 7–9 hours.",
        "A short walk or light stretch can boost alertness.",
        "Stay hydrated — dehydration mimics fatigue.",
      ],
    };
  }
  if (hours <= 9) {
    return {
      title: "Solid sleep window",
      tips: [
        "Great job — consistent sleep supports learning.",
        "Keep your routine steady before exam periods.",
        "Morning light exposure helps regulate your rhythm.",
      ],
    };
  }
  return {
    title: "You slept a lot",
    tips: [
      "Oversleeping can leave you groggy — watch how you feel.",
      "If tired despite long sleep, check stress and hydration.",
      "Regular wake times matter more than extra hours.",
    ],
  };
}

function MiniBarChart({
  label,
  data,
  max = 5,
  suffix = "",
  color = "bg-regal-purple-400",
}: {
  label: string;
  data: { date: string; value: number | null }[];
  max?: number;
  suffix?: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="flex items-end gap-1 h-16">
        {data.map((d) => {
          const pct = d.value != null ? (d.value / max) * 100 : 0;
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center gap-1 min-w-0"
            >
              <div className="w-full h-12 flex items-end">
                <div
                  className={cn(
                    "w-full rounded-t transition-all",
                    color,
                    d.value == null && "opacity-20"
                  )}
                  style={{
                    height: `${Math.max(pct, d.value != null ? 8 : 4)}%`,
                  }}
                  title={d.value != null ? `${d.value}${suffix}` : "No data"}
                />
              </div>
              <span className="text-[9px] text-muted truncate w-full text-center">
                {format(parseISO(d.date), "EEE").slice(0, 1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScalePicker({
  label,
  value,
  onChange,
  labels,
  emojis,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  labels?: string[];
  emojis?: string[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>{label}</Label>
        <span className="text-sm text-white tabular-nums">
          {emojis ? emojis[value - 1] : value}
          {labels && (
            <span className="text-muted ml-1.5 text-xs">{labels[value - 1]}</span>
          )}
        </span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "flex-1 py-2 rounded-xl text-sm font-medium border transition-colors",
              value === n
                ? "bg-regal-purple-500/25 border-regal-purple-400/50 text-white"
                : "bg-white/[0.03] border-white/8 text-muted hover:border-regal-purple-400/30"
            )}
          >
            {emojis ? emojis[n - 1] : n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WellnessTool() {
  const { uid, ready } = useUserId();
  const supabase = createClient();
  const [logs, setLogs] = useState<WellnessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editDate, setEditDate] = useState(todayISO);

  const [sleep, setSleep] = useState(7);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);
  const [notes, setNotes] = useState("");

  const loadLogs = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const since = format(subDays(new Date(), 13), "yyyy-MM-dd");
    const { data } = await supabase
      .from("companion_wellness_logs")
      .select("*")
      .eq("user_id", uid)
      .gte("log_date", since)
      .order("log_date", { ascending: false });
    setLogs((data as WellnessLog[]) ?? []);
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    loadLogs();
  }, [uid, loadLogs]);

  useEffect(() => {
    const log = logs.find((l) => l.log_date === editDate);
    if (log) {
      setSleep(Number(log.sleep_hours ?? 7));
      setMood(log.mood ?? 3);
      setEnergy(log.energy ?? 3);
      setStress(log.stress ?? 3);
      setNotes(log.notes ?? "");
    } else if (editDate === todayISO()) {
      setSleep(7);
      setMood(3);
      setEnergy(3);
      setStress(3);
      setNotes("");
    }
  }, [editDate, logs]);

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
      const log = logs.find((l) => l.log_date === date);
      return { date, log };
    });
  }, [logs]);

  const weekStats = useMemo(() => {
    const weekLogs = last7Days.map((d) => d.log).filter(Boolean) as WellnessLog[];
    return {
      sleep: avg(weekLogs.map((l) => Number(l.sleep_hours))),
      mood: avg(weekLogs.map((l) => l.mood)),
      energy: avg(weekLogs.map((l) => l.energy)),
      stress: avg(weekLogs.map((l) => l.stress)),
      daysLogged: weekLogs.length,
    };
  }, [last7Days]);

  const sleepTip = getSleepTip(sleep);

  const trendData = useMemo(
    () => ({
      sleep: last7Days.map(({ date, log }) => ({
        date,
        value: log?.sleep_hours != null ? Number(log.sleep_hours) : null,
      })),
      mood: last7Days.map(({ date, log }) => ({
        date,
        value: log?.mood ?? null,
      })),
      energy: last7Days.map(({ date, log }) => ({
        date,
        value: log?.energy ?? null,
      })),
      stress: last7Days.map(({ date, log }) => ({
        date,
        value: log?.stress ?? null,
      })),
    }),
    [last7Days]
  );

  const save = async () => {
    if (!uid) return;
    setSaving(true);
    setSaved(false);
    const payload = {
      user_id: uid,
      log_date: editDate,
      sleep_hours: sleep,
      mood,
      energy,
      stress,
      notes: notes.trim() || null,
    };
    const { data, error } = await supabase
      .from("companion_wellness_logs")
      .upsert(payload, { onConflict: "user_id,log_date" })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setLogs((prev) => {
        const next = prev.filter((l) => l.log_date !== editDate);
        return [data as WellnessLog, ...next].sort((a, b) =>
          b.log_date.localeCompare(a.log_date)
        );
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const loadLog = (log: WellnessLog) => {
    setEditDate(log.log_date);
  };

  const editLabel = isToday(parseISO(editDate))
    ? "Today"
    : format(parseISO(editDate), "EEEE, MMM d");

  if (!ready) {
    return <div className="shimmer h-48 rounded-2xl" />;
  }

  return (
    <ToolShell
      stats={
        <>
          <ToolStat
            label="Avg sleep (7d)"
            value={
              weekStats.sleep != null ? `${weekStats.sleep.toFixed(1)}h` : "—"
            }
            icon={Moon}
            accent="purple"
          />
          <ToolStat
            label="Avg mood (7d)"
            value={weekStats.mood != null ? weekStats.mood.toFixed(1) : "—"}
            icon={Smile}
            accent="pink"
          />
          <ToolStat
            label="Avg energy (7d)"
            value={weekStats.energy != null ? weekStats.energy.toFixed(1) : "—"}
            icon={Zap}
            accent="amber"
          />
          <ToolStat
            label="Days logged"
            value={`${weekStats.daysLogged}/7`}
            icon={Calendar}
            accent="emerald"
          />
        </>
      }
      sidebar={
        <Card className="border-regal-purple-400/15 max-h-[520px] flex flex-col">
          <div className="flex items-center gap-2 shrink-0 mb-3">
            <History className="w-4 h-4 text-regal-pink" />
            <h3 className="text-sm font-bold text-white">Last 14 days</h3>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pr-1">
            {loading ? (
              <p className="text-xs text-muted py-4">Loading history…</p>
            ) : logs.length === 0 ? (
              <p className="text-xs text-muted py-4">
                Your wellness logs will appear here.
              </p>
            ) : (
              logs.slice(0, 14).map((log) => (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => loadLog(log)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-colors",
                    log.log_date === editDate
                      ? "bg-regal-purple-500/15 border-regal-purple-400/40"
                      : "bg-white/[0.03] border-white/8 hover:border-regal-purple-400/25"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-white">
                      {isToday(parseISO(log.log_date))
                        ? "Today"
                        : format(parseISO(log.log_date), "MMM d")}
                    </span>
                    <span className="text-[10px] text-muted">
                      {log.sleep_hours != null ? `${log.sleep_hours}h sleep` : "—"}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-1.5 text-sm">
                    {log.mood != null && (
                      <span title="Mood">{MOOD_EMOJI[log.mood - 1]}</span>
                    )}
                    {log.energy != null && (
                      <span
                        className="text-[10px] text-amber-300/80"
                        title="Energy"
                      >
                        ⚡{log.energy}
                      </span>
                    )}
                    {log.stress != null && (
                      <span
                        className="text-[10px] text-regal-pink/80"
                        title="Stress"
                      >
                        stress {log.stress}
                      </span>
                    )}
                  </div>
                  {log.notes && (
                    <p className="text-[10px] text-muted mt-1 line-clamp-2">
                      {log.notes}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </Card>
      }
    >
      <Card className="border-regal-purple-400/20 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider">
              Daily log
            </p>
            <p className="text-sm font-bold text-white mt-0.5">{editLabel}</p>
          </div>
          {editDate !== todayISO() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditDate(todayISO())}
            >
              Back to today
            </Button>
          )}
        </div>

        <div>
          <Label>Sleep hours last night</Label>
          <Input
            type="number"
            step="0.5"
            min={0}
            max={24}
            value={sleep}
            onChange={(e) => setSleep(+e.target.value)}
            className="mt-1 max-w-[140px]"
          />
        </div>

        <ScalePicker
          label="Mood (1–5)"
          value={mood}
          onChange={setMood}
          emojis={MOOD_EMOJI}
          labels={MOOD_LABELS}
        />
        <ScalePicker
          label="Energy (1–5)"
          value={energy}
          onChange={setEnergy}
          labels={ENERGY_LABELS}
        />
        <ScalePicker
          label="Stress (1–5)"
          value={stress}
          onChange={setStress}
          labels={STRESS_LABELS}
        />

        <div>
          <Label>Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How are you feeling? Any wins or challenges today?"
            className="mt-1 min-h-[80px]"
          />
        </div>

        <Button onClick={save} disabled={saving || !uid} className="w-full sm:w-auto">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : null}
          {saved ? "Saved" : "Save wellness log"}
        </Button>
      </Card>

      <ToolSection
        title="7-day trends"
        description="Track patterns across sleep, mood, energy, and stress."
      >
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-regal-purple-300" />
            <p className="text-xs text-muted">
              Weekly avg stress:{" "}
              <span className="text-white font-medium tabular-nums">
                {weekStats.stress != null ? weekStats.stress.toFixed(1) : "—"}
              </span>
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <MiniBarChart
              label="Sleep (hours)"
              data={trendData.sleep}
              max={10}
              suffix="h"
              color="bg-regal-purple-400"
            />
            <MiniBarChart
              label="Mood"
              data={trendData.mood}
              color="bg-regal-pink"
            />
            <MiniBarChart
              label="Energy"
              data={trendData.energy}
              color="bg-amber-400"
            />
            <MiniBarChart
              label="Stress"
              data={trendData.stress}
              color="bg-rose-400"
            />
          </div>
        </Card>
      </ToolSection>

      <Card className="border-amber-400/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/15 shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              {sleepTip.title}
              <Brain className="w-3.5 h-3.5 text-muted" />
            </p>
            <ul className="mt-2 space-y-1.5">
              {sleepTip.tips.map((tip) => (
                <li key={tip} className="text-xs text-muted leading-relaxed">
                  • {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </ToolShell>
  );
}
