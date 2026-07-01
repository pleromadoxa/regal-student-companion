-- Subscription & usage tracking for Regal Student Companion (companion_* only)

CREATE TABLE IF NOT EXISTS companion_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'scholar' CHECK (plan_id IN ('scholar', 'graduate', 'campus')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  ai_requests_today INT NOT NULL DEFAULT 0,
  ai_requests_reset_at DATE NOT NULL DEFAULT CURRENT_DATE,
  voice_sessions_month INT NOT NULL DEFAULT 0,
  voice_sessions_reset_at DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  paystack_customer_code TEXT,
  paystack_subscription_code TEXT,
  paystack_reference TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE companion_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companion_subscriptions_own ON companion_subscriptions;
CREATE POLICY companion_subscriptions_own ON companion_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_companion_subscriptions_plan ON companion_subscriptions(plan_id, status);

-- Auto-create scholar plan on first companion profile
CREATE OR REPLACE FUNCTION companion_ensure_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO companion_subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'scholar', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companion_profiles_subscription ON companion_profiles;
CREATE TRIGGER companion_profiles_subscription
  AFTER INSERT ON companion_profiles
  FOR EACH ROW EXECUTE FUNCTION companion_ensure_subscription();
