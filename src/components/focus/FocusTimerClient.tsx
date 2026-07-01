"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Timer,
  CloudRain,
  Coffee,
  Moon,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const PRESETS = [
  { id: "lofi-rain", label: "Rain", icon: CloudRain, accent: "from-sky-400/30 to-sky-600/10", iconColor: "text-sky-300" },
  { id: "lofi-cafe", label: "Café", icon: Coffee, accent: "from-amber-400/30 to-amber-600/10", iconColor: "text-amber-300" },
  { id: "lofi-night", label: "Night", icon: Moon, accent: "from-indigo-400/30 to-indigo-600/10", iconColor: "text-indigo-300" },
] as const;

const DURATIONS = [15, 25, 45, 60] as const;

function useLofiSound(active: boolean, preset: string) {
  const nodesRef = useRef<OscillatorNode[]>([]);
  const noiseRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (!active) {
      nodesRef.current.forEach((n) => {
        try { n.stop(); } catch { /* */ }
      });
      nodesRef.current = [];
      try { noiseRef.current?.stop(); } catch { /* */ }
      noiseRef.current = null;
      return;
    }

    const ctx = new AudioContext();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.08;
    masterGain.connect(ctx.destination);

    const freqs =
      preset === "lofi-cafe"
        ? [110, 165, 220]
        : preset === "lofi-night"
          ? [55, 82.5, 110]
          : [130.81, 196, 261.63];

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.3 / (i + 1);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.02;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = freq * 0.01;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      lfo.start();
      nodesRef.current.push(osc, lfo);
    });

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = preset === "lofi-rain" ? 800 : 400;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = preset === "lofi-cafe" ? 0.04 : 0.06;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();
    noiseRef.current = noise;

    return () => {
      nodesRef.current.forEach((n) => {
        try { n.stop(); } catch { /* */ }
      });
      nodesRef.current = [];
      try { noise.stop(); } catch { /* */ }
      ctx.close();
    };
  }, [active, preset]);
}

type FocusTimerProps = {
  initialCompleted?: number;
  initialFocusMinutes?: number;
  variant?: "embedded" | "fullscreen";
  onSessionComplete?: () => void;
};

