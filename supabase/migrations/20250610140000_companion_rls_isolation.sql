-- Regal Student Companion — production RLS, isolation from other Regal apps
-- Safe to run on shared Supabase project: only touches companion_* tables + companion storage

-- ─── Helper: atomic engagement increment (no read-modify-write races) ───
CREATE OR REPLACE FUNCTION companion_increment_engagement(delta INT DEFAULT 5)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE companion_profiles
  SET engagement_points = COALESCE(engagement_points, 0) + GREATEST(delta, 0),
      updated_at = now()
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION companion_increment_engagement(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_increment_engagement(INT) TO authenticated;

-- ─── Read-only bridge to Regal Mail profile (own row only) — never writes to profiles ───
CREATE OR REPLACE FUNCTION companion_get_regal_mail_profile()
RETURNS TABLE(full_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT p.full_name, p.avatar_url
  FROM profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION companion_get_regal_mail_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_get_regal_mail_profile() TO authenticated;

-- ─── Public leaderboard view (no emails) ───
CREATE OR REPLACE VIEW companion_leaderboard_public
WITH (security_invoker = true) AS
SELECT
  id,
  display_name,
  COALESCE(engagement_points, 0) AS engagement_points,
  COALESCE(study_streak, 0) AS study_streak,
  COALESCE(focus_minutes, 0) AS focus_minutes,
  avatar_url
FROM companion_profiles
WHERE display_name IS NOT NULL;

GRANT SELECT ON companion_leaderboard_public TO authenticated;

-- ─── Enable RLS on all companion tables ───
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companion_profiles',
    'companion_tasks',
    'companion_calendar_events',
    'companion_focus_sessions',
    'companion_dictionary_bookmarks',
    'companion_assignments',
    'companion_assignment_documents',
    'companion_research_projects',
    'companion_research_sources',
    'companion_research_notes',
    'companion_study_circles',
    'companion_circle_members',
    'companion_circle_messages',
    'companion_exams',
    'companion_study_match_profiles',
    'companion_budget_entries',
    'companion_wellness_logs',
    'companion_scholarships',
    'companion_schedule_blocks',
    'companion_reading_list',
    'companion_quick_notes',
    'companion_flashcards'
  ]
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ─── companion_profiles: own row full access + limited public read for social features ───
DROP POLICY IF EXISTS companion_profiles_own ON companion_profiles;
CREATE POLICY companion_profiles_own ON companion_profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS companion_profiles_public_read ON companion_profiles;
CREATE POLICY companion_profiles_public_read ON companion_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── User-owned rows (user_id column) ───
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'companion_tasks',
    'companion_calendar_events',
    'companion_focus_sessions',
    'companion_dictionary_bookmarks',
    'companion_assignments',
    'companion_assignment_documents',
    'companion_research_projects',
    'companion_research_sources',
    'companion_research_notes',
    'companion_exams',
    'companion_budget_entries',
    'companion_wellness_logs',
    'companion_scholarships',
    'companion_schedule_blocks',
    'companion_reading_list',
    'companion_quick_notes',
    'companion_flashcards'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_own ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_own ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ─── Study match: own write + visible profiles readable ───
DROP POLICY IF EXISTS companion_study_match_own ON companion_study_match_profiles;
CREATE POLICY companion_study_match_own ON companion_study_match_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS companion_study_match_visible ON companion_study_match_profiles;
CREATE POLICY companion_study_match_visible ON companion_study_match_profiles
  FOR SELECT USING (is_visible = true OR auth.uid() = user_id);

-- ─── Study circles: membership-based ───
DROP POLICY IF EXISTS companion_circles_select ON companion_study_circles;
CREATE POLICY companion_circles_select ON companion_study_circles
  FOR SELECT USING (
    is_public = true
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM companion_circle_members m
      WHERE m.circle_id = companion_study_circles.id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS companion_circles_insert ON companion_study_circles;
CREATE POLICY companion_circles_insert ON companion_study_circles
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS companion_circles_update ON companion_study_circles;
CREATE POLICY companion_circles_update ON companion_study_circles
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS companion_circle_members_own ON companion_circle_members;
CREATE POLICY companion_circle_members_own ON companion_circle_members
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS companion_circle_members_read ON companion_circle_members;
CREATE POLICY companion_circle_members_read ON companion_circle_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companion_circle_members m2
      WHERE m2.circle_id = companion_circle_members.circle_id AND m2.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS companion_circle_messages_member ON companion_circle_messages;
CREATE POLICY companion_circle_messages_member ON companion_circle_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companion_circle_members m
      WHERE m.circle_id = companion_circle_messages.circle_id AND m.user_id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM companion_circle_members m
      WHERE m.circle_id = companion_circle_messages.circle_id AND m.user_id = auth.uid()
    )
  );

-- ─── Storage: companion-documents bucket (user-scoped paths) ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'companion-documents') THEN
    DROP POLICY IF EXISTS companion_docs_select ON storage.objects;
    CREATE POLICY companion_docs_select ON storage.objects
      FOR SELECT USING (
        bucket_id = 'companion-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    DROP POLICY IF EXISTS companion_docs_insert ON storage.objects;
    CREATE POLICY companion_docs_insert ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'companion-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    DROP POLICY IF EXISTS companion_docs_update ON storage.objects;
    CREATE POLICY companion_docs_update ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'companion-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    DROP POLICY IF EXISTS companion_docs_delete ON storage.objects;
    CREATE POLICY companion_docs_delete ON storage.objects
      FOR DELETE USING (
        bucket_id = 'companion-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Document: Companion app MUST NOT write to shared Regal tables (profiles, emails, etc.)
-- All writes stay in companion_* namespace.
