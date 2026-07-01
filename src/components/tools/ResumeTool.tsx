"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  History,
  Download,
  Plus,
  Trash2,
  Save,
  FileText,
  Mail,
  Lightbulb,
  Briefcase,
} from "lucide-react";
import { askRegalAI } from "@/lib/regal-ai";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { ToolShell, ToolSection, ToolResult } from "@/components/tools/shared";
import { cn } from "@/lib/utils";

type EducationEntry = {
  id: string;
  school: string;
  degree: string;
  year: string;
  details: string;
};

type ExperienceEntry = {
  id: string;
  title: string;
  organization: string;
  dates: string;
  bullets: string;
};

type ActivityEntry = {
  id: string;
  name: string;
  role: string;
  details: string;
};

type ResumeFormData = {
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  targetRole: string;
  targetCompany: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: string;
  activities: ActivityEntry[];
};

type SavedVersion = {
  id: string;
  name: string;
  form: ResumeFormData;
  resume: string;
  coverLetter: string;
  at: string;
};

const FORM_KEY = "regal-resume-draft";
const VERSIONS_KEY = "regal-resume-versions";

const STUDENT_HINTS = [
  "Lead with action verbs: led, built, analyzed, coordinated.",
  "Quantify impact when possible — hours, members, GPA, funds raised.",
  "Keep high school resumes to one page; prioritize recent roles.",
  "Tailor your summary to the role or program you're applying for.",
  "Group skills by category (Technical, Languages, Leadership).",
  "Include coursework or projects if you lack work experience.",
];

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyForm = (): ResumeFormData => ({
  fullName: "",
  email: "",
  phone: "",
  summary: "",
  targetRole: "",
  targetCompany: "",
  education: [{ id: makeId(), school: "", degree: "", year: "", details: "" }],
  experience: [
    { id: makeId(), title: "", organization: "", dates: "", bullets: "" },
  ],
  activities: [{ id: makeId(), name: "", role: "", details: "" }],
  skills: "",
});

function loadDraft(): ResumeFormData {
  if (typeof window === "undefined") return emptyForm();
  try {
    const raw = localStorage.getItem(FORM_KEY);
    if (!raw) return emptyForm();
    return { ...emptyForm(), ...JSON.parse(raw) } as ResumeFormData;
  } catch {
    return emptyForm();
  }
}

function saveDraft(form: ResumeFormData) {
  try {
    localStorage.setItem(FORM_KEY, JSON.stringify(form));
  } catch {
    /* quota */
  }
}

function loadVersions(): SavedVersion[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(VERSIONS_KEY) ?? "[]") as SavedVersion[];
  } catch {
    return [];
  }
}

function saveVersions(versions: SavedVersion[]) {
  try {
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions.slice(0, 20)));
  } catch {
    /* quota */
  }
}

function formToPrompt(form: ResumeFormData): string {
  const lines: string[] = [];

  if (form.fullName) lines.push(`Name: ${form.fullName}`);
  if (form.email || form.phone) {
    lines.push(`Contact: ${[form.email, form.phone].filter(Boolean).join(" · ")}`);
  }
  if (form.summary) lines.push(`\nSummary:\n${form.summary}`);

  if (form.education.some((e) => e.school || e.degree)) {
    lines.push("\nEducation:");
    form.education.forEach((e) => {
      if (!e.school && !e.degree) return;
      lines.push(
        `- ${e.degree || "Program"} at ${e.school || "School"}${e.year ? ` (${e.year})` : ""}${e.details ? `: ${e.details}` : ""}`
      );
    });
  }

  if (form.experience.some((e) => e.title || e.organization)) {
    lines.push("\nExperience:");
    form.experience.forEach((e) => {
      if (!e.title && !e.organization) return;
      lines.push(
        `- ${e.title || "Role"} at ${e.organization || "Organization"}${e.dates ? ` (${e.dates})` : ""}`
      );
      if (e.bullets.trim()) {
        e.bullets
          .split("\n")
          .filter(Boolean)
          .forEach((b) => lines.push(`  • ${b.replace(/^[-•]\s*/, "")}`));
      }
    });
  }

  if (form.skills.trim()) lines.push(`\nSkills:\n${form.skills}`);

  if (form.activities.some((a) => a.name || a.role)) {
    lines.push("\nActivities & Leadership:");
    form.activities.forEach((a) => {
      if (!a.name && !a.role) return;
      lines.push(
        `- ${a.name || "Activity"}${a.role ? ` — ${a.role}` : ""}${a.details ? `: ${a.details}` : ""}`
      );
    });
  }

  if (form.targetRole || form.targetCompany) {
    lines.push(
      `\nTarget application: ${form.targetRole || "Role"}${form.targetCompany ? ` at ${form.targetCompany}` : ""}`
    );
  }

  return lines.join("\n");
}

