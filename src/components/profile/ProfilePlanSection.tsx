"use client";

import { CreditCard, Sparkles, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { PricingCards } from "@/components/pricing/PricingCards";
import { PLANS, type PlanId } from "@/lib/plans";
import type { PlanLimits } from "@/lib/plans";

type ProfilePlanSectionProps = {
  planId: PlanId;
  limits: PlanLimits;
  aiUsedToday: number;
  voiceUsedMonth: number;
};

export function ProfilePlanSection({
  planId,
  limits,
  aiUsedToday,
  voiceUsedMonth,
}: ProfilePlanSectionProps) {
  const plan = PLANS[planId];
  const aiRemaining = Math.max(0, limits.aiRequestsPerDay - aiUsedToday);
  const voiceRemaining =
    limits.voiceSessionsPerMonth > 0
      ? Math.max(0, limits.voiceSessionsPerMonth - voiceUsedMonth)
      : 0;

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
            Paystack powers upgrades — add keys to your environment when ready
          </CardDescription>
        </CardHeader>
        <div className="relative px-6 pb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full regal-ai-gradient text-white text-sm font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              {plan.name}
            </span>
            <span className="text-sm text-muted">{plan.tagline}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/8">
              <p className="text-xs text-muted uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" /> Regal AI today
              </p>
              <p className="text-2xl font-bold text-white mt-1 tabular-nums">
                {aiRemaining}
                <span className="text-sm font-normal text-muted"> / {limits.aiRequestsPerDay}</span>
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
          <ul className="text-xs text-muted space-y-1">
            <li>Cloud sync: {limits.cloudSync ? "Included" : "Upgrade to Graduate"}</li>
            <li>Exam War Room: {limits.examWarRoom ? "Included" : "Upgrade to Graduate"}</li>
            <li>Priority AI: {limits.priorityAi ? "Included" : "Campus plan"}</li>
          </ul>
        </div>
      </Card>

      <PricingCards authenticated currentPlanId={planId} />
    </div>
  );
}
