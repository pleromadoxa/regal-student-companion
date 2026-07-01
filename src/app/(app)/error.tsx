"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 page-enter">
      <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 mb-6">
        <AlertTriangle className="w-10 h-10 text-red-300" />
      </div>
      <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
      <p className="text-sm text-muted max-w-md mb-6">
        We hit an unexpected error. Try again, or return to your dashboard.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={reset}>
          <RefreshCw className="w-4 h-4" /> Try again
        </Button>
        <Link href="/dashboard">
          <Button variant="secondary">
            <Home className="w-4 h-4" /> Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
