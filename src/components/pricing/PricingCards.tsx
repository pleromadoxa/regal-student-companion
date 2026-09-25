"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  PLANS,
  PLAN_ORDER,
  companionPlanForRegalPlan,
  planRank,
  type PlanId,
} from "@/lib/plans";
import type { RegalPlanId } from "@/lib/regal-one";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type PricingCardsProps = {
  /** When true, paid plans call Paystack; otherwise link to login */
  authenticated?: boolean;
  /** Effective tier (Regal One ∨ student plan — higher wins). */
  currentPlanId?: PlanId;
  /** Regal One plan on the shared account, when present. */
  regalPlanId?: RegalPlanId;
};

export function PricingCards({
  authenticated = false,
  currentPlanId = "scholar",
  regalPlanId = "free",
}: PricingCardsProps) {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const regalTierPlan = companionPlanForRegalPlan(regalPlanId);
  const hasRegalOne = authenticated && regalPlanId !== "free";

  const startCheckout = async (planId: PlanId) => {
    if (planId === "scholar") return;
    setLoadingPlan(planId);
    setError(null);
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = (await res.json()) as { authorization_url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }
      throw new Error("No payment URL returned");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment unavailable");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div>
      {hasRegalOne && (
        <p className="text-center text-sm text-emerald-300/90 mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/25">
          Your Regal One plan is active — tiers up to{" "}
          <strong className="text-white">{PLANS[regalTierPlan].name}</strong> are already
          included, no extra payment needed.
        </p>
      )}
      {error && (
        <p className="text-center text-sm text-red-300 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          {error}
        </p>
      )}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const isCurrent = authenticated && currentPlanId === id;
          const coveredByPlan = authenticated && planRank(currentPlanId) >= planRank(id);
          const coveredByRegal =
            authenticated && planRank(regalTierPlan) >= planRank(id) && regalPlanId !== "free";
          const alreadyHave = coveredByPlan || coveredByRegal;

          return (
            <div
              key={id}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 lg:p-8 transition-all duration-300",
                plan.highlighted
                  ? "border-regal-purple-400/50 bg-gradient-to-b from-regal-purple-500/15 to-transparent shadow-2xl shadow-regal-purple-500/20 sm:scale-[1.02] lg:scale-105 z-10"
                  : "border-white/10 glass-panel glass-panel-hover"
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider regal-ai-gradient text-white flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Most popular
                </span>
              )}
              <div className="mb-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 border border-white/10 text-white/70 whitespace-nowrap">
                    {plan.regalTierLabel}
                  </span>
                </div>
                <p className="text-sm text-muted mt-1">{plan.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.priceLabel}</span>
                  {plan.amountCents > 0 && <span className="text-muted text-sm">/mo</span>}
                </div>
                <p className="text-xs text-muted mt-1">{plan.priceSubtext}</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/85">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              {id === "scholar" ? (
                <Link href={authenticated ? "/dashboard" : "/login"}>
                  <Button variant={plan.highlighted ? "primary" : "secondary"} className="w-full">
                    {authenticated && isCurrent ? "Current plan" : plan.cta}
                  </Button>
                </Link>
              ) : alreadyHave ? (
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "primary" : "secondary"}
                  disabled
                >
                  {isCurrent
                    ? "Current plan"
                    : coveredByRegal
                      ? "Included with Regal One"
                      : "Included in your plan"}
                </Button>
              ) : authenticated ? (
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "primary" : "secondary"}
                  disabled={loadingPlan === id}
                  onClick={() => startCheckout(id)}
                >
                  {loadingPlan === id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    plan.cta
                  )}
                </Button>
              ) : (
                <Link href={`/login?plan=${id}`}>
                  <Button className="w-full" variant={plan.highlighted ? "primary" : "secondary"}>
                    {plan.cta}
                  </Button>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
