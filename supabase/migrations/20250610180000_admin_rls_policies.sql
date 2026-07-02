-- Admin console: RLS policies so admins can read/write via authenticated session
-- (no SUPABASE_SERVICE_ROLE_KEY required on Cloudflare Workers)

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
  IF uemail IS NULL THEN
    SELECT email INTO uemail FROM auth.users WHERE id = uid;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM companion_admins a
    WHERE a.user_id = uid OR (uemail IS NOT NULL AND lower(a.email) = lower(uemail))
  );
END;
$$;

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
  IF uemail IS NULL THEN
    SELECT email INTO uemail FROM auth.users WHERE id = uid;
  END IF;

  IF uemail IS NOT NULL THEN
    UPDATE companion_admins SET user_id = uid WHERE lower(email) = lower(uemail) AND user_id IS NULL;
  END IF;
END;
$$;

DROP POLICY IF EXISTS companion_app_members_admin ON companion_app_members;
CREATE POLICY companion_app_members_admin ON companion_app_members
  FOR SELECT USING (companion_is_admin());

DROP POLICY IF EXISTS companion_activity_log_admin ON companion_activity_log;
CREATE POLICY companion_activity_log_admin ON companion_activity_log
  FOR SELECT USING (companion_is_admin());

DROP POLICY IF EXISTS companion_subscriptions_admin ON companion_subscriptions;
CREATE POLICY companion_subscriptions_admin ON companion_subscriptions
  FOR ALL USING (companion_is_admin()) WITH CHECK (companion_is_admin());

DROP POLICY IF EXISTS companion_support_admin ON companion_support_tickets;
CREATE POLICY companion_support_admin ON companion_support_tickets
  FOR ALL USING (companion_is_admin()) WITH CHECK (companion_is_admin());

DROP POLICY IF EXISTS companion_coupons_admin ON companion_coupons;
CREATE POLICY companion_coupons_admin ON companion_coupons
  FOR ALL USING (companion_is_admin()) WITH CHECK (companion_is_admin());

DROP POLICY IF EXISTS companion_profiles_admin ON companion_profiles;
CREATE POLICY companion_profiles_admin ON companion_profiles
  FOR SELECT USING (companion_is_admin());

DROP POLICY IF EXISTS companion_admin_audit_insert ON companion_admin_audit;
CREATE POLICY companion_admin_audit_insert ON companion_admin_audit
  FOR INSERT WITH CHECK (companion_is_admin() AND admin_user_id = auth.uid());
