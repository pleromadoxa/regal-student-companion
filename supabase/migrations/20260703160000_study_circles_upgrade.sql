-- Study Circles upgrade: invites, reactions, AI messages, WebRTC audio/video calls
-- All members must be Regal Student Companion users (companion_profiles row required)

-- ─── Extend companion_study_circles ───
ALTER TABLE companion_study_circles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS topic_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS calls_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS active_call_id UUID;

-- ─── Extend companion_circle_messages ───
ALTER TABLE companion_circle_messages
  ADD COLUMN IF NOT EXISTS is_ai BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES companion_circle_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_circle_messages_created
  ON companion_circle_messages(circle_id, created_at DESC);

-- ─── Invite links (code-based, limited use, expiring) ───
CREATE TABLE IF NOT EXISTS companion_circle_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES companion_study_circles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_uses INT,
  use_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circle_invites_code ON companion_circle_invites(code);
CREATE INDEX IF NOT EXISTS idx_circle_invites_circle ON companion_circle_invites(circle_id);

-- ─── Live call sessions (WebRTC audio/video) ───
CREATE TABLE IF NOT EXISTS companion_circle_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES companion_study_circles(id) ON DELETE CASCADE,
  started_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('audio', 'video')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ai_enabled BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_circle_calls_circle_active
  ON companion_circle_calls(circle_id) WHERE ended_at IS NULL;

-- ─── Per-participant presence in a call ───
CREATE TABLE IF NOT EXISTS companion_circle_call_participants (
  call_id UUID NOT NULL REFERENCES companion_circle_calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'participant')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  camera_on BOOLEAN NOT NULL DEFAULT false,
  mic_on BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (call_id, user_id)
);

-- ─── Enable RLS ───
ALTER TABLE companion_circle_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_circle_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_circle_call_participants ENABLE ROW LEVEL SECURITY;

-- ─── RLS: invites are readable by circle members; anyone with the code can preview via RPC ───
DROP POLICY IF EXISTS circle_invites_member_read ON companion_circle_invites;
CREATE POLICY circle_invites_member_read ON companion_circle_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companion_circle_members m
      WHERE m.circle_id = companion_circle_invites.circle_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS circle_invites_member_write ON companion_circle_invites;
CREATE POLICY circle_invites_member_write ON companion_circle_invites
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM companion_circle_members m
      WHERE m.circle_id = companion_circle_invites.circle_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS circle_invites_owner_update ON companion_circle_invites;
CREATE POLICY circle_invites_owner_update ON companion_circle_invites
  FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- ─── RLS: calls readable by circle members, insertable by members, host can end ───
DROP POLICY IF EXISTS circle_calls_member_read ON companion_circle_calls;
CREATE POLICY circle_calls_member_read ON companion_circle_calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companion_circle_members m
      WHERE m.circle_id = companion_circle_calls.circle_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS circle_calls_member_start ON companion_circle_calls;
