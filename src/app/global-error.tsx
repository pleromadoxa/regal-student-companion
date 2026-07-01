"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-[#08040f] text-white p-6">
        <div className="max-w-md w-full glass-panel rounded-2xl p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-300" />
          </div>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted leading-relaxed">
            Regal Student Companion hit an unexpected error. Your data is safe — try refreshing
            or return to the dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button onClick={reset}>
              <RefreshCw className="w-4 h-4" /> Try again
            </Button>
            <Link href="/dashboard">
              <Button variant="secondary">Go to dashboard</Button>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
