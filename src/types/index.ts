export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";
export type AssignmentStatus = "draft" | "in_review" | "submitted" | "graded";
export type ScanStatus = "pending" | "scanning" | "complete" | "failed";
export type ResearchNoteType = "summary" | "faq" | "timeline" | "briefing" | "chat";

export interface CompanionProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  major: string | null;
  year_level: string | null;
  engagement_points: number;
  focus_minutes: number;
  study_streak?: number;
  last_active_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: string;
  created_at: string;
}

export interface StudyCircle {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  owner_id: string;
  is_public: boolean;
  created_at: string;
}

export interface CircleMessage {
  id: string;
  circle_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { display_name: string | null; email?: string };
}

export interface Assignment {
  id: string;
  user_id: string;
  title: string;
  course: string | null;
  due_date: string | null;
  status: AssignmentStatus;
  content: string | null;
  ai_scan_summary: string | null;
  citation_style: string;
  created_at: string;
  updated_at: string;
}

export interface ResearchProject {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchSource {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  source_type: "document" | "url" | "note" | "pdf";
  content: string | null;
  file_path: string | null;
  url: string | null;
  created_at: string;
}

export interface ResearchNote {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  content: string;
  note_type: ResearchNoteType;
  created_at: string;
}

export interface DictionaryBookmark {
  id: string;
  user_id: string;
  word: string;
  definition: string;
  phonetic: string | null;
  created_at: string;
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}
