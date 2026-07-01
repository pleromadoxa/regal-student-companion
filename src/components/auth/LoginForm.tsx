"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, Key, Link2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  REGAL_MAIL_DOMAIN,
  REGAL_MAIL_WEB_URL,
  isRegalMailEmail,
  normalizeRegalMailInput,
  regalMailRedirectUrl,
} from "@/lib/regal-mail";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";

type AuthMode = "password" | "magic-link";

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials"))
    return "Incorrect Regal Mail email or password.";
  if (lower.includes("email not confirmed"))
    return "Confirm your Regal Mail address first, or use a magic link.";
  if (lower.includes("too many requests"))
    return "Too many attempts. Wait a moment and try again.";
  return message;
}

export function LoginForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  const normalizedEmail = normalizeRegalMailInput(email);
  const emailValid = Boolean(normalizedEmail && isRegalMailEmail(normalizedEmail));

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw new Error(mapAuthError(error.message));
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Sign-in failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: regalMailRedirectUrl("/auth/callback"),
          shouldCreateUser: true,
        },
      });
      if (error) throw new Error(mapAuthError(error.message));
      setStatus({
        type: "success",
        message: `Magic link sent to ${normalizedEmail}. Open it on this device to finish signing in.`,
      });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Could not send link",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={compact ? "w-full" : "min-h-screen flex items-center justify-center p-4"}>
      <div className="w-full max-w-md">
        {!compact && (
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Regal Student Companion"
            width={80}
            height={80}
            className="mx-auto rounded-2xl mb-4 shadow-2xl shadow-regal-purple-500/30"
          />
          <h1 className="text-3xl font-bold regal-gradient-text mb-2">
            Regal Student Companion
          </h1>
          <p className="text-muted text-sm">
            Your all-in-one academic workspace — powered by Regal Mail &{" "}
            <span className="text-regal-pink font-medium">Regal AI</span>
          </p>
          <div className="flex justify-center mt-3">
            <RegalAIBadge />
          </div>
        </div>
        )}

        {compact && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-sm text-muted">Sign in with your Regal Mail account</p>
            <div className="mt-3">
              <RegalAIBadge />
            </div>
          </div>
        )}

        <Card className={compact ? "border-regal-purple-400/20 shadow-xl shadow-regal-purple-500/10" : ""}>
          <div className="flex gap-2 mb-6 p-1 rounded-xl bg-black/30 border border-white/10">
            {(
              [
                { id: "password" as const, label: "Password", icon: Key },
                { id: "magic-link" as const, label: "Email link", icon: Link2 },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setStatus(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  mode === tab.id
                    ? "bg-regal-purple-500/30 text-white border border-regal-purple-400/30"
                    : "text-muted hover:text-white"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {status && (
            <div
              className={`mb-4 p-3 rounded-xl text-sm ${
                status.type === "error"
                  ? "bg-red-500/10 border border-red-500/30 text-red-200"
                  : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
              }`}
            >
              {status.message}
            </div>
          )}

          {mode === "password" ? (
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div>
                <Label>Regal Mail address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <Input
                    type="text"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`you@${REGAL_MAIL_DOMAIN}`}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your Regal Mail password"
                />
              </div>
              {email && !emailValid && (
                <p className="text-xs text-amber-300/90">
                  Only @{REGAL_MAIL_DOMAIN} addresses can sign in.
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !emailValid || !password.trim()}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Sign in with Regal Mail"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <Label>Regal Mail address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <Input
                    type="text"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`you@${REGAL_MAIL_DOMAIN}`}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !emailValid}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Email me a sign-in link"
                )}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-xs text-muted">
            Same account as{" "}
            <a
              href={REGAL_MAIL_WEB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-regal-pink hover:underline"
            >
              regalmail.me
            </a>
          </p>
        </Card>
      </div>
    </div>
  );
}
