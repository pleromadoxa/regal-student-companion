import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FEATURE_GATE_MESSAGES,
  getPlan,
  higherPlan,
  companionPlanForRegalPlan,
  isPlanId,
  planIncludesFeature,
  regalAiQuotaForPlan,
  type PlanId,
  type PlanLimits,
} from "@/lib/plans";
import { regalPlanIdFromMetadata, regalTierLabel, type RegalPlanId } from "@/lib/regal-one";

export type CompanionSubscription = {
  user_id: string;
  plan_id: PlanId;
  status: "active" | "cancelled" | "past_due" | "trialing" | "expired";
  ai_requests_today: number;
  ai_requests_reset_at: string;
  voice_sessions_month: number;
  voice_sessions_reset_at: string;
  paystack_customer_code: string | null;
  paystack_subscription_code: string | null;
  paystack_reference?: string | null;
  current_period_end: string | null;
  updated_at: string;
};

/**
 * Which side of the hybrid model each entitlement signal came from:
 *  - `regal`   → counted against the ecosystem-wide Regal AI quota (`regal_ai_usage_daily`)
 *  - `local`   → counted against this app's `companion_subscriptions` row
 */
export type AiQuotaSource = "regal" | "local";

export type SubscriptionResolution = {
  /** Effective tier — the higher of the Regal One tier and the student plan tier. */
  planId: PlanId;
  limits: PlanLimits;
  row: CompanionSubscription | null;
  /** Regal One plan on the shared @regalmail.me account. */
  regalPlanId: RegalPlanId;
  regalTierName: string;
  /** True when the account carries a paid Regal One plan (free ≠ paid). */
  viaRegalOne: boolean;
  /** True when a paid student (Paystack) plan is currently active. */
  viaStudentPlan: boolean;
  /** Tier granted by the student plan alone (scholar when none/expired). */
  standalonePlanId: PlanId;
  /** When the paid student plan reverts to the free tier (null = no expiry). */
  expiresAt: string | null;
  aiQuotaSource: AiQuotaSource;
  regalAiQuota: number | "unlimited";
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function isExpired(row: CompanionSubscription | null): boolean {
  if (!row?.current_period_end) return false;
  return new Date(row.current_period_end).getTime() < Date.now();
}

/**
 * Resolve the user's plan across BOTH entitlement sources:
 *  1. Regal One (`regal_plan` on auth user_metadata — set by Regal Mail billing)
 *  2. Student plan (Paystack row in `companion_subscriptions`, monthly)
 * The higher tier wins. A paid student plan past `current_period_end` falls back
 * to the free tier (lazily marked `expired` so the profile can prompt renewal).
 */
export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionResolution> {
  const [{ data: authData }, { data }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("companion_subscriptions").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const row = (data as CompanionSubscription | null) ?? null;

  const regalPlanId = regalPlanIdFromMetadata(
    authData.user?.user_metadata as Record<string, unknown> | undefined
  );
  const regalTier = companionPlanForRegalPlan(regalPlanId);

  // An active student plan past `current_period_end` simply stops granting
  // access (computed, never written — plan/status columns are privileged).
  const expired = row?.status === "active" && isExpired(row);
  const studentPlanActive = Boolean(row && row.status === "active" && !expired);
  const standalonePlanId: PlanId =
    studentPlanActive && isPlanId(row?.plan_id) ? (row?.plan_id as PlanId) : "scholar";

  const planId = higherPlan(regalTier, standalonePlanId);
  const plan = getPlan(planId);
  const regalAiQuota = regalAiQuotaForPlan(regalPlanId);

  // When the Regal One allowance is at least as large as the local one, count
  // against the shared ecosystem counter so quotas stay synced across apps.
  const localQuota = plan.limits.aiRequestsPerDay;
  const regalWins =
    regalAiQuota === "unlimited" || (localQuota !== null && regalAiQuota >= localQuota);

  return {
    planId,
    limits: plan.limits,
    row,
    regalPlanId,
    regalTierName: regalTierLabel(regalPlanId),
    viaRegalOne: regalPlanId !== "free",
    viaStudentPlan: studentPlanActive && standalonePlanId !== "scholar",
    standalonePlanId: studentPlanActive ? standalonePlanId : "scholar",
    expiresAt: studentPlanActive ? row?.current_period_end ?? null : null,
    aiQuotaSource: regalWins ? "regal" : "local",
    regalAiQuota,
  };
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
  | { ok: true; remaining: number | null }
  | { ok: false; error: string; upgradeRequired?: boolean };

/** Reads today's AI usage from whichever counter is authoritative for this user. */
export async function checkAiUsage(
  supabase: SupabaseClient,
  userId: string,
  sub?: SubscriptionResolution
): Promise<UsageCheck> {
  const resolved = sub ?? (await getUserSubscription(supabase, userId));
  await ensureSubscriptionRow(supabase, userId);

  if (resolved.aiQuotaSource === "regal") {
    if (resolved.regalAiQuota === "unlimited") {
      return { ok: true, remaining: null };
    }
    const { data, error } = await supabase.rpc("regal_get_ai_usage_today");
    if (!error && typeof data === "number") {
      const used = data;
      const quota = resolved.regalAiQuota;
      if (used >= quota) {
        return {
          ok: false,
          error: `Daily Regal AI limit reached (${quota}). Upgrade for more requests.`,
          upgradeRequired: true,
        };
      }
      return { ok: true, remaining: quota - used };
    }
    if (error) console.error("[subscription] regal_get_ai_usage_today:", error.message);
    // fall through to the local counter when the shared counter is unavailable
  }

  const { limits, row } = resolved;
  if (limits.aiRequestsPerDay === null) return { ok: true, remaining: null };
  if (!row) return { ok: true, remaining: limits.aiRequestsPerDay };

  const today = todayUtc();
  const used = row.ai_requests_reset_at === today ? (row.ai_requests_today ?? 0) : 0;
  if (used >= limits.aiRequestsPerDay) {
    return {
      ok: false,
      error: `Daily Regal AI limit reached (${limits.aiRequestsPerDay}). Upgrade for more requests.`,
      upgradeRequired: true,
    };
  }
  return { ok: true, remaining: limits.aiRequestsPerDay - used };
}

/**
 * Records one AI request against the authoritative counter. For Regal One
 * users this is the shared atomic RPC (`regal_try_consume_ai_request`), which
 * is what keeps the ecosystem-wide quota honest.
 */
export async function incrementAiUsage(
  supabase: SupabaseClient,
  userId: string,
  sub?: SubscriptionResolution
): Promise<void> {
  const resolved = sub ?? (await getUserSubscription(supabase, userId));
  await ensureSubscriptionRow(supabase, userId);

  if (resolved.aiQuotaSource === "regal") {
    const { error } = await supabase.rpc("regal_try_consume_ai_request");
    if (!error) return;
    console.error("[subscription] regal_try_consume_ai_request:", error.message);
    // fall through and count locally so the request is never lost
  }

  const today = todayUtc();
  const { data: row } = await supabase
    .from("companion_subscriptions")
    .select("ai_requests_today, ai_requests_reset_at")
    .eq("user_id", userId)
    .single();

  const used = row?.ai_requests_reset_at === today ? (row.ai_requests_today ?? 0) + 1 : 1;

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

/** Today's AI usage for the profile meter — sourced from the same counter the gate uses. */
export async function getAiUsageToday(
  supabase: SupabaseClient,
  userId: string,
  sub?: SubscriptionResolution
): Promise<{ used: number; quota: number | null }> {
  const resolved = sub ?? (await getUserSubscription(supabase, userId));

  if (resolved.aiQuotaSource === "regal") {
    const { data } = await supabase.rpc("regal_get_ai_usage_today");
    const used = typeof data === "number" ? data : 0;
    return {
      used,
      quota: resolved.regalAiQuota === "unlimited" ? null : resolved.regalAiQuota,
    };
  }

  const { data: row } = await supabase
    .from("companion_subscriptions")
    .select("ai_requests_today, ai_requests_reset_at")
    .eq("user_id", userId)
    .maybeSingle();

  const today = todayUtc();
  const used = row?.ai_requests_reset_at === today ? (row?.ai_requests_today ?? 0) : 0;
  return { used, quota: resolved.limits.aiRequestsPerDay };
}

export async function checkFeatureAccess(
  supabase: SupabaseClient,
  userId: string,
  feature: keyof PlanLimits,
  sub?: SubscriptionResolution
): Promise<UsageCheck> {
  const resolved = sub ?? (await getUserSubscription(supabase, userId));
  if (planIncludesFeature(resolved.planId, feature)) {
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
  userId: string,
  sub?: SubscriptionResolution
): Promise<UsageCheck> {
  const resolved = sub ?? (await getUserSubscription(supabase, userId));
  await ensureSubscriptionRow(supabase, userId);
  const { limits, row } = resolved;

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
  const used = row.voice_sessions_reset_at === monthStart ? (row.voice_sessions_month ?? 0) : 0;
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
    row?.voice_sessions_reset_at === monthStart ? (row.voice_sessions_month ?? 0) + 1 : 1;

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

/** Activates a paid student (Paystack) plan. Free tier can never be "activated". */
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
  if (!isPlanId(planId) || planId === "scholar") {
    return { ok: false, error: "Invalid plan" };
  }

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
