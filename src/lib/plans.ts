import { USER_FACING, REGAL_CLOUD_SHORT } from "@/lib/branding";

export type PlanId = "scholar" | "graduate" | "campus";

export type PlanLimits = {
  aiRequestsPerDay: number;
  voiceSessionsPerMonth: number;
  cloudSync: boolean;
  examWarRoom: boolean;
  researchLab: boolean;
  liveVoiceTutor: boolean;
  continuousCvExport: boolean;
  studyCirclesUnlimited: boolean;
  priorityAi: boolean;
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
    limits: {
      aiRequestsPerDay: 25,
      voiceSessionsPerMonth: 0,
      cloudSync: false,
      examWarRoom: false,
      researchLab: true,
      liveVoiceTutor: false,
      continuousCvExport: false,
      studyCirclesUnlimited: false,
      priorityAi: false,
    },
    features: [
      "25 Regal AI requests per day",
      "Tasks, calendar & focus timer",
      "Dictionary & flashcards",
      "Research Lab (basic)",
      "Student tools hub",
    ],
  },
  graduate: {
    id: "graduate",
    name: "Graduate",
    tagline: "Power tools for serious semesters",
    priceLabel: "$9",
    priceSubtext: `per month · ${USER_FACING.securePayments.toLowerCase()}`,
    amountCents: 900,
    currency: "USD",
    cta: "Upgrade to Graduate",
    highlighted: true,
    limits: {
      aiRequestsPerDay: 200,
      voiceSessionsPerMonth: 30,
      cloudSync: true,
      examWarRoom: true,
      researchLab: true,
      liveVoiceTutor: true,
      continuousCvExport: true,
      studyCirclesUnlimited: true,
      priorityAi: false,
    },
    features: [
      "200 Regal AI requests per day",
      REGAL_CLOUD_SHORT,
      "Exam War Room battle plans",
      "Live voice tutor (30 sessions/mo)",
      "Continuous CV & course export",
      "Unlimited study circles",
    ],
  },
  campus: {
    id: "campus",
    name: "Campus",
    tagline: "Everything — for top performers",
    priceLabel: "$19",
    priceSubtext: `per month · ${USER_FACING.securePayments.toLowerCase()}`,
    amountCents: 1900,
    currency: "USD",
    cta: "Go Campus Elite",
    limits: {
      aiRequestsPerDay: 500,
      voiceSessionsPerMonth: 120,
      cloudSync: true,
      examWarRoom: true,
      researchLab: true,
      liveVoiceTutor: true,
      continuousCvExport: true,
      studyCirclesUnlimited: true,
      priorityAi: true,
    },
    features: [
      "500 Regal AI requests per day",
      USER_FACING.priorityAi,
      "120 live voice sessions per month",
      "Full cloud sync & file storage",
      "Exam War Room + Regal Mentor",
      "All flagship tools unlocked",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["scholar", "graduate", "campus"];

export function getPlan(planId: string | null | undefined): PricingPlan {
  if (planId && planId in PLANS) return PLANS[planId as PlanId];
  return PLANS.scholar;
}

export function planIncludesFeature(
  planId: PlanId,
  feature: keyof PlanLimits
): boolean {
  const value = PLANS[planId].limits[feature];
  return typeof value === "boolean" ? value : value > 0;
}

export const FEATURE_GATE_MESSAGES: Partial<Record<keyof PlanLimits, string>> = {
  cloudSync: "Cloud sync requires Graduate or Campus. Upgrade in Profile → Plans.",
  examWarRoom: "Exam War Room is a Graduate+ feature. Upgrade to unlock battle plans.",
  liveVoiceTutor: "Live voice tutor requires Graduate or Campus.",
  continuousCvExport: "CV export is available on Graduate and Campus plans.",
  priorityAi: "Priority AI is a Campus plan feature.",
};
