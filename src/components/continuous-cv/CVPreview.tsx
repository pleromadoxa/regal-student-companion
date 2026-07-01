"use client";

import type { CVEntry, CVProfile } from "@/types/cv-courses";
import { CV_ENTRY_LABELS } from "@/types/cv-courses";

function formatDateRange(entry: CVEntry) {
  const start = entry.start_date ?? "";
  const end = entry.is_current ? "Present" : (entry.end_date ?? "");
  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}

function groupEntries(entries: CVEntry[]) {
  const groups: Record<string, CVEntry[]> = {};
  for (const e of entries) {
    if (!groups[e.entry_type]) groups[e.entry_type] = [];
    groups[e.entry_type].push(e);
  }
  return groups;
}

export function CVPreview({
  profile,
  entries,
  id = "cv-preview-export",
}: {
  profile: CVProfile;
  entries: CVEntry[];
  id?: string;
}) {
  const grouped = groupEntries(entries);
  const sectionOrder: (keyof typeof CV_ENTRY_LABELS)[] = [
    "education",
    "internship",
    "job",
    "project",
    "school_activity",
    "achievement",
    "certification",
    "skill",
    "hobby",
    "attachment",
  ];

  return (
    <div
      id={id}
      className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      {/* Header band */}
      <div
        className="px-8 py-8 text-white"
        style={{
          background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 45%, #db2777 100%)",
        }}
      >
        <h1 className="text-3xl font-bold tracking-tight">
          {profile.full_name || "Your Name"}
        </h1>
        {profile.headline && (
          <p className="text-lg text-white/90 mt-1 font-sans">{profile.headline}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-sm text-white/85 font-sans">
          {profile.email && <span>{profile.email}</span>}
          {profile.phone && <span>{profile.phone}</span>}
          {profile.location && <span>{profile.location}</span>}
          {profile.linkedin && <span>{profile.linkedin}</span>}
          {profile.website && <span>{profile.website}</span>}
        </div>
      </div>

      <div className="px-8 py-7 space-y-6 font-sans">
        {(profile.major || profile.course_enrolled) && (
          <section>
            <h2
              className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700 mb-2 pb-1 border-b-2 border-violet-200"
            >
              Academic Focus
            </h2>
            <p className="text-sm leading-relaxed">
              {profile.major && <span><strong>Major:</strong> {profile.major}</span>}
              {profile.major && profile.course_enrolled && " · "}
              {profile.course_enrolled && (
                <span><strong>Course:</strong> {profile.course_enrolled}</span>
              )}
            </p>
          </section>
        )}

        {(profile.high_school || profile.university) && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700 mb-2 pb-1 border-b-2 border-violet-200">
              Education Background
            </h2>
            <div className="space-y-2 text-sm">
              {profile.university && (
                <p>
                  <strong>{profile.university}</strong>
                  {profile.university_years && (
                    <span className="text-slate-500"> · {profile.university_years}</span>
                  )}
                </p>
              )}
              {profile.high_school && (
                <p>
                  <strong>{profile.high_school}</strong>
                  {profile.high_school_years && (
                    <span className="text-slate-500"> · {profile.high_school_years}</span>
                  )}
                </p>
              )}
            </div>
          </section>
        )}

        {profile.bio && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700 mb-2 pb-1 border-b-2 border-violet-200">
              Profile Summary
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">{profile.bio}</p>
          </section>
        )}

        {sectionOrder.map((type) => {
          const items = grouped[type];
          if (!items?.length) return null;
          return (
            <section key={type}>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700 mb-3 pb-1 border-b-2 border-violet-200">
                {CV_ENTRY_LABELS[type]}
              </h2>
              <div className="space-y-4">
                {items.map((entry) => (
                  <div key={entry.id}>
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-semibold text-slate-900">{entry.title}</p>
                      <p className="text-xs text-slate-500 shrink-0">{formatDateRange(entry)}</p>
                    </div>
                    {(entry.organization || entry.location) && (
                      <p className="text-sm text-violet-700 italic">
                        {[entry.organization, entry.location].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {entry.description && (
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                        {entry.description}
                      </p>
                    )}
                    {entry.extra?.url && (
                      <p className="text-xs text-slate-500 mt-1">{entry.extra.url}</p>
                    )}
                    {entry.extra?.level && (
                      <p className="text-xs text-slate-500 mt-0.5">Level: {entry.extra.level}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="px-8 py-3 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 text-center font-sans">
        Generated with Regal Student Companion · Continuous CV
      </div>
    </div>
  );
}
