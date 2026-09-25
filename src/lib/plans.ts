import { USER_FACING, REGAL_CLOUD_SHORT } from "@/lib/branding";
import {
  dailyAiQuotaForPlan,
  regalTierLabel,
  type RegalPlanId,
} from "@/lib/regal-one";

/**
 * Student Companion plan catalog — synced with Regal One (regalmesh.com/regal-one).
 *
 * Every tier here mirrors a Regal One tier 1:1:
 *
 *   Scholar  ⇢ Regal One · Free      $0      20 AI/day
 *   Graduate ⇢ Regal One · Plus      $4.99   200 AI/day
 *   Campus   ⇢ Regal One · Premium   $12.99  unlimited AI
 *   Ultra    ⇢ Regal One · Ultra     $24.99  unlimited AI + priority model
 *
 * Users are entitled two ways (hybrid):
 *  1. Regal One — `regal_plan` on the shared @regalmail.me account (auto-detected)
 *  2. Student plan — Paystack purchase stored in `companion_subscriptions`
 * The higher of the two always wins, so nobody loses access they paid for.
 */

export type PlanId = "scholar" | "graduate" | "campus" | "ultra";

export type PlanLimits = {
  /** null = unlimited (Campus & Ultra, mirroring Regal One Premium/Ultra). */
  aiRequestsPerDay: number | null;
  voiceSessionsPerMonth: number;
  cloudSync: boolean;
  examWarRoom: boolean;
  researchLab: boolean;
  /** Research briefings & timelines — paid tiers only (Scholar gets "basic"). */
  researchLabAdvanced: boolean;
  liveVoiceTutor: boolean;
  continuousCvExport: boolean;
  studyCirclesUnlimited: boolean;
  /** Owned study circles allowed when `studyCirclesUnlimited` is false. */
  maxStudyCircles: number | null;
  priorityAi: boolean;
  /** Ultra: premium model path first + larger output budget. */
  priorityModel: boolean;
};

export type PricingPlan = {
  id: PlanId;
  name: string;
  tagline: string;
  priceLabel: string;
  priceSubtext: string;
  /** Paystack amount in USD cents. 0 = free */
  amountCents: number;
  currency: "USD";
  paystackPlanCode?: string;
  highlighted?: boolean;
  cta: string;
  /** Regal One tier this student plan mirrors (always shown to users). */
  regalTier: RegalPlanId;
  regalTierLabel: string;
  limits: PlanLimits;
  features: string[];
};

