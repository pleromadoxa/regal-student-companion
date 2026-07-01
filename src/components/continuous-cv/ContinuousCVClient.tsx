"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Loader2,
  Save,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteCVEntry,
  loadCVEntries,
  loadCVProfile,
  saveCVEntry,
  saveCVProfile,
} from "@/lib/cv-courses-storage";
import { exportCVToPDF } from "@/lib/cv-export";
import type { CVEntry, CVEntryType, CVProfile } from "@/types/cv-courses";
import { CV_ENTRY_LABELS } from "@/types/cv-courses";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { CVPreview } from "@/components/continuous-cv/CVPreview";
import { CVTimeline } from "@/components/continuous-cv/CVTimeline";
import { cn } from "@/lib/utils";

const EMPTY_PROFILE = (userId: string): CVProfile => ({
  user_id: userId,
  full_name: null,
  email: null,
  phone: null,
  major: null,
  course_enrolled: null,
  headline: null,
  bio: null,
  high_school: null,
  high_school_years: null,
  university: null,
  university_years: null,
  location: null,
  linkedin: null,
  website: null,
});

const EMPTY_ENTRY = (userId: string, type: CVEntryType): CVEntry => ({
  id: crypto.randomUUID(),
  user_id: userId,
  entry_type: type,
  title: "",
  organization: null,
  location: null,
  start_date: null,
  end_date: null,
  is_current: false,
  description: null,
  extra: {},
  sort_order: 0,
});

type Tab = "profile" | "timeline" | "preview";

