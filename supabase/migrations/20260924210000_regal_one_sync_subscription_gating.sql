-- Regal One sync: Ultra tier, monthly expiry, and privileged plan writes.
--
-- Problem: companion_subscriptions was `FOR ALL` on auth.uid() = user_id with
-- public anon access, so any signed-in student could PATCH their own row and
-- grant themselves a paid plan. Plan/status changes must now come from a
-- privileged writer (service role, or a SECURITY DEFINER admin function).

-- ---------------------------------------------------------------------------
-- 1) Allow the Ultra tier and the expired status
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  c text;
BEGIN
  -- Postgres prints `plan_id IN (...)` as `plan_id = ANY (ARRAY[...])`, so match
  -- on the constraint name / expression rather than the literal "IN".
  FOR c IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'public.companion_subscriptions'::regclass
       AND contype = 'c'
       AND (conname ~ 'plan_id|status'
            OR pg_get_constraintdef(oid) ~* 'plan_id|status')
  LOOP
    EXECUTE format('ALTER TABLE public.companion_subscriptions DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.companion_subscriptions
  ADD CONSTRAINT companion_subscriptions_plan_id_check
  CHECK (plan_id IN ('scholar', 'graduate', 'campus', 'ultra'));

ALTER TABLE public.companion_subscriptions
  ADD CONSTRAINT companion_subscriptions_status_check
  CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'expired'));

-- ---------------------------------------------------------------------------
-- 2) Column-level privileges: end users may only touch usage counters
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.companion_subscriptions FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE ON public.companion_subscriptions FROM authenticated;

GRANT UPDATE (
  ai_requests_today,
  ai_requests_reset_at,
  voice_sessions_month,
  voice_sessions_reset_at,
  paystack_customer_code,
  paystack_subscription_code,
  paystack_reference,
  updated_at
) ON public.companion_subscriptions TO authenticated;

-- INSERT stays available (usage-row bootstrap), but the guard below forces a
-- free plan for non-privileged writers.
GRANT INSERT ON public.companion_subscriptions TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Guard: non-privileged writers can never create/steal a paid plan
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.companion_subscription_plan_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Inside SECURITY DEFINER functions and for the service role, current_user
  -- is privileged (postgres / service_role) — billing & admin paths proceed.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.plan_id := 'scholar';
    NEW.status := 'active';
    NEW.current_period_end := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE on plan columns is already denied by the grants above; keep a
  -- second layer in case privileges are re-granted later.
  NEW.plan_id := OLD.plan_id;
  NEW.status := OLD.status;
  NEW.current_period_end := OLD.current_period_end;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companion_subscription_plan_guard ON public.companion_subscriptions;
CREATE TRIGGER companion_subscription_plan_guard
  BEFORE INSERT OR UPDATE ON public.companion_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.companion_subscription_plan_guard();

-- ---------------------------------------------------------------------------
-- 4) Admin plan assignment (SECURITY DEFINER — bypasses the column grants,
--    still gated by companion_is_admin())
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.companion_admin_set_subscription(
  p_user_id uuid,
  p_plan_id text,
  p_status text DEFAULT 'active'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;
  -- SECURITY DEFINER bypasses the column grants, so the caller must be an admin.
  IF NOT public.companion_is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_plan_id NOT IN ('scholar', 'graduate', 'campus', 'ultra') THEN
    RAISE EXCEPTION 'invalid plan';
  END IF;
  IF p_status NOT IN ('active', 'cancelled', 'past_due', 'trialing', 'expired') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  INSERT INTO public.companion_subscriptions (user_id, plan_id, status, updated_at)
  VALUES (p_user_id, p_plan_id, p_status, now())
  ON CONFLICT (user_id) DO UPDATE
    SET plan_id = excluded.plan_id,
        status = excluded.status,
        updated_at = now();

  RETURN jsonb_build_object('ok', true, 'plan_id', p_plan_id, 'status', p_status);
END;
$$;

REVOKE ALL ON FUNCTION public.companion_admin_set_subscription(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.companion_admin_set_subscription(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.companion_admin_set_subscription(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.companion_admin_set_subscription(uuid, text, text) TO service_role;