function ListSection<T extends { id: string }>({
  title,
  items,
  onAdd,
  renderItem,
}: {
  title: string;
  items: T[];
  onAdd: () => void;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="mb-0">{title}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>
      {items.map((item, i) => (
        <div
          key={item.id}
          className="p-3 rounded-xl border border-white/8 bg-white/[0.02] space-y-2"
        >
          {renderItem(item, i)}
        </div>
      ))}
    </div>
  );
}

export function ResumeTool() {
  const [form, setForm] = useState<ResumeFormData>(emptyForm);
  const [resume, setResume] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [previewTab, setPreviewTab] = useState<"resume" | "cover">("resume");
  const [loading, setLoading] = useState<"resume" | "cover" | null>(null);
  const [copied, setCopied] = useState(false);
  const [versions, setVersions] = useState<SavedVersion[]>([]);
  const [versionName, setVersionName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setForm(loadDraft());
    setVersions(loadVersions());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDraft(form);
  }, [form, hydrated]);

  const updateForm = useCallback(
    (patch: Partial<ResumeFormData>) => setForm((f) => ({ ...f, ...patch })),
    []
  );

  const generate = async (mode: "resume" | "cover_letter") => {
    const text = formToPrompt(form).trim();
    if (!text) return;
    setLoading(mode === "cover_letter" ? "cover" : "resume");
    try {
      const { text: res } = await askRegalAI({ action: "resume", text, mode });
      if (mode === "cover_letter") {
        setCoverLetter(res);
        setPreviewTab("cover");
      } else {
        setResume(res);
        setPreviewTab("resume");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Regal AI error";
      if (mode === "cover_letter") setCoverLetter(msg);
      else setResume(msg);
    } finally {
      setLoading(null);
    }
  };

  const activePreview = previewTab === "resume" ? resume : coverLetter;

  const copyPreview = async () => {
    if (!activePreview) return;
    await navigator.clipboard.writeText(activePreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPreview = () => {
    if (!activePreview) return;
    const base = form.fullName.trim().replace(/\s+/g, "-").toLowerCase() || "resume";
    const suffix = previewTab === "resume" ? "resume" : "cover-letter";
    const blob = new Blob([activePreview], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}-${suffix}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveVersion = () => {
    const name =
      versionName.trim() ||
      `${form.fullName || "Resume"} · ${new Date().toLocaleDateString()}`;
    const entry: SavedVersion = {
      id: makeId(),
      name,
      form,
      resume,
      coverLetter,
      at: new Date().toISOString(),
    };
    setVersions((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      saveVersions(next);
      return next;
    });
    setVersionName("");
  };

  const loadVersion = (v: SavedVersion) => {
    setForm(v.form);
    setResume(v.resume);
    setCoverLetter(v.coverLetter);
  };

  const deleteVersion = (id: string) => {
    setVersions((prev) => {
      const next = prev.filter((v) => v.id !== id);
      saveVersions(next);
      return next;
    });
  };

  const previewActions = activePreview ? (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" onClick={copyPreview}>
        {copied ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
      <Button variant="ghost" size="sm" onClick={downloadPreview}>
        <Download className="w-4 h-4" />
      </Button>
    </div>
  ) : undefined;

  return (
    <ToolShell
      sidebar={
        <>
          <Card className="border-regal-purple-400/15">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-300" />
              <h3 className="text-sm font-bold text-white">Student tips</h3>
            </div>
            <ul className="space-y-2">
              {STUDENT_HINTS.map((hint) => (
                <li
                  key={hint}
                  className="text-xs text-muted leading-relaxed pl-3 border-l-2 border-regal-purple-400/30"
                >
                  {hint}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-regal-purple-400/15 max-h-[420px] flex flex-col">
            <div className="flex items-center gap-2 shrink-0 mb-3">
              <History className="w-4 h-4 text-regal-pink" />
              <h3 className="text-sm font-bold text-white">Saved versions</h3>
            </div>
            <div className="flex gap-2 mb-3 shrink-0">
              <Input
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="Version name (optional)"
                className="text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={saveVersion}
                disabled={!form.fullName && !resume && !coverLetter}
              >
                <Save className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pr-1">
              {versions.length === 0 ? (
                <p className="text-xs text-muted py-4">
                  Save drafts with generated resume and cover letter to revisit later.
                </p>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-1 p-3 rounded-xl border bg-white/[0.03] border-white/8 hover:border-regal-purple-400/25 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => loadVersion(v)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-xs font-medium text-white truncate">{v.name}</p>
                      <p className="text-[10px] text-muted mt-0.5">
                        {new Date(v.at).toLocaleString()}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteVersion(v.id)}
                      className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                      aria-label="Delete version"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      }
    >
      <Card className="border-regal-purple-400/20">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <RegalAIBadge />
          <span className="text-xs text-muted">
            Structured resume builder with Regal AI polish
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div>
            <Label>Full name</Label>
            <Input
              value={form.fullName}
              onChange={(e) => updateForm({ fullName: e.target.value })}
              placeholder="Alex Johnson"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => updateForm({ email: e.target.value })}
              placeholder="alex@school.edu"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => updateForm({ phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <div className="mb-5">
          <Label>Professional summary</Label>
          <Textarea
            value={form.summary}
            onChange={(e) => updateForm({ summary: e.target.value })}
            placeholder="Motivated student with leadership in STEM clubs and strong communication skills…"
            className="min-h-[80px] mt-1"
          />
        </div>

        <ToolSection title="Education" className="mb-5">
          <ListSection
            title=""
            items={form.education}
            onAdd={() =>
              updateForm({
                education: [
                  ...form.education,
                  { id: makeId(), school: "", degree: "", year: "", details: "" },
                ],
              })
            }
            renderItem={(entry, index) => (
              <>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="School / University"
                    value={entry.school}
                    onChange={(e) => {
                      const education = [...form.education];
                      education[index] = { ...entry, school: e.target.value };
                      updateForm({ education });
                    }}
                  />
                  <Input
                    placeholder="Degree / Program"
                    value={entry.degree}
                    onChange={(e) => {
                      const education = [...form.education];
                      education[index] = { ...entry, degree: e.target.value };
                      updateForm({ education });
                    }}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Graduation year"
                    value={entry.year}
                    onChange={(e) => {
                      const education = [...form.education];
                      education[index] = { ...entry, year: e.target.value };
                      updateForm({ education });
                    }}
                  />
                  <Input
                    placeholder="GPA, honors, relevant coursework"
                    value={entry.details}
                    onChange={(e) => {
                      const education = [...form.education];
                      education[index] = { ...entry, details: e.target.value };
                      updateForm({ education });
                    }}
                  />
                </div>
                {form.education.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-400"
                    onClick={() =>
                      updateForm({ education: form.education.filter((e) => e.id !== entry.id) })
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </Button>
                )}
              </>
            )}
          />
        </ToolSection>

        <ToolSection title="Experience" className="mb-5">
          <ListSection
            title=""
            items={form.experience}
            onAdd={() =>
              updateForm({
                experience: [
                  ...form.experience,
                  {
                    id: makeId(),
                    title: "",
                    organization: "",
                    dates: "",
                    bullets: "",
                  },
                ],
              })
            }
            renderItem={(entry, index) => (
              <>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Job title / Role"
                    value={entry.title}
                    onChange={(e) => {
                      const experience = [...form.experience];
                      experience[index] = { ...entry, title: e.target.value };
                      updateForm({ experience });
                    }}
                  />
                  <Input
                    placeholder="Company / Organization"
                    value={entry.organization}
                    onChange={(e) => {
                      const experience = [...form.experience];
                      experience[index] = { ...entry, organization: e.target.value };
                      updateForm({ experience });
                    }}
                  />
                </div>
                <Input
                  placeholder="Dates (e.g. Jun 2024 – Aug 2024)"
                  value={entry.dates}
                  onChange={(e) => {
                    const experience = [...form.experience];
                    experience[index] = { ...entry, dates: e.target.value };
                    updateForm({ experience });
                  }}
                />
                <Textarea
                  placeholder="Bullet points (one per line)&#10;Led team of 5 volunteers&#10;Increased sign-ups by 30%"
                  value={entry.bullets}
                  onChange={(e) => {
                    const experience = [...form.experience];
                    experience[index] = { ...entry, bullets: e.target.value };
                    updateForm({ experience });
                  }}
                  className="min-h-[72px] text-xs"
                />
                {form.experience.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-400"
                    onClick={() =>
                      updateForm({
                        experience: form.experience.filter((e) => e.id !== entry.id),
                      })
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </Button>
                )}
              </>
            )}
          />
        </ToolSection>

        <div className="mb-5">
          <Label>Skills</Label>
          <Textarea
            value={form.skills}
            onChange={(e) => updateForm({ skills: e.target.value })}
            placeholder="Python, Excel, public speaking, Spanish (conversational)…"
            className="min-h-[72px] mt-1"
          />
        </div>

        <ToolSection title="Activities & leadership" className="mb-5">
          <ListSection
            title=""
            items={form.activities}
            onAdd={() =>
              updateForm({
                activities: [
                  ...form.activities,
                  { id: makeId(), name: "", role: "", details: "" },
                ],
              })
            }
            renderItem={(entry, index) => (
              <>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Club / Activity"
                    value={entry.name}
                    onChange={(e) => {
                      const activities = [...form.activities];
                      activities[index] = { ...entry, name: e.target.value };
                      updateForm({ activities });
                    }}
                  />
                  <Input
                    placeholder="Your role"
                    value={entry.role}
                    onChange={(e) => {
                      const activities = [...form.activities];
                      activities[index] = { ...entry, role: e.target.value };
                      updateForm({ activities });
                    }}
                  />
                </div>
                <Input
                  placeholder="Brief impact or responsibilities"
                  value={entry.details}
                  onChange={(e) => {
                    const activities = [...form.activities];
                    activities[index] = { ...entry, details: e.target.value };
                    updateForm({ activities });
                  }}
                />
                {form.activities.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-400"
                    onClick={() =>
                      updateForm({
                        activities: form.activities.filter((a) => a.id !== entry.id),
                      })
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </Button>
                )}
              </>
            )}
          />
        </ToolSection>

        <div className="grid sm:grid-cols-2 gap-4 mb-5 pt-4 border-t border-white/10">
          <div>
            <Label>Target role (for cover letter)</Label>
            <Input
              value={form.targetRole}
              onChange={(e) => updateForm({ targetRole: e.target.value })}
              placeholder="Marketing Intern"
            />
          </div>
          <div>
            <Label>Target company / program</Label>
            <Input
              value={form.targetCompany}
              onChange={(e) => updateForm({ targetCompany: e.target.value })}
              placeholder="Acme Corp"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => generate("resume")}
            disabled={loading !== null || !formToPrompt(form).trim()}
          >
            {loading === "resume" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate resume
          </Button>
          <Button
            variant="secondary"
            onClick={() => generate("cover_letter")}
            disabled={loading !== null || !formToPrompt(form).trim()}
          >
            {loading === "cover" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Generate cover letter
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setForm(emptyForm());
              setResume("");
              setCoverLetter("");
            }}
            disabled={loading !== null}
          >
            Reset form
          </Button>
        </div>
      </Card>

      {(resume || coverLetter) && (
        <ToolSection
          title="Preview"
          description="Review, copy, or download your generated documents."
        >
          <div className="flex gap-1 mb-3 p-1 rounded-xl bg-white/[0.04] border border-white/8 w-fit">
            <button
              type="button"
              onClick={() => setPreviewTab("resume")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                previewTab === "resume"
                  ? "bg-regal-purple-500/25 text-white"
                  : "text-muted hover:text-white"
              )}
            >
              <FileText className="w-3.5 h-3.5" /> Resume
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("cover")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                previewTab === "cover"
                  ? "bg-regal-purple-500/25 text-white"
                  : "text-muted hover:text-white"
              )}
            >
              <Briefcase className="w-3.5 h-3.5" /> Cover letter
            </button>
          </div>

          <ToolResult
            title={
              previewTab === "resume"
                ? "Formatted resume"
                : "Cover letter"
            }
            actions={previewActions}
          >
            {activePreview || (
              <span className="text-muted">
                Generate a {previewTab === "resume" ? "resume" : "cover letter"} to preview it here.
              </span>
            )}
          </ToolResult>
        </ToolSection>
      )}
    </ToolShell>
  );
}