function FlipDigits({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [flip, setFlip] = useState(0);
  useEffect(() => setFlip((f) => f + 1), [value]);
  return (
    <span
      key={flip}
      className={cn("focus-flip-pair focus-clock-digits tabular-nums", className)}
    >
      {value}
    </span>
  );
}

function TimerDisplay({
  mins,
  secs,
  progress,
  running,
  celebrate,
  duration,
  size = "compact",
}: {
  mins: number;
  secs: number;
  progress: number;
  running: boolean;
  celebrate: boolean;
  duration: number;
  size?: "compact" | "large";
}) {
  const large = size === "large";
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const pct = Math.round(progress * 100);

  return (
    <div className={cn("relative w-full select-none", large ? "max-w-3xl mx-auto" : "max-w-full")}>
      {running && (
        <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-emerald-500/10 via-regal-purple-500/10 to-regal-pink/10 blur-3xl focus-breathe pointer-events-none" />
      )}

      <div
        className={cn(
          "focus-digital-panel relative rounded-[1.25rem] overflow-hidden",
          "border border-white/[0.08] bg-[#030106]/95",
          running && "focus-digital-panel-running focus-clock-running"
        )}
        role="timer"
        aria-live="polite"
        aria-label={`${mins} minutes ${secs} seconds remaining`}
      >
        <div className="focus-clock-bevel absolute inset-0 pointer-events-none" />
        <div className="focus-scanlines absolute inset-0 pointer-events-none opacity-40" />
        <div className="absolute inset-0 focus-mesh opacity-50 pointer-events-none" />

        {/* Hero clock */}
        <div
          className={cn(
            "focus-clock-hero relative w-full",
            large ? "py-12 sm:py-16 px-4" : "py-8 sm:py-10 px-1"
          )}
        >
          <div className="flex items-center justify-center gap-0">
            <FlipDigits
              value={mm}
              className={large ? "focus-clock-digits-large" : "focus-clock-digits-compact"}
            />
            <span
              className={cn(
                "focus-clock-colon",
                large ? "focus-clock-colon-large" : "focus-clock-colon-compact",
                running && "focus-colon-blink"
              )}
              aria-hidden
            >
              :
            </span>
            <FlipDigits
              value={ss}
              className={cn(
                "focus-clock-secs",
                large ? "focus-clock-digits-large" : "focus-clock-digits-compact"
              )}
            />
          </div>

          <p className="text-center mt-3 sm:mt-4 text-[10px] sm:text-xs font-medium uppercase tracking-[0.35em] text-white/25">
            {running ? "Focus session active" : `${duration} minute goal`}
          </p>
        </div>

        {/* Progress */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-5">
          <div className="flex items-center justify-between text-[9px] font-mono text-white/25 mb-2 tracking-wider">
            <span>{running ? "LIVE" : "READY"}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-[3px] rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-1000 ease-linear",
                running
                  ? "focus-progress-shimmer bg-gradient-to-r from-emerald-400 via-violet-400 to-fuchsia-400"
                  : "bg-gradient-to-r from-emerald-500/60 via-violet-500/60 to-fuchsia-500/60"
              )}
              style={{ width: `${Math.max(progress * 100, 2)}%` }}
            />
          </div>
        </div>
      </div>

      {celebrate && (
        <div className="absolute inset-0 flex items-center justify-center focus-celebrate pointer-events-none z-20">
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-black/60 border border-emerald-400/40 px-8 py-6 backdrop-blur-xl shadow-2xl shadow-emerald-500/30">
            <CheckCircle2 className="w-12 h-12 text-emerald-300" />
            <span className="text-lg font-semibold text-white tracking-tight">Session complete</span>
            <span className="text-xs text-emerald-200/80">+10 engagement pts</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ControlBar({
  running,
  paused,
  soundOn,
  preset,
  duration,
  isCompact,
  onToggleRun,
  onReset,
  onToggleSound,
  onSelectDuration,
  onSelectPreset,
}: {
  running: boolean;
  paused: boolean;
  soundOn: boolean;
  preset: string;
  duration: number;
  isCompact?: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  onToggleSound: () => void;
  onSelectDuration: (d: number) => void;
  onSelectPreset: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "w-full rounded-xl border border-white/[0.06] bg-black/20 backdrop-blur-sm",
        isCompact ? "p-2.5 space-y-2" : "p-4 space-y-4 max-w-md mx-auto"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-0.5">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={running}
              onClick={() => onSelectDuration(d)}
              className={cn(
                "flex-1 py-1 rounded-lg text-[10px] sm:text-xs font-semibold transition-all",
                duration === d
                  ? "text-white bg-white/10 ring-1 ring-white/15"
                  : "text-white/30 hover:text-white/60 disabled:opacity-30"
              )}
            >
              {d}m
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onToggleRun}
          className={cn(
            "relative shrink-0 flex items-center justify-center rounded-full transition-all duration-300",
            isCompact ? "w-11 h-11" : "w-14 h-14",
            running
              ? "bg-white/10 ring-1 ring-white/20"
              : "regal-ai-gradient shadow-lg shadow-regal-purple-500/40 hover:scale-105"
          )}
        >
          {running ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
        </button>
        <button type="button" onClick={onReset} title="Reset" className="p-2 rounded-lg text-white/35 hover:text-white hover:bg-white/8">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggleSound}
          title={soundOn ? "Mute" : "Sound"}
          className={cn(
            "p-2 rounded-lg transition-colors",
            soundOn ? "text-emerald-300 bg-emerald-500/15" : "text-white/35 hover:text-white hover:bg-white/8"
          )}
        >
          {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!isCompact && (
        <div className="flex gap-1.5">
          {PRESETS.map((p) => {
            const Icon = p.icon;
            const active = preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPreset(p.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all",
                  active
                    ? cn("text-white bg-gradient-to-b ring-1 ring-white/15", p.accent)
                    : "text-white/30 hover:text-white/60 hover:bg-white/5"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", active ? p.iconColor : "opacity-60")} />
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      {isCompact && (
        <div className="flex justify-center gap-1">
          {PRESETS.map((p) => {
            const Icon = p.icon;
            const active = preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPreset(p.id)}
                title={p.label}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  active ? "bg-white/10 text-white" : "text-white/25 hover:text-white/50"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", active ? p.iconColor : "")} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FocusTimerCore({
  initialCompleted = 0,
  initialFocusMinutes = 0,
  variant = "embedded",
  onSessionComplete,
  immersive,
  onToggleImmersive,
}: FocusTimerProps & {
  immersive?: boolean;
  onToggleImmersive?: () => void;
}) {
  const [duration, setDuration] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [wasRunning, setWasRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [preset, setPreset] = useState<string>("lofi-rain");
  const [completed, setCompleted] = useState(initialCompleted);
  const [focusMinutes, setFocusMinutes] = useState(initialFocusMinutes);
  const [celebrate, setCelebrate] = useState(false);

  useLofiSound(running && soundOn, preset);

  const logSession = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("companion_focus_sessions").insert({
      user_id: user.id,
      duration_minutes: duration,
      completed: true,
      sound_preset: preset,
    });

    const { data: profile } = await supabase
      .from("companion_profiles")
      .select("focus_minutes, engagement_points")
      .eq("id", user.id)
      .single();

    if (profile) {
      const newMinutes = (profile.focus_minutes ?? 0) + duration;
      await supabase
        .from("companion_profiles")
        .update({
          focus_minutes: newMinutes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      await supabase.rpc("companion_increment_engagement", { delta: 10 });
      setFocusMinutes(newMinutes);
    }
    onSessionComplete?.();
  }, [duration, preset, onSessionComplete]);

  const tick = useCallback(() => {
    setSecondsLeft((s) => {
      if (s <= 1) {
        setRunning(false);
        setWasRunning(false);
        setCompleted((c) => c + 1);
        setCelebrate(true);
        window.setTimeout(() => setCelebrate(false), 2800);
        void logSession();
        return duration * 60;
      }
      return s - 1;
    });
  }, [duration, logSession]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, tick]);

  const reset = () => {
    setRunning(false);
    setWasRunning(false);
    setSecondsLeft(duration * 60);
  };

  const selectDuration = (d: number) => {
    setDuration(d);
    setSecondsLeft(d * 60);
    setRunning(false);
    setWasRunning(false);
  };

  const toggleRun = () => {
    if (running) {
      setRunning(false);
      setWasRunning(true);
      return;
    }
    setRunning(true);
    setWasRunning(false);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress = 1 - secondsLeft / (duration * 60);
  const isFullscreen = variant === "fullscreen" || immersive;
  const isCompact = variant === "embedded" && !isFullscreen;
  const paused = wasRunning && !running && secondsLeft < duration * 60;

  const controlBar = (
    <ControlBar
      running={running}
      paused={paused}
      soundOn={soundOn}
      preset={preset}
      duration={duration}
      isCompact={isCompact}
      onToggleRun={toggleRun}
      onReset={reset}
      onToggleSound={() => setSoundOn(!soundOn)}
      onSelectDuration={selectDuration}
      onSelectPreset={setPreset}
    />
  );

  if (isFullscreen) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[65vh] py-12 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] left-[20%] w-[420px] h-[420px] bg-emerald-500/10 rounded-full blur-[100px] focus-glow" />
          <div className="absolute bottom-[10%] right-[15%] w-[380px] h-[380px] bg-regal-purple-500/12 rounded-full blur-[100px] focus-glow" />
        </div>
        <div className="relative z-10 flex flex-col items-center w-full max-w-2xl gap-8">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-regal-pink" />
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-regal-pink/90">
              Deep Focus
            </p>
          </div>
          <TimerDisplay
            mins={mins}
            secs={secs}
            progress={progress}
            running={running}
            celebrate={celebrate}
            duration={duration}
            size="large"
          />
          {controlBar}
          <p className="text-xs text-white/35">
            {completed} sessions · {focusMinutes} minutes focused
          </p>
          {onToggleImmersive && (
            <Button variant="ghost" size="sm" onClick={onToggleImmersive} className="text-white/50">
              <Minimize2 className="w-4 h-4" /> Exit
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (isCompact) {
    return (
      <div className="flex flex-col gap-3 py-0.5">
        <TimerDisplay
          mins={mins}
          secs={secs}
          progress={progress}
          running={running}
          celebrate={celebrate}
          duration={duration}
          size="compact"
        />
        {controlBar}
      </div>
    );
  }

  return (
    <div className="text-center space-y-6 py-2">
      <TimerDisplay
        mins={mins}
        secs={secs}
        progress={progress}
        running={running}
        celebrate={celebrate}
        duration={duration}
        size="compact"
      />
      {controlBar}
    </div>
  );
}

export function DashboardFocusMode({
  initialCompleted = 0,
  initialFocusMinutes = 0,
}: {
  initialCompleted?: number;
  initialFocusMinutes?: number;
}) {
  const [immersive, setImmersive] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#focus") {
      document.getElementById("focus-mode")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = immersive ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [immersive]);

  return (
    <>
      <section id="focus-mode" className="scroll-mt-24 h-full min-h-[20rem]">
        <div className="relative h-full min-h-[20rem] rounded-2xl overflow-hidden group">
          {/* Gradient border — harmonized with Word of the Day */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/80 via-regal-purple-500 to-regal-pink opacity-80 p-[1px]">
            <div className="absolute inset-[1px] rounded-2xl bg-[#08040f]" />
          </div>

          <div className="absolute inset-[1px] rounded-2xl focus-mesh pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none focus-glow" />
          <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-regal-pink/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 h-full flex flex-col p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20">
                <Sparkles className="w-3 h-3 text-emerald-300" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/90">
                  Focus
                </span>
              </div>
              <button
                type="button"
                onClick={() => setImmersive(true)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 border border-white/8 transition-all"
                title="Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center min-h-[10rem]">
              <FocusTimerCore
                initialCompleted={initialCompleted}
                initialFocusMinutes={initialFocusMinutes}
                variant="embedded"
                immersive={false}
                onToggleImmersive={() => setImmersive(true)}
              />
            </div>
          </div>
        </div>
      </section>

      {immersive && (
        <div className="fixed inset-0 z-[100] bg-[#030108]/98 backdrop-blur-3xl flex flex-col">
          <div className="absolute inset-0 focus-mesh opacity-60 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-emerald-500/8 via-regal-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/[0.06] border border-white/10">
                <Timer className="w-5 h-5 text-emerald-300" />
              </div>
              <span className="font-semibold text-white tracking-tight">Focus Mode</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setImmersive(false)}>
              <Minimize2 className="w-4 h-4" /> Exit
            </Button>
          </div>
          <div className="relative flex-1 overflow-y-auto">
            <FocusTimerCore
              initialCompleted={initialCompleted}
              initialFocusMinutes={initialFocusMinutes}
              variant="fullscreen"
              immersive
              onToggleImmersive={() => setImmersive(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

/** @deprecated Use DashboardFocusMode on dashboard; kept for redirect page */
export function FocusTimerClient() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto page-enter">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Focus Mode</h1>
        <p className="text-muted text-sm mt-1">Focus Mode now lives on your dashboard</p>
      </div>
      <div className="glass-panel rounded-2xl py-8">
        <FocusTimerCore variant="embedded" />
      </div>
    </div>
  );
}