CREATE POLICY circle_calls_member_start ON companion_circle_calls
  FOR INSERT WITH CHECK (
    auth.uid() = started_by
    AND EXISTS (
      SELECT 1 FROM companion_circle_members m
      WHERE m.circle_id = companion_circle_calls.circle_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS circle_calls_host_update ON companion_circle_calls;
CREATE POLICY circle_calls_host_update ON companion_circle_calls
  FOR UPDATE USING (auth.uid() = started_by) WITH CHECK (auth.uid() = started_by);

-- ─── RLS: call participants — visible to all fellow members ───
DROP POLICY IF EXISTS circle_call_parts_read ON companion_circle_call_participants;
CREATE POLICY circle_call_parts_read ON companion_circle_call_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM companion_circle_calls c
      JOIN companion_circle_members m ON m.circle_id = c.circle_id
      WHERE c.id = companion_circle_call_participants.call_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS circle_call_parts_own ON companion_circle_call_participants;
CREATE POLICY circle_call_parts_own ON companion_circle_call_participants
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Helper: is caller a Regal Student Companion user? ───
CREATE OR REPLACE FUNCTION companion_is_app_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM companion_profiles WHERE id = uid);
END;
$$;

REVOKE ALL ON FUNCTION companion_is_app_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_is_app_user() TO authenticated;

-- ─── RPC: generate short random invite code (24-char) ───
CREATE OR REPLACE FUNCTION companion_generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..10 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ─── RPC: create invite for a circle (member-only) ───
CREATE OR REPLACE FUNCTION companion_create_circle_invite(
  p_circle_id UUID,
  p_max_uses INT DEFAULT NULL,
  p_ttl_hours INT DEFAULT 168
)
RETURNS TABLE(id UUID, code TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  new_code TEXT;
  new_expires TIMESTAMPTZ;
  new_row companion_circle_invites%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM companion_circle_members WHERE circle_id = p_circle_id AND user_id = uid) THEN
    RAISE EXCEPTION 'Only members can create invites';
  END IF;

  new_expires := CASE WHEN p_ttl_hours > 0 THEN now() + (p_ttl_hours || ' hours')::interval ELSE NULL END;

  LOOP
    new_code := companion_generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM companion_circle_invites WHERE code = new_code);
  END LOOP;

  INSERT INTO companion_circle_invites (circle_id, code, created_by, max_uses, expires_at)
  VALUES (p_circle_id, new_code, uid, p_max_uses, new_expires)
  RETURNING * INTO new_row;

  PERFORM companion_log_activity(
    'circle_invite_created',
    'social',
    'Created a study circle invite',
    jsonb_build_object('circle_id', p_circle_id, 'code', new_code),
    0,
    '/study-circles'
  );

  RETURN QUERY SELECT new_row.id, new_row.code, new_row.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION companion_create_circle_invite(UUID, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_create_circle_invite(UUID, INT, INT) TO authenticated;

-- ─── RPC: preview an invite (any authenticated Companion user with the code) ───
CREATE OR REPLACE FUNCTION companion_preview_circle_invite(p_code TEXT)
RETURNS TABLE(
  circle_id UUID,
  circle_name TEXT,
  circle_subject TEXT,
  circle_description TEXT,
  member_count BIGINT,
  invite_id UUID,
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN,
  already_member BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  uid UUID := auth.uid();
  inv companion_circle_invites%ROWTYPE;
  circ companion_study_circles%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT companion_is_app_user() THEN
    RAISE EXCEPTION 'Only Regal Student Companion users can view invites';
  END IF;

  SELECT * INTO inv FROM companion_circle_invites WHERE code = upper(p_code) LIMIT 1;
  IF inv.id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 0::BIGINT,
                        NULL::UUID, NULL::TIMESTAMPTZ, false, false;
    RETURN;
  END IF;

  SELECT * INTO circ FROM companion_study_circles WHERE id = inv.circle_id LIMIT 1;

  RETURN QUERY
  SELECT
    circ.id,
    circ.name,
    circ.subject,
    circ.description,
    (SELECT COUNT(*)::BIGINT FROM companion_circle_members WHERE circle_id = circ.id),
    inv.id,
    inv.expires_at,
    (
      inv.revoked_at IS NULL
      AND (inv.expires_at IS NULL OR inv.expires_at > now())
      AND (inv.max_uses IS NULL OR inv.use_count < inv.max_uses)
    ),
    EXISTS (SELECT 1 FROM companion_circle_members WHERE circle_id = circ.id AND user_id = uid);
END;
$$;

REVOKE ALL ON FUNCTION companion_preview_circle_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_preview_circle_invite(TEXT) TO authenticated;

-- ─── RPC: join circle via invite code (Companion users only) ───
CREATE OR REPLACE FUNCTION companion_join_circle_by_code(p_code TEXT)
RETURNS TABLE(circle_id UUID, joined BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  inv companion_circle_invites%ROWTYPE;
  already BOOLEAN;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT companion_is_app_user() THEN
    RAISE EXCEPTION 'Only Regal Student Companion users can join circles';
  END IF;

  SELECT * INTO inv FROM companion_circle_invites WHERE code = upper(p_code) LIMIT 1;
  IF inv.id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Invite not found';
    RETURN;
  END IF;

  IF inv.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT inv.circle_id, false, 'Invite has been revoked';
    RETURN;
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RETURN QUERY SELECT inv.circle_id, false, 'Invite has expired';
    RETURN;
  END IF;

  IF inv.max_uses IS NOT NULL AND inv.use_count >= inv.max_uses THEN
    RETURN QUERY SELECT inv.circle_id, false, 'Invite has reached its usage limit';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM companion_circle_members WHERE circle_id = inv.circle_id AND user_id = uid
  ) INTO already;

  IF NOT already THEN
    INSERT INTO companion_circle_members (circle_id, user_id, role)
    VALUES (inv.circle_id, uid, 'member');

    UPDATE companion_circle_invites SET use_count = use_count + 1 WHERE id = inv.id;

    PERFORM companion_log_activity(
      'circle_joined',
      'social',
      'Joined a study circle',
      jsonb_build_object('circle_id', inv.circle_id, 'code', inv.code),
      3,
      '/study-circles'
    );
  END IF;

  RETURN QUERY SELECT inv.circle_id, true, CASE WHEN already THEN 'Already a member' ELSE 'Joined circle' END;
END;
$$;

REVOKE ALL ON FUNCTION companion_join_circle_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_join_circle_by_code(TEXT) TO authenticated;

-- ─── RPC: toggle a reaction on a message ───
CREATE OR REPLACE FUNCTION companion_toggle_message_reaction(
  p_message_id UUID,
  p_emoji TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  current_reactions JSONB;
  user_list JSONB;
  new_list JSONB;
  new_reactions JSONB;
  circle_id_val UUID;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT circle_id, COALESCE(reactions, '{}'::JSONB)
    INTO circle_id_val, current_reactions
    FROM companion_circle_messages WHERE id = p_message_id;

  IF circle_id_val IS NULL THEN RAISE EXCEPTION 'Message not found'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM companion_circle_members WHERE circle_id = circle_id_val AND user_id = uid
  ) THEN
    RAISE EXCEPTION 'Not a member of this circle';
  END IF;

  user_list := COALESCE(current_reactions -> p_emoji, '[]'::JSONB);

  IF user_list @> to_jsonb(uid::text) THEN
    new_list := (SELECT jsonb_agg(x) FROM jsonb_array_elements_text(user_list) x WHERE x <> uid::text);
    IF new_list IS NULL OR jsonb_array_length(new_list) = 0 THEN
      new_reactions := current_reactions - p_emoji;
    ELSE
      new_reactions := jsonb_set(current_reactions, ARRAY[p_emoji], new_list);
    END IF;
  ELSE
    new_list := user_list || to_jsonb(uid::text);
    new_reactions := jsonb_set(current_reactions, ARRAY[p_emoji], new_list, true);
  END IF;

  UPDATE companion_circle_messages SET reactions = new_reactions WHERE id = p_message_id;
  RETURN new_reactions;
END;
$$;

REVOKE ALL ON FUNCTION companion_toggle_message_reaction(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_toggle_message_reaction(UUID, TEXT) TO authenticated;

-- ─── RPC: end a call (host only) ───
CREATE OR REPLACE FUNCTION companion_end_circle_call(p_call_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  host UUID;
  cid UUID;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT started_by, circle_id INTO host, cid FROM companion_circle_calls WHERE id = p_call_id;
  IF host IS NULL THEN RAISE EXCEPTION 'Call not found'; END IF;
  IF host <> uid THEN RAISE EXCEPTION 'Only the host can end this call'; END IF;

  UPDATE companion_circle_calls SET ended_at = now() WHERE id = p_call_id AND ended_at IS NULL;
  UPDATE companion_study_circles SET active_call_id = NULL WHERE id = cid AND active_call_id = p_call_id;
  UPDATE companion_circle_call_participants
     SET left_at = COALESCE(left_at, now())
   WHERE call_id = p_call_id AND left_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION companion_end_circle_call(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_end_circle_call(UUID) TO authenticated;

-- ─── Realtime publication (safe if extension not enabled) ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE companion_circle_messages;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE companion_circle_calls;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE companion_circle_call_participants;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE companion_circle_members;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
