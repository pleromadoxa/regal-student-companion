-- Continuous CV + My Courses tables for Regal Student Companion

CREATE TABLE IF NOT EXISTS companion_cv_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  major TEXT,
  course_enrolled TEXT,
  headline TEXT,
  bio TEXT,
  high_school TEXT,
  high_school_years TEXT,
  university TEXT,
  university_years TEXT,
  location TEXT,
  linkedin TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companion_cv_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'education', 'internship', 'job', 'school_activity', 'achievement',
    'hobby', 'skill', 'attachment', 'certification', 'project'
  )),
  title TEXT NOT NULL,
  organization TEXT,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  extra JSONB NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companion_user_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  institution TEXT,
  level TEXT,
  semester TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companion_course_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES companion_user_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  material_status TEXT NOT NULL DEFAULT 'pending' CHECK (material_status IN ('pending', 'generating', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companion_subject_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES companion_course_subjects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('generating', 'ready', 'failed')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_entries_user ON companion_cv_entries(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_user_courses_user ON companion_user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_course_subjects_course ON companion_course_subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_subject_materials_subject ON companion_subject_materials(subject_id);

ALTER TABLE companion_cv_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_cv_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_course_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_subject_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY cv_profiles_own ON companion_cv_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY cv_entries_own ON companion_cv_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_courses_own ON companion_user_courses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY course_subjects_own ON companion_course_subjects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY subject_materials_own ON companion_subject_materials FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
