"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  GraduationCap,
  Trophy,
  Flame,
  Timer,
  CheckCircle2,
  BookOpen,
  Save,
  Loader2,
  RefreshCw,
  ExternalLink,
  Cloud,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { pushCloudSync, pullCloudSync } from "@/lib/cloud-sync";
import { syncRegalProfileAvatar } from "@/lib/profile-avatar";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { PageHeader, StatCard } from "@/components/ui/PageHeader";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { revalidateProfile } from "@/app/actions/revalidate";
import { useToast } from "@/components/ui/Toast";
import { ProfilePlanSection } from "@/components/profile/ProfilePlanSection";
import type { CompanionProfile } from "@/types";
import type { PlanId, PlanLimits } from "@/lib/plans";

const YEAR_LEVELS = [
  "",
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate",
  "Other",
] as const;

export type ProfileStats = {
  tasksCompleted: number;
  focusSessions: number;
  savedWords: number;
  leaderboardRank: number | null;
};

export type ProfileSubscription = {
  planId: PlanId;
  limits: PlanLimits;
  aiUsedToday: number;
  voiceUsedMonth: number;
};

type ProfileClientProps = {
  profile: CompanionProfile;
  stats: ProfileStats;
  subscription: ProfileSubscription;
};

export function ProfileClient({ profile, stats, subscription }: ProfileClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [major, setMajor] = useState(profile.major ?? "");
  const [yearLevel, setYearLevel] = useState(profile.year_level ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const name = displayName || profile.email.split("@")[0];

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("companion_profiles")
      .update({
        display_name: displayName.trim() || null,
        major: major.trim() || null,
        year_level: yearLevel || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    setSaving(false);
    if (err) {
      setError("Could not save profile. Please try again.");
      return;
    }
    setMessage("Profile saved.");
    toast.success("Profile saved.");
    await revalidateProfile();
    router.refresh();
  };

  const syncFromRegal = async () => {
    setSyncing(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setSyncing(false);
      return;
    }
    await syncRegalProfileAvatar(supabase, user);
    const { data: regal } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (regal?.avatar_url) setAvatarUrl(regal.avatar_url);
    if (regal?.full_name && !displayName) setDisplayName(regal.full_name);
    setSyncing(false);
    setMessage("Synced photo and name from Regal Mail.");
    toast.success("Synced from Regal Mail.");
    await revalidateProfile();
    router.refresh();
  };

  const pushToCloud = async () => {
    setCloudSyncing(true);
    setError(null);
    setMessage(null);
    const result = await pushCloudSync(profile.id);
    setCloudSyncing(false);
    if (!result.ok) {
      setError(result.error ?? "Cloud sync failed.");
      toast.error(result.error ?? "Cloud sync failed.");
      return;
    }
    setMessage(`Backed up ${result.keys} local data keys to Cloudflare R2.`);
    toast.success(`Backed up ${result.keys} items to cloud.`);
  };

  const pullFromCloud = async () => {
    setCloudSyncing(true);
    setError(null);
    setMessage(null);
    const result = await pullCloudSync(profile.id);
    setCloudSyncing(false);
    if (!result.ok) {
      setError(result.error ?? "Cloud sync failed.");
      toast.error(result.error ?? "Cloud sync failed.");
      return;
    }
    setMessage(
      result.skipped
        ? "Local data is newer than your cloud backup — push first to update the cloud."
        : result.applied > 0
          ? `Restored ${result.applied} items from Cloudflare R2.`
          : "No cloud backup found yet — push to cloud first."
    );
    if (result.applied > 0) toast.success(`Restored ${result.applied} items from cloud.`);
    else if (result.skipped) toast.info("Local data is newer than cloud backup.");
    else toast.info("No cloud backup yet — push first.");
    router.refresh();
  };

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        title="My Profile"
        description="Manage your student profile, track progress, and sync with Regal Mail"
      />

      {/* Hero */}
      <Card className="border-regal-purple-400/25 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-regal-purple-500/10 via-transparent to-regal-pink/10 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <ProfileAvatar
            userId={profile.id}
            name={name}
            avatarUrl={avatarUrl}
            size={96}
            className="ring-4 ring-regal-purple-500/30"
          />
          <div className="flex-1 text-center sm:text-left min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">{name}</h2>
            <p className="text-muted text-sm flex items-center justify-center sm:justify-start gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              {profile.email}
            </p>
            {(major || yearLevel) && (
              <p className="text-sm text-regal-purple-300 mt-2 flex items-center justify-center sm:justify-start gap-1.5">
                <GraduationCap className="w-4 h-4 shrink-0" />
                {[yearLevel, major].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="text-xs text-muted mt-2">Member since {memberSince}</p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
              <Button variant="secondary" size="sm" onClick={syncFromRegal} disabled={syncing}>
                {syncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sync from Regal Mail
              </Button>
              <Button variant="secondary" size="sm" onClick={pushToCloud} disabled={cloudSyncing}>
                {cloudSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
                Push to Cloud
              </Button>
              <Button variant="ghost" size="sm" onClick={pullFromCloud} disabled={cloudSyncing}>
                Pull from Cloud
              </Button>
              <Link href="/leaderboard">
                <Button variant="ghost" size="sm">
                  <Trophy className="w-4 h-4" /> Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Engagement"
          value={profile.engagement_points}
          icon={Trophy}
          accent="purple"
          href="/leaderboard"
        />
        <StatCard
          label="Focus Minutes"
          value={profile.focus_minutes}
          icon={Timer}
          accent="pink"
          href="/dashboard#focus"
        />
        <StatCard
          label="Study Streak"
          value={profile.study_streak ?? 0}
          icon={Flame}
          accent="amber"
        />
        <StatCard
          label="Leaderboard"
          value={stats.leaderboardRank ? `#${stats.leaderboardRank}` : "—"}
          icon={Trophy}
          accent="emerald"
          href="/leaderboard"
        />
      </div>

      <ProfilePlanSection
        planId={subscription.planId}
        limits={subscription.limits}
        aiUsedToday={subscription.aiUsedToday}
        voiceUsedMonth={subscription.voiceUsedMonth}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Edit form */}
        <Card>
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
            <CardDescription>
              Your display name and academic info appear across the app
            </CardDescription>
          </CardHeader>
          <div className="space-y-4">
            <div>
              <Label>Display name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label>Major / field of study</Label>
              <Input
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="e.g. Computer Science, Biology"
              />
            </div>
            <div>
              <Label>Year level</Label>
              <Select
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
              >
                <option value="">Select year</option>
                {YEAR_LEVELS.filter(Boolean).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={profile.email} disabled className="opacity-60" />
              <p className="text-[11px] text-muted mt-1">
                Regal Mail address — managed by your Regal account
              </p>
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            {message && <p className="text-sm text-emerald-300">{message}</p>}
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save changes
            </Button>
          </div>
        </Card>

        {/* Activity summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity summary</CardTitle>
              <CardDescription>Your companion usage at a glance</CardDescription>
            </CardHeader>
            <ul className="space-y-3">
              <li className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/8">
                <span className="text-sm text-muted flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Tasks completed
                </span>
                <span className="font-semibold text-white tabular-nums">
                  {stats.tasksCompleted}
                </span>
              </li>
              <li className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/8">
                <span className="text-sm text-muted flex items-center gap-2">
                  <Timer className="w-4 h-4 text-regal-pink" />
                  Focus sessions
                </span>
                <span className="font-semibold text-white tabular-nums">
                  {stats.focusSessions}
                </span>
              </li>
              <li className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/8">
                <span className="text-sm text-muted flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-regal-purple-300" />
                  Saved dictionary words
                </span>
                <span className="font-semibold text-white tabular-nums">
                  {stats.savedWords}
                </span>
              </li>
            </ul>
          </Card>

          <Card className="border-regal-purple-400/15">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Cloud className="w-4 h-4 text-regal-purple-300" />
                Cloud sync (R2)
              </CardTitle>
            </CardHeader>
            <p className="text-sm text-muted leading-relaxed">
              Back up tool drafts, CV entries, courses, mentor chats, and exam plans to
              Cloudflare R2. Use Push before switching devices, then Pull on the new device.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={pushToCloud} disabled={cloudSyncing}>
                Push to Cloud
              </Button>
              <Button variant="ghost" size="sm" onClick={pullFromCloud} disabled={cloudSyncing}>
                Pull from Cloud
              </Button>
            </div>
          </Card>

          <Card className="border-regal-purple-400/15">
            <CardHeader>
              <CardTitle className="text-base">Regal account</CardTitle>
            </CardHeader>
            <p className="text-sm text-muted leading-relaxed">
              Profile photos are synced from your Regal Mail account. Update your
              photo in Regal Mail, then tap &ldquo;Sync from Regal Mail&rdquo; here.
            </p>
            <a
              href="https://regalmail.me"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-regal-pink hover:text-white mt-4 transition-colors"
            >
              Open Regal Mail
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-regal-purple-300" />
                Quick links
              </CardTitle>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard">
                <Button variant="secondary" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link href="/tasks">
                <Button variant="secondary" size="sm">
                  Tasks
                </Button>
              </Link>
              <Link href="/dictionary">
                <Button variant="secondary" size="sm">
                  Dictionary
                </Button>
              </Link>
              <Link href="/tools">
                <Button variant="secondary" size="sm">
                  Student Tools
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
