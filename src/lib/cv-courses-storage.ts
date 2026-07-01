import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CVEntry,
  CVProfile,
  CourseSubject,
  SubjectMaterial,
  UserCourse,
} from "@/types/cv-courses";

const CV_PROFILE_KEY = "regal-cv-profile";
const CV_ENTRIES_KEY = "regal-cv-entries";
const COURSES_KEY = "regal-user-courses";
const SUBJECTS_KEY = "regal-course-subjects";
const MATERIALS_KEY = "regal-subject-materials";

function lsKey(base: string, userId: string) {
  return `${base}-${userId}`;
}

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

function isMissingTable(err: { message?: string; code?: string } | null) {
  if (!err) return false;
  const msg = (err.message ?? "").toLowerCase();
  return (
    err.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find")
  );
}

export async function loadCVProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<CVProfile | null> {
  const { data, error } = await supabase
    .from("companion_cv_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error && data) return data as CVProfile;
  if (isMissingTable(error)) {
    return readLS<CVProfile | null>(lsKey(CV_PROFILE_KEY, userId), null);
  }
  return readLS<CVProfile | null>(lsKey(CV_PROFILE_KEY, userId), null);
}

export async function saveCVProfile(
  supabase: SupabaseClient,
  profile: CVProfile
): Promise<void> {
  writeLS(lsKey(CV_PROFILE_KEY, profile.user_id), profile);
  const { error } = await supabase.from("companion_cv_profiles").upsert({
    ...profile,
    updated_at: new Date().toISOString(),
  });
  if (error && !isMissingTable(error)) throw new Error(error.message);
}

export async function loadCVEntries(
  supabase: SupabaseClient,
  userId: string
): Promise<CVEntry[]> {
  const { data, error } = await supabase
    .from("companion_cv_entries")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!error && data) return data as CVEntry[];
  return readLS<CVEntry[]>(lsKey(CV_ENTRIES_KEY, userId), []);
}

export async function saveCVEntry(
  supabase: SupabaseClient,
  entry: CVEntry
): Promise<void> {
  const all = readLS<CVEntry[]>(lsKey(CV_ENTRIES_KEY, entry.user_id), []);
  const idx = all.findIndex((e) => e.id === entry.id);
  const next = idx >= 0 ? all.map((e) => (e.id === entry.id ? entry : e)) : [...all, entry];
  writeLS(lsKey(CV_ENTRIES_KEY, entry.user_id), next);

  const { error } = await supabase.from("companion_cv_entries").upsert({
    ...entry,
    updated_at: new Date().toISOString(),
  });
  if (error && !isMissingTable(error)) throw new Error(error.message);
}

