"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[login error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#08040f]">
      <div className="max-w-md w-full glass-panel rounded-2xl p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Sign-in error</h1>
        <p className="text-sm text-muted mb-6">
          Something went wrong loading the sign-in page. Please try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={reset}>
            <RefreshCw className="w-4 h-4" /> Try again
          </Button>
          <Link href="/">
            <Button variant="secondary">Back to home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
