"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Download,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { askRegalAI } from "@/lib/regal-ai";
import {
  deleteCourse,
  deleteSubject,
  loadCourses,
  loadMaterial,
  loadSubjects,
  saveCourse,
  saveMaterial,
  saveSubject,
} from "@/lib/cv-courses-storage";
import { downloadTextFile, sanitizeAIContent } from "@/lib/format-ai-content";
import type { CourseSubject, SubjectMaterial, UserCourse } from "@/types/cv-courses";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { EmptyState } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

async function generateCourseMaterial(opts: {
  courseName: string;
  courseInstitution?: string | null;
  courseLevel?: string | null;
  courseSemester?: string | null;
  courseDescription?: string | null;
  subjectName: string;
  subjectCode?: string | null;
  subjectDescription?: string | null;
}): Promise<string> {
  const context = [
    `Course: ${opts.courseName}`,
    opts.courseInstitution && `Institution: ${opts.courseInstitution}`,
    opts.courseLevel && `Level: ${opts.courseLevel}`,
    opts.courseSemester && `Semester: ${opts.courseSemester}`,
    opts.courseDescription && `Course overview: ${opts.courseDescription}`,
    `Subject: ${opts.subjectName}`,
    opts.subjectCode && `Subject code: ${opts.subjectCode}`,
    opts.subjectDescription && `Subject focus: ${opts.subjectDescription}`,
  ]
    .filter(Boolean)
    .join("\n");

  const { text: raw } = await askRegalAI({
    action: "course_material",
    text: context,
    subject: opts.subjectName,
    topic: opts.courseName,
  });

  return sanitizeAIContent(raw);
}