export async function deleteCVEntry(
  supabase: SupabaseClient,
  userId: string,
  entryId: string
): Promise<void> {
  const all = readLS<CVEntry[]>(lsKey(CV_ENTRIES_KEY, userId), []);
  writeLS(
    lsKey(CV_ENTRIES_KEY, userId),
    all.filter((e) => e.id !== entryId)
  );

  const { error } = await supabase
    .from("companion_cv_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);
  if (error && !isMissingTable(error)) throw new Error(error.message);
}

export async function loadCourses(
  supabase: SupabaseClient,
  userId: string
): Promise<UserCourse[]> {
  const { data, error } = await supabase
    .from("companion_user_courses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!error && data) return data as UserCourse[];
  return readLS<UserCourse[]>(lsKey(COURSES_KEY, userId), []);
}

export async function saveCourse(
  supabase: SupabaseClient,
  course: UserCourse
): Promise<void> {
  const all = readLS<UserCourse[]>(lsKey(COURSES_KEY, course.user_id), []);
  const idx = all.findIndex((c) => c.id === course.id);
  const next = idx >= 0 ? all.map((c) => (c.id === course.id ? course : c)) : [...all, course];
  writeLS(lsKey(COURSES_KEY, course.user_id), next);

  const { error } = await supabase.from("companion_user_courses").upsert({
    ...course,
    updated_at: new Date().toISOString(),
  });
  if (error && !isMissingTable(error)) throw new Error(error.message);
}

export async function deleteCourse(
  supabase: SupabaseClient,
  userId: string,
  courseId: string
): Promise<void> {
  const courses = readLS<UserCourse[]>(lsKey(COURSES_KEY, userId), []);
  writeLS(
    lsKey(COURSES_KEY, userId),
    courses.filter((c) => c.id !== courseId)
  );

  const subjects = readLS<CourseSubject[]>(lsKey(SUBJECTS_KEY, userId), []);
  writeLS(
    lsKey(SUBJECTS_KEY, userId),
    subjects.filter((s) => s.course_id !== courseId)
  );

  const { error } = await supabase
    .from("companion_user_courses")
    .delete()
    .eq("id", courseId)
    .eq("user_id", userId);
  if (error && !isMissingTable(error)) throw new Error(error.message);
}

export async function loadSubjects(
  supabase: SupabaseClient,
  userId: string,
  courseId?: string
): Promise<CourseSubject[]> {
  let query = supabase
    .from("companion_course_subjects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (courseId) query = query.eq("course_id", courseId);

  const { data, error } = await query;
  if (!error && data) return data as CourseSubject[];

  const all = readLS<CourseSubject[]>(lsKey(SUBJECTS_KEY, userId), []);
  return courseId ? all.filter((s) => s.course_id === courseId) : all;
}

export async function saveSubject(
  supabase: SupabaseClient,
  subject: CourseSubject
): Promise<void> {
  const all = readLS<CourseSubject[]>(lsKey(SUBJECTS_KEY, subject.user_id), []);
  const idx = all.findIndex((s) => s.id === subject.id);
  const next = idx >= 0 ? all.map((s) => (s.id === subject.id ? subject : s)) : [...all, subject];
  writeLS(lsKey(SUBJECTS_KEY, subject.user_id), next);

  const { error } = await supabase.from("companion_course_subjects").upsert({
    ...subject,
    updated_at: new Date().toISOString(),
  });
  if (error && !isMissingTable(error)) throw new Error(error.message);
}

export async function deleteSubject(
  supabase: SupabaseClient,
  userId: string,
  subjectId: string
): Promise<void> {
  const all = readLS<CourseSubject[]>(lsKey(SUBJECTS_KEY, userId), []);
  writeLS(
    lsKey(SUBJECTS_KEY, userId),
    all.filter((s) => s.id !== subjectId)
  );

  const materials = readLS<SubjectMaterial[]>(lsKey(MATERIALS_KEY, userId), []);
  writeLS(
    lsKey(MATERIALS_KEY, userId),
    materials.filter((m) => m.subject_id !== subjectId)
  );

  const { error } = await supabase
    .from("companion_course_subjects")
    .delete()
    .eq("id", subjectId)
    .eq("user_id", userId);
  if (error && !isMissingTable(error)) throw new Error(error.message);
}

export async function loadMaterial(
  supabase: SupabaseClient,
  userId: string,
  subjectId: string
): Promise<SubjectMaterial | null> {
  const { data, error } = await supabase
    .from("companion_subject_materials")
    .select("*")
    .eq("user_id", userId)
    .eq("subject_id", subjectId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) return data as SubjectMaterial;

  const all = readLS<SubjectMaterial[]>(lsKey(MATERIALS_KEY, userId), []);
  return all.find((m) => m.subject_id === subjectId) ?? null;
}

export async function saveMaterial(
  supabase: SupabaseClient,
  material: SubjectMaterial
): Promise<void> {
  const all = readLS<SubjectMaterial[]>(lsKey(MATERIALS_KEY, material.user_id), []);
  const filtered = all.filter((m) => m.subject_id !== material.subject_id);
  writeLS(lsKey(MATERIALS_KEY, material.user_id), [material, ...filtered]);

  const { error } = await supabase.from("companion_subject_materials").upsert(material);
  if (error && !isMissingTable(error)) throw new Error(error.message);
}
