"use client";

import { CalendarClock, CreditCard, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { USER_FACING } from "@/lib/branding";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { PricingCards } from "@/components/pricing/PricingCards";
import { PLANS, type PlanId } from "@/lib/plans";
import type { PlanLimits } from "@/lib/plans";
import type { RegalPlanId } from "@/lib/regal-one";

type ProfilePlanSectionProps = {
  planId: PlanId;
  limits: PlanLimits;
  aiUsedToday: number;
  voiceUsedMonth: number;
  /** Regal One plan on the shared account (hybrid entitlement source). */
  regalPlanId: RegalPlanId;
  regalTierName: string;
  viaRegalOne: boolean;
  viaStudentPlan: boolean;
  /** When the paid student plan reverts to free (null = no expiry). */
  expiresAt: string | null;
};

export function ProfilePlanSection({
  planId,
  limits,
  aiUsedToday,
  voiceUsedMonth,
  regalPlanId,
  regalTierName,
  viaRegalOne,
  viaStudentPlan,
  expiresAt,
}: ProfilePlanSectionProps) {
  const plan = PLANS[planId];
  const aiQuota = limits.aiRequestsPerDay;
  const aiUnlimited = aiQuota === null;
  const aiRemaining = aiUnlimited ? null : Math.max(0, (aiQuota ?? 0) - aiUsedToday);
  const voiceRemaining =
    limits.voiceSessionsPerMonth > 0
      ? Math.max(0, limits.voiceSessionsPerMonth - voiceUsedMonth)
      : 0;

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const benefitLine = (label: string, included: boolean, lockedHint?: string) => (
    <li className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className={included ? "text-emerald-300" : "text-amber-300/90"}>
        {included ? "Included" : (lockedHint ?? "Upgrade")}
      </span>
    </li>
  );

  return (
    <div className="space-y-6" id="plans">
      <Card className="border-regal-purple-400/25 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-regal-purple-500/8 via-transparent to-regal-pink/8 pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-regal-purple-300" />
            Plans & billing
          </CardTitle>
          <CardDescription>
            {USER_FACING.securePayments} — cancel anytime from your profile
          </CardDescription>
        </CardHeader>
        <div className="relative px-6 pb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full regal-ai-gradient text-white text-sm font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              {plan.name}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-xs text-white/75">
              {plan.regalTierLabel}
            </span>
            <span className="text-sm text-muted">{plan.tagline}</span>
          </div>

          {(viaRegalOne || viaStudentPlan) && (
            <ul className="space-y-1.5 text-xs">
              {viaRegalOne && (
                <li className="flex items-center gap-2 text-emerald-300/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Included with your {regalTierName} plan — synced across every Regal app
                </li>
              )}
              {viaStudentPlan && (
                <li className="flex items-center gap-2 text-white/70">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {expiryLabel ? (
                    <>Student plan active · renews or expires {expiryLabel}</>
                  ) : (
                    <>Student plan active</>
                  )}
                </li>
              )}
            </ul>
          )}
          {!viaRegalOne && !viaStudentPlan && (
            <p className="text-xs text-muted">
              You&apos;re on the free tier. Upgrade below, or connect a Regal One plan to unlock
              benefits automatically.
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/8">
              <p className="text-xs text-muted uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" /> Regal AI today
              </p>
              <p className="text-2xl font-bold text-white mt-1 tabular-nums">
                {aiUnlimited ? (
                  <span className="text-emerald-300">Unlimited</span>
                ) : (
                  <>
                    {aiRemaining}
                    <span className="text-sm font-normal text-muted"> / {aiQuota}</span>
                  </>
                )}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/8">
              <p className="text-xs text-muted uppercase tracking-wider">Voice sessions (month)</p>
              <p className="text-2xl font-bold text-white mt-1 tabular-nums">
                {limits.liveVoiceTutor ? (
                  <>
                    {voiceRemaining}
                    <span className="text-sm font-normal text-muted">
                      {" "}
                      / {limits.voiceSessionsPerMonth}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-normal text-muted">Graduate+ only</span>
                )}
              </p>
            </div>
          </div>

          <ul className="text-xs text-muted space-y-1.5 rounded-xl bg-white/[0.03] border border-white/8 p-4">
            {benefitLine("Cloud sync", limits.cloudSync, "Graduate+")}
            {benefitLine("Exam War Room", limits.examWarRoom, "Graduate+")}
            {benefitLine(
              "Advanced research (briefings & timelines)",
              limits.researchLabAdvanced,
              "Graduate+"
            )}
            {benefitLine("Continuous CV export", limits.continuousCvExport, "Graduate+")}
            {benefitLine(
              "Study circles",
              limits.studyCirclesUnlimited,
              `up to ${limits.maxStudyCircles ?? 3}`
            )}
            {benefitLine("Priority Regal AI routing", limits.priorityAi, "Campus")}
            {benefitLine("Priority model access", limits.priorityModel, "Ultra")}
          </ul>
        </div>
      </Card>

      <PricingCards authenticated currentPlanId={planId} regalPlanId={regalPlanId} />

      <p className="text-xs text-muted text-center">
        Already a Regal One subscriber? Your plan is detected automatically from your{" "}
        <Link href="https://regalmesh.com/regal-one" className="underline text-white/80" target="_blank" rel="noreferrer">
          Regal One
        </Link>{" "}
        account — no second payment needed.
      </p>
    </div>
  );
}
