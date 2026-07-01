"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type PricingCardsProps = {
  /** When true, paid plans call Paystack; otherwise link to login */
  authenticated?: boolean;
  currentPlanId?: PlanId;
};

export function PricingCards({ authenticated = false, currentPlanId = "scholar" }: PricingCardsProps) {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      {error && (
        <p className="text-center text-sm text-red-300 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          {error}
        </p>
      )}
      <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const isCurrent = authenticated && currentPlanId === id;
          return (
            <div
              key={id}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 lg:p-8 transition-all duration-300",
                plan.highlighted
                  ? "border-regal-purple-400/50 bg-gradient-to-b from-regal-purple-500/15 to-transparent shadow-2xl shadow-regal-purple-500/20 scale-[1.02] lg:scale-105 z-10"
                  : "border-white/10 glass-panel glass-panel-hover"
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider regal-ai-gradient text-white flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Most popular
                </span>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-sm text-muted mt-1">{plan.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.priceLabel}</span>
                  {plan.amountCents > 0 && (
                    <span className="text-muted text-sm">/mo</span>
                  )}
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
              ) : authenticated ? (
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "primary" : "secondary"}
                  disabled={isCurrent || loadingPlan === id}
                  onClick={() => startCheckout(id)}
                >
                  {loadingPlan === id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    "Current plan"
                  ) : (
                    plan.cta
                  )}
                </Button>
              ) : (
                <Link href={`/login?plan=${id}`}>
                  <Button variant={plan.highlighted ? "primary" : "secondary"} className="w-full">
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
