"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Select } from "@/components/ui/Input";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import {
  ToolEmpty,
  ToolShell,
  ToolStat,
  ToolSection,
  useUserId,
} from "./shared";
import { cn } from "@/lib/utils";

type StudyMatchProfile = {
  id: string;
  user_id: string;
  subjects: string[];
  availability: string | null;
  bio: string | null;
  is_visible: boolean;
};

type PartnerMatch = StudyMatchProfile & {
  display_name: string;
  avatar_url: string | null;
};

const AVAILABILITY_OPTIONS = [
  "Weekday mornings",
  "Weekday afternoons",
  "Weekday evenings",
  "Weekends",
  "Flexible",
] as const;

function parseSubjects(raw: string): string[] {
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

function subjectOverlap(a: string[], b: string[]): string[] {
  const mine = new Set(a.map((s) => s.toLowerCase()));
  return b.filter((s) => mine.has(s.toLowerCase()));
}

function MatchCard({
  partner,
  sharedSubjects,
}: {
  partner: PartnerMatch;
  sharedSubjects: string[];
}) {
  return (
    <Card className="border-regal-purple-400/15 hover:border-regal-purple-400/30 transition-colors">
      <div className="flex items-start gap-3">
        <ProfileAvatar
          userId={partner.user_id}
          name={partner.display_name}
          avatarUrl={partner.avatar_url}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white truncate">{partner.display_name}</p>
          {partner.availability && (
            <p className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 shrink-0" />
              {partner.availability}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-4">
        {partner.subjects.map((subject) => (
          <span
            key={subject}
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              sharedSubjects.some((s) => s.toLowerCase() === subject.toLowerCase())
                ? "text-regal-pink bg-regal-pink/15 border-regal-pink/25"
                : "text-regal-purple-300 bg-regal-purple-500/15 border-regal-purple-400/20"
            )}
          >
            {subject}
          </span>
        ))}
      </div>

      {partner.bio && (
        <p className="text-xs text-muted mt-3 leading-relaxed line-clamp-3">
          {partner.bio}
        </p>
      )}

      {sharedSubjects.length > 0 && (
        <p className="text-[10px] text-emerald-300/90 mt-3 font-medium">
          {sharedSubjects.length} shared subject
          {sharedSubjects.length === 1 ? "" : "s"}
        </p>
      )}
    </Card>
  );
}

export function StudyMatchTool() {
  const { uid, ready } = useUserId();
  const supabase = createClient();

  const [partners, setPartners] = useState<PartnerMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");

  const [subjects, setSubjects] = useState("");
  const [bio, setBio] = useState("");
  const [availability, setAvailability] = useState<string>(AVAILABILITY_OPTIONS[4]);
  const [isVisible, setIsVisible] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  const mySubjects = useMemo(() => parseSubjects(subjects), [subjects]);

  const loadPartners = useCallback(async () => {
    const { data: matchProfiles } = await supabase
      .from("companion_study_match_profiles")
      .select("*")
      .eq("is_visible", true);

    const others = ((matchProfiles as StudyMatchProfile[] | null) ?? []).filter(
      (p) => p.user_id !== uid
    );

    if (others.length === 0) {
      setPartners([]);
      return;
    }

    const userIds = others.map((p) => p.user_id);
    const { data: profiles } = await supabase
      .from("companion_profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        {
          display_name: p.display_name ?? "Student",
          avatar_url: p.avatar_url ?? null,
        },
      ])
    );

    setPartners(
      others.map((p) => ({
        ...p,
        display_name: profileMap.get(p.user_id)?.display_name ?? "Student",
        avatar_url: profileMap.get(p.user_id)?.avatar_url ?? null,
      }))
    );
  }, [supabase, uid]);

  const loadOwnProfile = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase
      .from("companion_study_match_profiles")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    if (data) {
      const profile = data as StudyMatchProfile;
      setSubjects(profile.subjects.join(", "));
      setBio(profile.bio ?? "");
      setAvailability(profile.availability ?? AVAILABILITY_OPTIONS[4]);
      setIsVisible(profile.is_visible);
      setHasProfile(true);
    }
  }, [supabase, uid]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      await loadOwnProfile();
      if (cancelled) return;
      await loadPartners();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, loadOwnProfile, loadPartners]);

  const showLoading = !ready || (loading && !!uid);

  const saveProfile = async () => {
    if (!uid || mySubjects.length === 0) return;
    setSaving(true);
    setSaved(false);
    await supabase.from("companion_study_match_profiles").upsert(
      {
        user_id: uid,
        subjects: mySubjects,
        bio: bio.trim() || null,
        availability: availability || null,
        is_visible: isVisible,
      },
      { onConflict: "user_id" }
    );
    setHasProfile(true);
    setSaving(false);
    setSaved(true);
    await loadPartners();
    setTimeout(() => setSaved(false), 2000);
  };

  const filteredPartners = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter(
      (p) =>
        p.subjects.some((s) => s.toLowerCase().includes(q)) ||
        (p.bio?.toLowerCase().includes(q) ?? false) ||
        p.display_name.toLowerCase().includes(q)
    );
  }, [partners, subjectSearch]);

  const sidebar = (
    <Card className="border-regal-purple-400/20 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white">Your match profile</h3>
        <p className="text-xs text-muted mt-0.5">
          Share subjects and availability so classmates can find you.
        </p>
      </div>

      <div>
        <Label>Subjects (comma-separated)</Label>
        <Input
          value={subjects}
          onChange={(e) => setSubjects(e.target.value)}
          placeholder="Calculus, Biology, History"
          className="mt-1"
        />
      </div>

      <div>
        <Label>Bio</Label>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="What you study, preferred study style, goals…"
          className="mt-1 min-h-[88px]"
        />
      </div>

      <div>
        <Label>Availability</Label>
        <Select
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          className="mt-1"
        >
          {AVAILABILITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-white">Visible to others</p>
          <p className="text-[10px] text-muted mt-0.5">
            {isVisible ? "Your profile appears in partner search" : "Hidden from discovery"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isVisible}
          onClick={() => setIsVisible((v) => !v)}
          className={cn(
            "relative w-11 h-6 rounded-full transition-colors shrink-0",
            isVisible ? "bg-regal-purple-500" : "bg-white/15"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform flex items-center justify-center",
              isVisible && "translate-x-5"
            )}
          >
            {isVisible ? (
              <Eye className="w-3 h-3 text-regal-purple-600" />
            ) : (
              <EyeOff className="w-3 h-3 text-white/50" />
            )}
          </span>
        </button>
      </div>

      <Button
        onClick={saveProfile}
        disabled={saving || mySubjects.length === 0}
        className="w-full"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <Save className="w-4 h-4" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        {saved ? "Profile saved" : hasProfile ? "Update profile" : "Publish profile"}
      </Button>

      {!isVisible && (
        <p className="text-[10px] text-amber-300/90 text-center">
          You can still browse partners while hidden.
        </p>
      )}
    </Card>
  );

  return (
    <ToolShell
      stats={
        <>
          <ToolStat
            label="Partners found"
            value={partners.length}
            icon={Users}
            accent="pink"
          />
          <ToolStat
            label="Your subjects"
            value={mySubjects.length}
            icon={BookOpen}
            accent="purple"
          />
        </>
      }
      sidebar={sidebar}
    >
      <ToolSection
        title="Study partners"
        description="Browse classmates who share your subjects and study windows."
        action={
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <Input
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              placeholder="Filter by subject…"
              className="pl-9"
            />
          </div>
        }
      >
        {showLoading ? (
          <Card className="py-14 text-center">
            <Loader2 className="w-8 h-8 text-regal-purple-300 animate-spin mx-auto" />
            <p className="text-sm text-muted mt-3">Loading study partners…</p>
          </Card>
        ) : !hasProfile && partners.length === 0 ? (
          <ToolEmpty
            icon={UserPlus}
            title="Set up your profile"
            description="Add your subjects and availability in the sidebar to discover study partners on campus."
          />
        ) : filteredPartners.length === 0 ? (
          <ToolEmpty
            icon={Search}
            title={subjectSearch ? "No matching partners" : "No partners yet"}
            description={
              subjectSearch
                ? "Try a different subject keyword or clear the filter."
                : "Be the first in your subjects — publish your profile to get started."
            }
            action={
              subjectSearch ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSubjectSearch("")}
                >
                  Clear filter
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filteredPartners.map((partner) => (
              <MatchCard
                key={partner.user_id}
                partner={partner}
                sharedSubjects={subjectOverlap(mySubjects, partner.subjects)}
              />
            ))}
          </div>
        )}
      </ToolSection>
    </ToolShell>
  );
}
