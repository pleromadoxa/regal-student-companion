"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { USER_FACING } from "@/lib/branding";
import { PLANS, type PlanId } from "@/lib/plans";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [planId, setPlanId] = useState<PlanId>("graduate");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      setMessage("Missing payment reference.");
      return;
    }

    fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`)
      .then(async (res) => {
        const data = (await res.json()) as { ok?: boolean; planId?: PlanId; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Verification failed");
        setPlanId(data.planId ?? "graduate");
        setStatus("success");
      })
      .catch((e) => {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Verification failed");
      });
  }, [reference]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#08040f]">
      <div className="max-w-md w-full glass-panel rounded-2xl p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-regal-purple-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white">Confirming payment…</h1>
            <p className="text-sm text-muted mt-2">{USER_FACING.paymentPending}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white">Welcome to {PLANS[planId].name}!</h1>
            <p className="text-sm text-muted mt-2">
              Your plan is active. Enjoy {PLANS[planId].limits.aiRequestsPerDay} Regal AI requests per day
              and all {PLANS[planId].name} features.
            </p>
            <Link href="/dashboard" className="block mt-6">
              <Button className="w-full">Go to dashboard</Button>
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white">Payment issue</h1>
            <p className="text-sm text-red-200 mt-2">{message}</p>
            <Link href="/profile" className="block mt-6">
              <Button variant="secondary" className="w-full">Back to profile</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PricingCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#08040f]">
          <Loader2 className="w-8 h-8 animate-spin text-regal-purple-400" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