export function ContinuousCVClient({
  userId,
  initialEmail,
}: {
  userId: string;
  initialEmail?: string;
}) {
  const supabase = createClient();
  const previewRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<CVProfile>(() => ({
    ...EMPTY_PROFILE(userId),
    email: initialEmail ?? null,
  }));
  const [entries, setEntries] = useState<CVEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<CVEntry | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, e] = await Promise.all([
      loadCVProfile(supabase, userId),
      loadCVEntries(supabase, userId),
    ]);
    if (p) setProfile({ ...EMPTY_PROFILE(userId), ...p, email: p.email ?? initialEmail ?? null });
    setEntries(e);
    setLoading(false);
  }, [supabase, userId, initialEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await saveCVProfile(supabase, profile);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const openNewEntry = (type: CVEntryType) => {
    setDraft(EMPTY_ENTRY(userId, type));
    setShowForm(true);
  };

  const openEditEntry = (entry: CVEntry) => {
    setDraft({ ...entry, extra: { ...entry.extra } });
    setShowForm(true);
  };

  const saveEntry = async () => {
    if (!draft?.title.trim()) return;
    setSaving(true);
    try {
      await saveCVEntry(supabase, draft);
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === draft.id);
        if (idx >= 0) return prev.map((e) => (e.id === draft.id ? draft : e));
        return [...prev, draft];
      });
      setShowForm(false);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (id: string) => {
    await deleteCVEntry(supabase, userId, id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleExportPDF = async () => {
    const el = previewRef.current?.querySelector("#cv-preview-export") as HTMLElement | null;
    if (!el) return;
    setExporting(true);
    try {
      const name = (profile.full_name ?? "cv").replace(/\s+/g, "-").toLowerCase();
      await exportCVToPDF(el, `${name}-regal-cv.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const updateProfile = (field: keyof CVProfile, value: string) => {
    setProfile((p) => ({ ...p, [field]: value || null }));
  };

  const updateDraft = (field: keyof CVEntry, value: string | boolean) => {
    if (!draft) return;
    setDraft({ ...draft, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-regal-purple-400" />
      </div>
    );
  }

  return (
    <div className="page-enter max-w-6xl mx-auto">
      <PageHeader
        title="Continuous CV"
        description="Build your living academic CV step by step — add internships, achievements, skills, and more. Export a polished PDF anytime."
        action={
          <Button onClick={handleExportPDF} disabled={exporting}>
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mb-6 w-fit">
        {(
          [
            ["profile", "Profile & Education"],
            ["timeline", "Timeline"],
            ["preview", "Preview & Export"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === id
                ? "bg-regal-purple-500/30 text-white shadow-sm"
                : "text-white/50 hover:text-white/80"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Personal Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Full name</Label>
                <Input
                  value={profile.full_name ?? ""}
                  onChange={(e) => updateProfile("full_name", e.target.value)}
                  placeholder="Ama Mensah"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={profile.email ?? ""}
                  onChange={(e) => updateProfile("email", e.target.value)}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={profile.phone ?? ""}
                  onChange={(e) => updateProfile("phone", e.target.value)}
                  placeholder="+233 ..."
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={profile.location ?? ""}
                  onChange={(e) => updateProfile("location", e.target.value)}
                  placeholder="Accra, Ghana"
                />
              </div>
              <div>
                <Label>LinkedIn / Portfolio</Label>
                <Input
                  value={profile.linkedin ?? ""}
                  onChange={(e) => updateProfile("linkedin", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Headline</Label>
                <Input
                  value={profile.headline ?? ""}
                  onChange={(e) => updateProfile("headline", e.target.value)}
                  placeholder="Computer Science student · Aspiring software engineer"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Profile summary</Label>
                <Textarea
                  rows={4}
                  value={profile.bio ?? ""}
                  onChange={(e) => updateProfile("bio", e.target.value)}
                  placeholder="A brief overview of who you are academically and professionally..."
                />
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Academic Background</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Major / Field of study</Label>
                <Input
                  value={profile.major ?? ""}
                  onChange={(e) => updateProfile("major", e.target.value)}
                  placeholder="Computer Science"
                />
              </div>
              <div>
                <Label>Course enrolled</Label>
                <Input
                  value={profile.course_enrolled ?? ""}
                  onChange={(e) => updateProfile("course_enrolled", e.target.value)}
                  placeholder="BSc Computer Science"
                />
              </div>
              <div>
                <Label>University / College</Label>
                <Input
                  value={profile.university ?? ""}
                  onChange={(e) => updateProfile("university", e.target.value)}
                />
              </div>
              <div>
                <Label>University years</Label>
                <Input
                  value={profile.university_years ?? ""}
                  onChange={(e) => updateProfile("university_years", e.target.value)}
                  placeholder="2022 – Present"
                />
              </div>
              <div>
                <Label>High school</Label>
                <Input
                  value={profile.high_school ?? ""}
                  onChange={(e) => updateProfile("high_school", e.target.value)}
                />
              </div>
              <div>
                <Label>High school years</Label>
                <Input
                  value={profile.high_school_years ?? ""}
                  onChange={(e) => updateProfile("high_school_years", e.target.value)}
                  placeholder="2016 – 2019"
                />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savedFlash ? "Saved!" : "Save profile"}
            </Button>
          </Card>
        </div>
      )}

      {tab === "timeline" && (
        <CVTimeline
          entries={entries}
          onAdd={openNewEntry}
          onEdit={openEditEntry}
          onRemove={(id) => void removeEntry(id)}
        />
      )}

      {tab === "preview" && (
        <div ref={previewRef} className="max-w-2xl mx-auto">
          <CVPreview profile={profile} entries={entries} />
          <div className="flex justify-center mt-6">
            <Button onClick={handleExportPDF} disabled={exporting} size="lg">
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download beautiful PDF
            </Button>
          </div>
        </div>
      )}

      {/* Entry form modal */}
      {showForm && draft && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
            <h2 className="text-lg font-semibold text-white">
              {CV_ENTRY_LABELS[draft.entry_type]}
            </h2>
            <div className="space-y-3">
              <div>
                <Label>Title *</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => updateDraft("title", e.target.value)}
                  placeholder={
                    draft.entry_type === "skill"
                      ? "Python, Public Speaking..."
                      : draft.entry_type === "hobby"
                        ? "Photography, Debate Club..."
                        : "Role or achievement title"
                  }
                />
              </div>
              {!["skill", "hobby"].includes(draft.entry_type) && (
                <div>
                  <Label>Organization / Institution</Label>
                  <Input
                    value={draft.organization ?? ""}
                    onChange={(e) => updateDraft("organization", e.target.value)}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start</Label>
                  <Input
                    value={draft.start_date ?? ""}
                    onChange={(e) => updateDraft("start_date", e.target.value)}
                    placeholder="Jan 2024"
                  />
                </div>
                <div>
                  <Label>End</Label>
                  <Input
                    value={draft.end_date ?? ""}
                    onChange={(e) => updateDraft("end_date", e.target.value)}
                    placeholder="Dec 2024"
                    disabled={draft.is_current}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={draft.is_current}
                  onChange={(e) => updateDraft("is_current", e.target.checked)}
                  className="rounded"
                />
                Currently active
              </label>
              {draft.entry_type === "attachment" && (
                <div>
                  <Label>Link / URL</Label>
                  <Input
                    value={draft.extra?.url ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, extra: { ...draft.extra, url: e.target.value } })
                    }
                    placeholder="https://..."
                  />
                </div>
              )}
              {draft.entry_type === "skill" && (
                <div>
                  <Label>Proficiency level</Label>
                  <Input
                    value={draft.extra?.level ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, extra: { ...draft.extra, level: e.target.value } })
                    }
                    placeholder="Advanced, Intermediate..."
                  />
                </div>
              )}
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={4}
                  value={draft.description ?? ""}
                  onChange={(e) => updateDraft("description", e.target.value)}
                  placeholder="Describe your impact, responsibilities, or outcomes..."
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveEntry} disabled={saving || !draft.title.trim()} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save entry
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setDraft(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
