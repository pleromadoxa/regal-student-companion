import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FEATURE_GATE_MESSAGES,
  getPlan,
  planIncludesFeature,
  type PlanId,
  type PlanLimits,
} from "@/lib/plans";

export type CompanionSubscription = {
  user_id: string;
  plan_id: PlanId;
  status: "active" | "cancelled" | "past_due" | "trialing";
  ai_requests_today: number;
  ai_requests_reset_at: string;
  voice_sessions_month: number;
  voice_sessions_reset_at: string;
  paystack_customer_code: string | null;
  paystack_subscription_code: string | null;
  current_period_end: string | null;
  updated_at: string;
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<{ planId: PlanId; limits: PlanLimits; row: CompanionSubscription | null }> {
  const { data } = await supabase
    .from("companion_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data || data.status !== "active") {
    const plan = getPlan("scholar");
    return { planId: "scholar", limits: plan.limits, row: data as CompanionSubscription | null };
  }

  const planId = (data.plan_id as PlanId) ?? "scholar";
  const plan = getPlan(planId);
  return { planId, limits: plan.limits, row: data as CompanionSubscription };
}

export async function ensureSubscriptionRow(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data } = await supabase
    .from("companion_subscriptions")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) return;

  const { error } = await supabase.from("companion_subscriptions").insert({
    user_id: userId,
    plan_id: "scholar",
    status: "active",
    ai_requests_today: 0,
    ai_requests_reset_at: todayUtc(),
    voice_sessions_month: 0,
    voice_sessions_reset_at: monthStartUtc(),
  });

  if (error) console.error("[subscription] ensureSubscriptionRow:", error.message);
}

export type UsageCheck =
  | { ok: true; remaining: number }
  | { ok: false; error: string; upgradeRequired?: boolean };

export async function checkAiUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageCheck> {
  await ensureSubscriptionRow(supabase, userId);
  const { limits, row } = await getUserSubscription(supabase, userId);

  if (!row) {
    return { ok: true, remaining: limits.aiRequestsPerDay };
  }

  const today = todayUtc();
  let used = row.ai_requests_today ?? 0;
  if (row.ai_requests_reset_at !== today) used = 0;

  if (used >= limits.aiRequestsPerDay) {
    return {
      ok: false,
      error: `Daily Regal AI limit reached (${limits.aiRequestsPerDay}). Upgrade for more requests.`,
      upgradeRequired: true,
    };
  }

  return { ok: true, remaining: limits.aiRequestsPerDay - used };
}

export async function incrementAiUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await ensureSubscriptionRow(supabase, userId);
  const today = todayUtc();

  const { data: row } = await supabase
    .from("companion_subscriptions")
    .select("ai_requests_today, ai_requests_reset_at")
    .eq("user_id", userId)
    .single();

  const used =
    row?.ai_requests_reset_at === today ? (row.ai_requests_today ?? 0) + 1 : 1;

  const { error } = await supabase
    .from("companion_subscriptions")
    .update({
      ai_requests_today: used,
      ai_requests_reset_at: today,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) console.error("[subscription] incrementAiUsage:", error.message);
}

export async function checkFeatureAccess(
  supabase: SupabaseClient,
  userId: string,
  feature: keyof PlanLimits
): Promise<UsageCheck> {
  const { planId } = await getUserSubscription(supabase, userId);
  if (planIncludesFeature(planId, feature)) {
    return { ok: true, remaining: -1 };
  }
  return {
    ok: false,
    error:
      FEATURE_GATE_MESSAGES[feature] ??
      "This feature requires a plan upgrade. Visit Profile → Plans.",
    upgradeRequired: true,
  };
}

export async function checkVoiceUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageCheck> {
  await ensureSubscriptionRow(supabase, userId);
  const { limits, row } = await getUserSubscription(supabase, userId);

  if (!limits.liveVoiceTutor || limits.voiceSessionsPerMonth <= 0) {
    return {
      ok: false,
      error: FEATURE_GATE_MESSAGES.liveVoiceTutor ?? "Live voice tutor requires an upgrade.",
      upgradeRequired: true,
    };
  }

  if (!row) {
    return { ok: true, remaining: limits.voiceSessionsPerMonth };
  }

  const monthStart = monthStartUtc();
  let used = row.voice_sessions_month ?? 0;
  if (row.voice_sessions_reset_at !== monthStart) used = 0;

  if (used >= limits.voiceSessionsPerMonth) {
    return {
      ok: false,
      error: `Monthly voice session limit reached (${limits.voiceSessionsPerMonth}). Upgrade for more.`,
      upgradeRequired: true,
    };
  }

  return { ok: true, remaining: limits.voiceSessionsPerMonth - used };
}

export async function incrementVoiceUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await ensureSubscriptionRow(supabase, userId);
  const monthStart = monthStartUtc();

  const { data: row } = await supabase
    .from("companion_subscriptions")
    .select("voice_sessions_month, voice_sessions_reset_at")
    .eq("user_id", userId)
    .single();

  const used =
    row?.voice_sessions_reset_at === monthStart
      ? (row.voice_sessions_month ?? 0) + 1
      : 1;

  const { error } = await supabase
    .from("companion_subscriptions")
    .update({
      voice_sessions_month: used,
      voice_sessions_reset_at: monthStart,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) console.error("[subscription] incrementVoiceUsage:", error.message);
}

export async function activatePlan(
  supabase: SupabaseClient,
  userId: string,
  planId: PlanId,
  paystackMeta?: {
    customer_code?: string;
    subscription_code?: string;
    period_end?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  await ensureSubscriptionRow(supabase, userId);
  const { error } = await supabase
    .from("companion_subscriptions")
    .update({
      plan_id: planId,
      status: "active",
      paystack_customer_code: paystackMeta?.customer_code ?? null,
      paystack_subscription_code: paystackMeta?.subscription_code ?? null,
      current_period_end: paystackMeta?.period_end ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("[subscription] activatePlan:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