export const PLANS: Record<PlanId, PricingPlan> = {
  scholar: {
    id: "scholar",
    name: "Scholar",
    tagline: "Start strong — free forever",
    priceLabel: "Free",
    priceSubtext: "For every Regal Mail student",
    amountCents: 0,
    currency: "USD",
    cta: "Get started free",
    regalTier: "free",
    regalTierLabel: regalTierLabel("free"),
    limits: {
      aiRequestsPerDay: 20,
      voiceSessionsPerMonth: 0,
      cloudSync: false,
      examWarRoom: false,
      researchLab: true,
      researchLabAdvanced: false,
      liveVoiceTutor: false,
      continuousCvExport: false,
      studyCirclesUnlimited: false,
      maxStudyCircles: 3,
      priorityAi: false,
      priorityModel: false,
    },
    features: [
      "20 Regal AI requests per day",
      "Tasks, calendar & focus timer",
      "Dictionary & flashcards",
      "Research Lab (basic)",
      "Student tools hub",
      "Up to 3 study circles",
    ],
  },
  graduate: {
    id: "graduate",
    name: "Graduate",
    tagline: "Power tools for serious semesters",
    priceLabel: "$4.99",
    priceSubtext: `per month · ${USER_FACING.securePayments.toLowerCase()}`,
    amountCents: 499,
    currency: "USD",
    cta: "Upgrade to Graduate",
    highlighted: true,
    regalTier: "pro",
    regalTierLabel: regalTierLabel("pro"),
    limits: {
      aiRequestsPerDay: 200,
      voiceSessionsPerMonth: 30,
      cloudSync: true,
      examWarRoom: true,
      researchLab: true,
      researchLabAdvanced: true,
      liveVoiceTutor: true,
      continuousCvExport: true,
      studyCirclesUnlimited: true,
      maxStudyCircles: null,
      priorityAi: false,
      priorityModel: false,
    },
    features: [
      "200 Regal AI requests per day",
      REGAL_CLOUD_SHORT,
      "Exam War Room battle plans",
      "Live voice tutor (30 sessions/mo)",
      "Continuous CV & course export",
      "Unlimited study circles",
      "Everything in Regal One · Plus",
    ],
  },
  campus: {
    id: "campus",
    name: "Campus",
    tagline: "Everything — for top performers",
    priceLabel: "$12.99",
    priceSubtext: `per month · ${USER_FACING.securePayments.toLowerCase()}`,
    amountCents: 1299,
    currency: "USD",
    cta: "Go Campus Elite",
    regalTier: "vault_plus",
    regalTierLabel: regalTierLabel("vault_plus"),
    limits: {
      aiRequestsPerDay: null,
      voiceSessionsPerMonth: 120,
      cloudSync: true,
      examWarRoom: true,
      researchLab: true,
      researchLabAdvanced: true,
      liveVoiceTutor: true,
      continuousCvExport: true,
      studyCirclesUnlimited: true,
      maxStudyCircles: null,
      priorityAi: true,
      priorityModel: false,
    },
    features: [
      "Unlimited Regal AI",
      USER_FACING.priorityAi,
      "120 live voice sessions per month",
      "Full cloud sync & file storage",
      "Exam War Room + Regal Mentor",
      "All flagship tools unlocked",
      "Everything in Regal One · Premium",
    ],
  },
  ultra: {
    id: "ultra",
    name: "Ultra",
    tagline: "The complete Regal One experience",
    priceLabel: "$24.99",
    priceSubtext: `per month · ${USER_FACING.securePayments.toLowerCase()}`,
    amountCents: 2499,
    currency: "USD",
    cta: "Go Ultra",
    regalTier: "ultra",
    regalTierLabel: regalTierLabel("ultra"),
    limits: {
      aiRequestsPerDay: null,
      voiceSessionsPerMonth: 120,
      cloudSync: true,
      examWarRoom: true,
      researchLab: true,
      researchLabAdvanced: true,
      liveVoiceTutor: true,
      continuousCvExport: true,
      studyCirclesUnlimited: true,
      maxStudyCircles: null,
      priorityAi: true,
      priorityModel: true,
    },
    features: [
      "Everything in Campus",
      "Priority Regal AI model access",
      "Unlimited Regal AI across every Regal app",
      "1 TB shared Regal One storage (Mail, Cloud, Photos)",
      "Early access to new Regal features",
      "Priority support & dedicated onboarding",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["scholar", "graduate", "campus", "ultra"];

/** Higher rank = more access. Used to pick the winning tier in the hybrid model. */
export const PLAN_RANK: Record<PlanId, number> = {
  scholar: 0,
  graduate: 1,
  campus: 2,
  ultra: 3,
};

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

export function planRank(planId: PlanId): number {
  return PLAN_RANK[planId];
}

/** Returns whichever of the two tiers grants more access. */
export function higherPlan(a: PlanId, b: PlanId): PlanId {
  return planRank(a) >= planRank(b) ? a : b;
}

/** Maps a Regal One plan (from `regal_plan` metadata) onto the student tier it unlocks. */
export function companionPlanForRegalPlan(regalPlan: RegalPlanId): PlanId {
  switch (regalPlan) {
    case "pro":
    case "business_education":
      return "graduate";
    case "vault_plus":
    case "business_corporate":
    case "team":
      return "campus";
    case "ultra":
      return "ultra";
    default:
      return "scholar";
  }
}

/** Daily AI allowance a Regal One plan contributes (for display + quota sourcing). */
export function regalAiQuotaForPlan(regalPlan: RegalPlanId): number | "unlimited" {
  return dailyAiQuotaForPlan(regalPlan);
}

export function getPlan(planId: string | null | undefined): PricingPlan {
  if (planId && isPlanId(planId)) return PLANS[planId];
  return PLANS.scholar;
}

export function planIncludesFeature(
  planId: PlanId,
  feature: keyof PlanLimits
): boolean {
  const value = PLANS[planId].limits[feature];
  if (typeof value === "boolean") return value;
  if (value === null) return true; // unlimited numeric limit
  return value > 0;
}

export const FEATURE_GATE_MESSAGES: Partial<Record<keyof PlanLimits, string>> = {
  cloudSync:
    "Cloud sync requires Graduate (Regal One · Plus) or higher. Upgrade in Profile → Plans.",
  examWarRoom:
    "Exam War Room is a Graduate+ feature — included with Regal One · Plus. Upgrade to unlock battle plans.",
  researchLabAdvanced:
    "Research briefings & timelines require Graduate (Regal One · Plus) or higher.",
  liveVoiceTutor: "Live voice tutor requires Graduate (Regal One · Plus) or higher.",
  continuousCvExport: "CV export is available on Graduate, Campus and Ultra plans.",
  studyCirclesUnlimited:
    "Free plans include up to 3 study circles. Graduate and above get unlimited circles.",
  priorityAi: "Priority Regal AI routing is a Campus (Regal One · Premium) feature.",
  priorityModel: "Priority model access is an Ultra (Regal One · Ultra) feature.",
};
