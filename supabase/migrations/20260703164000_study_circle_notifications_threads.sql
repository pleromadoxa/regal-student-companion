-- Study circle notifications, pinned messages, thread comments, and safer call state.

-- One active call per circle at a time.
DROP INDEX IF EXISTS companion_circle_calls_one_active;
CREATE UNIQUE INDEX companion_circle_calls_one_active
  ON companion_circle_calls(circle_id)
  WHERE ended_at IS NULL;

-- Message pinning metadata.
ALTER TABLE companion_circle_messages
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_circle_messages_pinned
  ON companion_circle_messages(circle_id, pinned_at DESC)
  WHERE pinned_at IS NOT NULL;

-- Per-message thread comments inside a circle.
CREATE TABLE IF NOT EXISTS companion_circle_message_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES companion_study_circles(id) ON DELETE CASCADE,
  parent_message_id UUID NOT NULL REFERENCES companion_circle_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circle_message_comments_parent
  ON companion_circle_message_comments(parent_message_id, created_at ASC);

ALTER TABLE companion_circle_message_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS circle_message_comments_read ON companion_circle_message_comments;
CREATE POLICY circle_message_comments_read ON companion_circle_message_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM companion_circle_members m
      WHERE m.circle_id = companion_circle_message_comments.circle_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS circle_message_comments_insert ON companion_circle_message_comments;
CREATE POLICY circle_message_comments_insert ON companion_circle_message_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM companion_circle_members m
      WHERE m.circle_id = companion_circle_message_comments.circle_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS circle_message_comments_update_own ON companion_circle_message_comments;
CREATE POLICY circle_message_comments_update_own ON companion_circle_message_comments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS circle_message_comments_delete_own ON companion_circle_message_comments;
CREATE POLICY circle_message_comments_delete_own ON companion_circle_message_comments
  FOR DELETE USING (auth.uid() = user_id);

-- In-app notification feed.
CREATE TABLE IF NOT EXISTS companion_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companion_notifications_user_created
  ON companion_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_companion_notifications_user_unread
  ON companion_notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE companion_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companion_notifications_own_select ON companion_notifications;
CREATE POLICY companion_notifications_own_select ON companion_notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS companion_notifications_own_update ON companion_notifications;
CREATE POLICY companion_notifications_own_update ON companion_notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Toggle pin for any member in the circle.
CREATE OR REPLACE FUNCTION companion_toggle_message_pin(p_message_id UUID)
RETURNS TABLE(pinned_at TIMESTAMPTZ, pinned_by UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  circle_id_val UUID;
  current_pinned_at TIMESTAMPTZ;
  new_pinned_at TIMESTAMPTZ;
  new_pinned_by UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT circle_id, companion_circle_messages.pinned_at
    INTO circle_id_val, current_pinned_at
    FROM companion_circle_messages
   WHERE id = p_message_id;

  IF circle_id_val IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM companion_circle_members
     WHERE circle_id = circle_id_val
       AND user_id = uid
  ) THEN
    RAISE EXCEPTION 'Not a member of this circle';
  END IF;

  IF current_pinned_at IS NULL THEN
    new_pinned_at := now();
    new_pinned_by := uid;
  ELSE
    new_pinned_at := NULL;
    new_pinned_by := NULL;
  END IF;

  UPDATE companion_circle_messages
     SET pinned_at = new_pinned_at,
         pinned_by = new_pinned_by
   WHERE id = p_message_id;

  RETURN QUERY SELECT new_pinned_at, new_pinned_by;
END;
$$;

REVOKE ALL ON FUNCTION companion_toggle_message_pin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_toggle_message_pin(UUID) TO authenticated;

-- Create in-app alerts for all other members when a call starts.
CREATE OR REPLACE FUNCTION companion_create_call_alerts(
  p_call_id UUID
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  display_name TEXT,
  circle_name TEXT,
  call_id UUID,
  mode TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  call_row companion_circle_calls%ROWTYPE;
  circle_row companion_study_circles%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO call_row
    FROM companion_circle_calls
   WHERE id = p_call_id;

  IF call_row.id IS NULL THEN
    RAISE EXCEPTION 'Call not found';
  END IF;

  IF call_row.started_by <> uid THEN
    RAISE EXCEPTION 'Only the call host can alert members';
  END IF;

  SELECT * INTO circle_row
    FROM companion_study_circles
   WHERE id = call_row.circle_id;

  INSERT INTO companion_notifications (user_id, type, title, body, href, metadata)
  SELECT
    m.user_id,
    'study_circle_call_started',
    CASE
      WHEN call_row.mode = 'video' THEN 'Video study call started'
      ELSE 'Audio study call started'
    END,
    CASE
      WHEN call_row.mode = 'video' THEN circle_row.name || ' has a live video call waiting for you.'
      ELSE circle_row.name || ' has a live audio call waiting for you.'
    END,
    '/study-circles?circle=' || circle_row.id::text,
    jsonb_build_object(
      'circle_id', circle_row.id,
      'circle_name', circle_row.name,
      'call_id', call_row.id,
      'mode', call_row.mode
    )
  FROM companion_circle_members m
  WHERE m.circle_id = circle_row.id
    AND m.user_id <> uid
    AND NOT EXISTS (
      SELECT 1
      FROM companion_notifications n
      WHERE n.user_id = m.user_id
        AND n.type = 'study_circle_call_started'
        AND n.metadata ->> 'call_id' = call_row.id::text
    );

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.display_name,
    circle_row.name,
    call_row.id,
    call_row.mode
  FROM companion_circle_members m
  JOIN companion_profiles p ON p.id = m.user_id
  WHERE m.circle_id = circle_row.id
    AND m.user_id <> uid;
END;
$$;

REVOKE ALL ON FUNCTION companion_create_call_alerts(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_create_call_alerts(UUID) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE companion_circle_message_comments;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE companion_notifications;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
