-- Regal Student Companion — app-specific activity tracking, leaderboard scope, admin panel

-- ─── App members: users who have actually used Regal Student Companion ───
CREATE TABLE IF NOT EXISTS companion_app_members (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_path TEXT,
  activity_count INT NOT NULL DEFAULT 0,
  session_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companion_app_members_last_seen ON companion_app_members(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_companion_app_members_activity ON companion_app_members(activity_count DESC);

-- ─── Activity log (Regal Student Companion only) ───
CREATE TABLE IF NOT EXISTS companion_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  label TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  points_delta INT NOT NULL DEFAULT 0,
  path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companion_activity_user ON companion_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companion_activity_action ON companion_activity_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companion_activity_created ON companion_activity_log(created_at DESC);

-- ─── Admins ───
CREATE TABLE IF NOT EXISTS companion_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'support', 'billing')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO companion_admins (email, role)
VALUES ('pleromadoxa@regalmail.me', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- ─── Coupons ───
CREATE TABLE IF NOT EXISTS companion_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  plan_id TEXT CHECK (plan_id IN ('scholar', 'graduate', 'campus')),
  discount_percent INT NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  trial_days INT NOT NULL DEFAULT 0,
  max_uses INT,
  used_count INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companion_coupons_code ON companion_coupons(code) WHERE active = true;

-- ─── Support tickets ───
CREATE TABLE IF NOT EXISTS companion_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_notes TEXT,
  assigned_admin UUID REFERENCES companion_admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companion_support_status ON companion_support_tickets(status, created_at DESC);

-- ─── Admin audit log ───
CREATE TABLE IF NOT EXISTS companion_admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Helper: is current user an admin? ───
CREATE OR REPLACE FUNCTION companion_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  uid UUID := auth.uid();
  uemail TEXT;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;
  SELECT email INTO uemail FROM companion_profiles WHERE id = uid;
  RETURN EXISTS (
    SELECT 1 FROM companion_admins a
    WHERE a.user_id = uid OR (uemail IS NOT NULL AND lower(a.email) = lower(uemail))
  );
END;
$$;

REVOKE ALL ON FUNCTION companion_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_is_admin() TO authenticated;

-- ─── Link admin row to user_id on activity ───
CREATE OR REPLACE FUNCTION companion_link_admin_user()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  uemail TEXT;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  SELECT email INTO uemail FROM companion_profiles WHERE id = uid;
  IF uemail IS NOT NULL THEN
    UPDATE companion_admins SET user_id = uid WHERE lower(email) = lower(uemail) AND user_id IS NULL;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION companion_link_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_link_admin_user() TO authenticated;

-- ─── Log activity + mark app member + optional engagement points ───
CREATE OR REPLACE FUNCTION companion_log_activity(
  p_action TEXT,
  p_category TEXT DEFAULT 'general',
  p_label TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_points_delta INT DEFAULT 0,
  p_path TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  log_id UUID;
  delta INT := GREATEST(COALESCE(p_points_delta, 0), 0);
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM companion_link_admin_user();

  INSERT INTO companion_app_members (user_id, last_seen_at, last_path, activity_count, session_count)
  VALUES (uid, now(), p_path, 1, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    last_seen_at = now(),
    last_path = COALESCE(p_path, companion_app_members.last_path),
    activity_count = companion_app_members.activity_count + 1,
    updated_at = now();

  INSERT INTO companion_activity_log (user_id, action, category, label, metadata, points_delta, path)
  VALUES (
    uid,
    p_action,
    COALESCE(p_category, 'general'),
    COALESCE(p_label, p_action),
    COALESCE(p_metadata, '{}'),
    delta,
    p_path
  )
  RETURNING id INTO log_id;

  IF delta > 0 THEN
    UPDATE companion_profiles
    SET engagement_points = COALESCE(engagement_points, 0) + delta,
        updated_at = now()
    WHERE id = uid;
  END IF;

  RETURN log_id;
END;
$$;

REVOKE ALL ON FUNCTION companion_log_activity(TEXT, TEXT, TEXT, JSONB, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_log_activity(TEXT, TEXT, TEXT, JSONB, INT, TEXT) TO authenticated;

-- ─── Record app session (heartbeat / page visit) ───
CREATE OR REPLACE FUNCTION companion_record_app_session(p_path TEXT DEFAULT '/dashboard')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  PERFORM companion_link_admin_user();
  INSERT INTO companion_app_members (user_id, last_seen_at, last_path, activity_count, session_count)
  VALUES (uid, now(), p_path, 0, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    last_seen_at = now(),
    last_path = p_path,
    session_count = companion_app_members.session_count + 1,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION companion_record_app_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION companion_record_app_session(TEXT) TO authenticated;

-- ─── Update engagement RPC to also log activity ───
CREATE OR REPLACE FUNCTION companion_increment_engagement(delta INT DEFAULT 5)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d INT := GREATEST(COALESCE(delta, 5), 0);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM companion_log_activity(
    'engagement_points',
    'platform',
    'Earned engagement points',
    jsonb_build_object('delta', d),
    d,
    NULL
  );
END;
$$;

-- ─── Leaderboard: only active Regal Student Companion users ───
DROP VIEW IF EXISTS companion_leaderboard_public;
CREATE OR REPLACE VIEW companion_leaderboard_public
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.display_name,
  COALESCE(p.engagement_points, 0) AS engagement_points,
  COALESCE(p.study_streak, 0) AS study_streak,
  COALESCE(p.focus_minutes, 0) AS focus_minutes,
  p.avatar_url,
  m.activity_count,
  m.last_seen_at
FROM companion_profiles p
INNER JOIN companion_app_members m ON m.user_id = p.id
WHERE p.display_name IS NOT NULL
  AND m.activity_count > 0;

GRANT SELECT ON companion_leaderboard_public TO authenticated;

-- ─── RLS ───
ALTER TABLE companion_app_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_admin_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companion_app_members_own ON companion_app_members;
CREATE POLICY companion_app_members_own ON companion_app_members
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS companion_activity_log_own ON companion_activity_log;
CREATE POLICY companion_activity_log_own ON companion_activity_log
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS companion_admins_self ON companion_admins;
CREATE POLICY companion_admins_self ON companion_admins
  FOR SELECT USING (companion_is_admin());

DROP POLICY IF EXISTS companion_coupons_read ON companion_coupons;
CREATE POLICY companion_coupons_read ON companion_coupons
  FOR SELECT USING (active = true AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS companion_support_own ON companion_support_tickets;
CREATE POLICY companion_support_own ON companion_support_tickets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS companion_admin_audit_admin ON companion_admin_audit;
CREATE POLICY companion_admin_audit_admin ON companion_admin_audit
  FOR SELECT USING (companion_is_admin());