export function MyCoursesClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [courses, setCourses] = useState<UserCourse[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [material, setMaterial] = useState<SubjectMaterial | null>(null);
  const [generating, setGenerating] = useState(false);

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [courseDraft, setCourseDraft] = useState<Partial<UserCourse>>({});
  const [subjectDraft, setSubjectDraft] = useState<Partial<CourseSubject>>({});

  const activeCourse = courses.find((c) => c.id === activeCourseId) ?? null;
  const activeSubject = subjects.find((s) => s.id === activeSubjectId) ?? null;
  const courseSubjects = subjects.filter((s) => s.course_id === activeCourseId);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [c, s] = await Promise.all([
      loadCourses(supabase, userId),
      loadSubjects(supabase, userId),
    ]);
    setCourses(c);
    setSubjects(s);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadSubjectMaterial = useCallback(
    async (subjectId: string) => {
      const m = await loadMaterial(supabase, userId, subjectId);
      setMaterial(m);
    },
    [supabase, userId]
  );

  useEffect(() => {
    if (activeSubjectId) void loadSubjectMaterial(activeSubjectId);
    else setMaterial(null);
  }, [activeSubjectId, loadSubjectMaterial]);

  const runGeneration = async (
    course: UserCourse,
    subject: CourseSubject,
    existingMaterialId?: string
  ) => {
    setGenerating(true);
    const updating: CourseSubject = { ...subject, material_status: "generating" };
    await saveSubject(supabase, updating);
    setSubjects((prev) => prev.map((s) => (s.id === subject.id ? updating : s)));

    try {
      const content = await generateCourseMaterial({
        courseName: course.name,
        courseInstitution: course.institution,
        courseLevel: course.level,
        courseSemester: course.semester,
        courseDescription: course.description,
        subjectName: subject.name,
        subjectCode: subject.code,
        subjectDescription: subject.description,
      });

      const mat: SubjectMaterial = {
        id: existingMaterialId ?? crypto.randomUUID(),
        subject_id: subject.id,
        user_id: userId,
        content,
        status: "ready",
        generated_at: new Date().toISOString(),
      };
      await saveMaterial(supabase, mat);

      const ready: CourseSubject = { ...subject, material_status: "ready" };
      await saveSubject(supabase, ready);
      setSubjects((prev) => prev.map((s) => (s.id === subject.id ? ready : s)));
      if (activeSubjectId === subject.id) setMaterial(mat);
    } catch {
      const failed: CourseSubject = { ...subject, material_status: "failed" };
      await saveSubject(supabase, failed);
      setSubjects((prev) => prev.map((s) => (s.id === subject.id ? failed : s)));
    } finally {
      setGenerating(false);
    }
  };

  const addCourse = async () => {
    if (!courseDraft.name?.trim()) return;
    const course: UserCourse = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: courseDraft.name.trim(),
      institution: courseDraft.institution?.trim() || null,
      level: courseDraft.level?.trim() || null,
      semester: courseDraft.semester?.trim() || null,
      description: courseDraft.description?.trim() || null,
    };
    await saveCourse(supabase, course);
    setCourses((prev) => [course, ...prev]);
    setShowCourseForm(false);
    setCourseDraft({});
    setActiveCourseId(course.id);
  };

  const addSubject = async () => {
    if (!activeCourse || !subjectDraft.name?.trim()) return;
    const subject: CourseSubject = {
      id: crypto.randomUUID(),
      course_id: activeCourse.id,
      user_id: userId,
      name: subjectDraft.name.trim(),
      code: subjectDraft.code?.trim() || null,
      description: subjectDraft.description?.trim() || null,
      material_status: "pending",
    };
    await saveSubject(supabase, subject);
    setSubjects((prev) => [...prev, subject]);
    setShowSubjectForm(false);
    setSubjectDraft({});
    setActiveSubjectId(subject.id);
    void runGeneration(activeCourse, subject);
  };

  const removeCourse = async (id: string) => {
    await deleteCourse(supabase, userId, id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setSubjects((prev) => prev.filter((s) => s.course_id !== id));
    if (activeCourseId === id) {
      setActiveCourseId(null);
      setActiveSubjectId(null);
    }
  };

  const removeSubject = async (id: string) => {
    await deleteSubject(supabase, userId, id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    if (activeSubjectId === id) setActiveSubjectId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-regal-purple-400" />
      </div>
    );
  }

  /* Subject detail view */
  if (activeSubject && activeCourse) {
    const isGenerating =
      generating || activeSubject.material_status === "generating";

    return (
      <div className="page-enter max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => setActiveSubjectId(null)}
          className="flex items-center gap-2 text-sm text-muted hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {activeCourse.name}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{activeSubject.name}</h1>
              <RegalAIBadge />
            </div>
            <p className="text-muted text-sm mt-1">
              {activeCourse.name}
              {activeSubject.code && ` · ${activeSubject.code}`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              disabled={isGenerating}
              onClick={() =>
                void runGeneration(activeCourse, activeSubject, material?.id)
              }
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate
            </Button>
            {material?.content && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  downloadTextFile(
                    material.content,
                    `${activeSubject.name.replace(/\s+/g, "-").toLowerCase()}-course-material.md`
                  )
                }
              >
                <Download className="w-4 h-4" /> Download
              </Button>
            )}
          </div>
        </div>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-regal-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-regal-purple-400 mb-4" />
              <p className="text-white font-medium">Regal AI is building your course material</p>
              <p className="text-sm text-muted mt-1 max-w-sm">
                Generating lessons, topics, and study guides tailored to {activeSubject.name}...
              </p>
            </div>
          ) : material?.content ? (
            <div className="relative p-6 sm:p-8">
              <MarkdownContent content={material.content} />
            </div>
          ) : activeSubject.material_status === "failed" ? (
            <div className="py-16 text-center">
              <p className="text-white font-medium">Generation failed</p>
              <p className="text-sm text-muted mt-1">Check your connection and try again.</p>
              <Button
                className="mt-4"
                onClick={() =>
                  void runGeneration(activeCourse, activeSubject, material?.id)
                }
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </Button>
            </div>
          ) : (
            <div className="py-16 text-center">
              <Sparkles className="w-8 h-8 text-regal-purple-400 mx-auto mb-3" />
              <p className="text-white font-medium">Material pending</p>
              <Button
                className="mt-4"
                onClick={() => void runGeneration(activeCourse, activeSubject)}
              >
                Generate now
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  /* Course detail — subjects list */
  if (activeCourse) {
    return (
      <div className="page-enter max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => setActiveCourseId(null)}
          className="flex items-center gap-2 text-sm text-muted hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All courses
        </button>

        <PageHeader
          title={activeCourse.name}
          description={
            [
              activeCourse.institution,
              activeCourse.level,
              activeCourse.semester,
            ]
              .filter(Boolean)
              .join(" · ") || "Manage subjects and AI-generated course materials"
          }
          regalAI
          action={
            <Button onClick={() => setShowSubjectForm(true)}>
              <Plus className="w-4 h-4" /> Add subject
            </Button>
          }
        />

        {activeCourse.description && (
          <p className="text-sm text-muted mb-6 -mt-4">{activeCourse.description}</p>
        )}

        {courseSubjects.length === 0 ? (
          <Card>
            <EmptyState
              icon={BookOpen}
              title="No subjects yet"
              description="Add a subject and Regal AI will automatically generate structured lessons, topics, and study materials."
              action={
                <Button onClick={() => setShowSubjectForm(true)}>
                  <Plus className="w-4 h-4" /> Add first subject
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {courseSubjects.map((subject) => (
              <Card
                key={subject.id}
                hover
                className="cursor-pointer group relative"
                onClick={() => setActiveSubjectId(subject.id)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void removeSubject(subject.id);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-white/30 hover:text-red-300 hover:bg-red-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl regal-ai-gradient shrink-0">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white group-hover:text-regal-purple-200 transition-colors">
                      {subject.name}
                    </p>
                    {subject.code && (
                      <p className="text-xs text-muted mt-0.5">{subject.code}</p>
                    )}
                    <StatusBadge status={subject.material_status} className="mt-2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {showSubjectForm && (
          <FormModal title="Add subject" onClose={() => setShowSubjectForm(false)}>
            <div className="space-y-3">
              <div>
                <Label>Subject name *</Label>
                <Input
                  value={subjectDraft.name ?? ""}
                  onChange={(e) => setSubjectDraft({ ...subjectDraft, name: e.target.value })}
                  placeholder="Data Structures"
                  autoFocus
                />
              </div>
              <div>
                <Label>Subject code</Label>
                <Input
                  value={subjectDraft.code ?? ""}
                  onChange={(e) => setSubjectDraft({ ...subjectDraft, code: e.target.value })}
                  placeholder="CS 201"
                />
              </div>
              <div>
                <Label>Focus / topics (optional)</Label>
                <Textarea
                  rows={3}
                  value={subjectDraft.description ?? ""}
                  onChange={(e) =>
                    setSubjectDraft({ ...subjectDraft, description: e.target.value })
                  }
                  placeholder="Arrays, linked lists, trees, sorting algorithms..."
                />
              </div>
              <p className="text-xs text-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-regal-purple-400" />
                Course material will generate automatically when you save.
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={addSubject} disabled={!subjectDraft.name?.trim()} className="flex-1">
                <Plus className="w-4 h-4" /> Add & generate
              </Button>
              <Button variant="secondary" onClick={() => setShowSubjectForm(false)}>
                Cancel
              </Button>
            </div>
          </FormModal>
        )}
      </div>
    );
  }

  /* Courses list */
  return (
    <div className="page-enter max-w-4xl mx-auto">
      <PageHeader
        title="My Courses"
        description="Add your courses and subjects — Regal AI automatically generates structured lessons, topics, and study materials tailored to what you're studying."
        regalAI
        action={
          <Button onClick={() => setShowCourseForm(true)}>
            <Plus className="w-4 h-4" /> Add course
          </Button>
        }
      />

      {courses.length === 0 ? (
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="No courses yet"
            description="Start by adding a course you're enrolled in. Then add subjects — AI course materials generate automatically."
            action={
              <Button onClick={() => setShowCourseForm(true)}>
                <Plus className="w-4 h-4" /> Add your first course
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {courses.map((course) => {
            const count = subjects.filter((s) => s.course_id === course.id).length;
            return (
              <Card
                key={course.id}
                hover
                className="cursor-pointer group relative"
                onClick={() => setActiveCourseId(course.id)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void removeCourse(course.id);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-white/30 hover:text-red-300 hover:bg-red-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 shrink-0">
                    <GraduationCap className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-white group-hover:text-emerald-200 transition-colors">
                      {course.name}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {[course.institution, course.semester].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-xs text-regal-purple-300 mt-2">
                      {count} subject{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showCourseForm && (
        <FormModal title="Add course" onClose={() => setShowCourseForm(false)}>
          <div className="space-y-3">
            <div>
              <Label>Course name *</Label>
              <Input
                value={courseDraft.name ?? ""}
                onChange={(e) => setCourseDraft({ ...courseDraft, name: e.target.value })}
                placeholder="BSc Computer Science"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Institution</Label>
                <Input
                  value={courseDraft.institution ?? ""}
                  onChange={(e) =>
                    setCourseDraft({ ...courseDraft, institution: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Level</Label>
                <Input
                  value={courseDraft.level ?? ""}
                  onChange={(e) => setCourseDraft({ ...courseDraft, level: e.target.value })}
                  placeholder="Undergraduate"
                />
              </div>
            </div>
            <div>
              <Label>Semester / Year</Label>
              <Input
                value={courseDraft.semester ?? ""}
                onChange={(e) => setCourseDraft({ ...courseDraft, semester: e.target.value })}
                placeholder="Year 2 · Semester 1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                rows={2}
                value={courseDraft.description ?? ""}
                onChange={(e) =>
                  setCourseDraft({ ...courseDraft, description: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={addCourse} disabled={!courseDraft.name?.trim()} className="flex-1">
              <Plus className="w-4 h-4" /> Add course
            </Button>
            <Button variant="secondary" onClick={() => setShowCourseForm(false)}>
              Cancel
            </Button>
          </div>
        </FormModal>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  className,
}: {
  status: CourseSubject["material_status"];
  className?: string;
}) {
  const styles = {
    pending: "bg-white/10 text-white/50",
    generating: "bg-regal-purple-500/20 text-regal-purple-200",
    ready: "bg-emerald-500/20 text-emerald-300",
    failed: "bg-red-500/20 text-red-300",
  };
  const labels = {
    pending: "Pending",
    generating: "Generating...",
    ready: "Ready",
    failed: "Failed",
  };
  return (
    <span
      className={cn(
        "inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
        styles[status],
        className
      )}
    >
      {labels[status]}
    </span>
  );
}

function FormModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
        {children}
      </Card>
    </div>
  );
}
