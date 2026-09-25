"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: (Error & { digest?: string }) | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error & { digest?: string }): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error.message, error.stack, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 mb-6">
            <AlertTriangle className="w-10 h-10 text-red-300" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-sm text-muted max-w-md mb-6">
            An unexpected error occurred. Try refreshing the page.
          </p>
          {this.state.error?.digest && (
            <p className="text-[11px] text-muted/50 mb-4 font-mono">Error ID: {this.state.error.digest}</p>
          )}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Link href="/dashboard">
              <Button variant="secondary">Dashboard</Button>
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
