export type CVEntryType =
  | "education"
  | "internship"
  | "job"
  | "school_activity"
  | "achievement"
  | "hobby"
  | "skill"
  | "attachment"
  | "certification"
  | "project";

export type CVProfile = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  major: string | null;
  course_enrolled: string | null;
  headline: string | null;
  bio: string | null;
  high_school: string | null;
  high_school_years: string | null;
  university: string | null;
  university_years: string | null;
  location: string | null;
  linkedin: string | null;
  website: string | null;
  updated_at?: string;
};

export type CVEntry = {
  id: string;
  user_id: string;
  entry_type: CVEntryType;
  title: string;
  organization: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  extra: Record<string, string>;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type UserCourse = {
  id: string;
  user_id: string;
  name: string;
  institution: string | null;
  level: string | null;
  semester: string | null;
  description: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CourseSubject = {
  id: string;
  course_id: string;
  user_id: string;
  name: string;
  code: string | null;
  description: string | null;
  material_status: "pending" | "generating" | "ready" | "failed";
  created_at?: string;
  updated_at?: string;
};

export type SubjectMaterial = {
  id: string;
  subject_id: string;
  user_id: string;
  content: string;
  status: "generating" | "ready" | "failed";
  generated_at: string;
  created_at?: string;
};

export const CV_ENTRY_LABELS: Record<CVEntryType, string> = {
  education: "Education",
  internship: "Internship",
  job: "Job / Work",
  school_activity: "School Activity",
  achievement: "Achievement",
  hobby: "Hobby",
  skill: "Skill",
  attachment: "Attachment / Portfolio",
  certification: "Certification",
  project: "Project",
};

export const CV_ENTRY_ICONS: Record<CVEntryType, string> = {
  education: "GraduationCap",
  internship: "Building2",
  job: "Briefcase",
  school_activity: "Users",
  achievement: "Award",
  hobby: "Heart",
  skill: "Sparkles",
  attachment: "Paperclip",
  certification: "BadgeCheck",
  project: "FolderKanban",
};
