"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  REGAL_MAIL_DOMAIN,
  REGAL_MAIL_WEB_URL,
  isRegalMailEmail,
  normalizeRegalMailInput,
  regalMailRedirectUrl,
} from "@/lib/regal-mail";
import {
  AuthDivider,
  InputGroup,
  PasswordInputGroup,
} from "@/components/auth/AuthShell";
import { AuthSecurityFooter } from "@/components/auth/AuthSecurityFooter";

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

export function LoginForm() {
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
    <div className="w-full max-w-xl space-y-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-white/40 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to home
      </Link>

      <div className="space-y-2">
        <h2 className="text-3xl font-medium tracking-tight text-white">Sign in</h2>
        <p className="text-sm text-white/40">
          Use your Regal Mail address to open your semester command center
        </p>
      </div>

      <form onSubmit={mode === "password" ? handlePasswordSignIn : handleMagicLink} className="space-y-4">
        {status && (
          <div
            role="alert"
            className={`rounded-xl border px-4 py-3 text-sm ${
              status.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {status.message}
          </div>
        )}

        <div className="flex gap-1 rounded-xl border border-white/10 bg-brand-gray p-1">
          {(
            [
              { id: "password" as const, label: "Password" },
              { id: "magic-link" as const, label: "Email link" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMode(tab.id);
                setStatus(null);
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                mode === tab.id
                  ? "bg-white text-black"
                  : "text-white/40 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <InputGroup
          id="email"
          label="Regal Mail address"
          type="email"
          name="email"
          inputMode="email"
          autoComplete={mode === "password" ? "username" : "email"}
          autoCapitalize="none"
          autoCorrect="off"
          required
          placeholder={`you@${REGAL_MAIL_DOMAIN}`}
          helperText={
            email && !emailValid
              ? `Only @${REGAL_MAIL_DOMAIN} addresses can sign in.`
              : `Same account as ${REGAL_MAIL_DOMAIN}`
          }
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {mode === "password" ? (
          <PasswordInputGroup
            id="password"
            label="Password"
            placeholder="Your Regal Mail password"
            helperText="Minimum 8 characters."
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        ) : (
          <p className="text-xs text-white/40">
            We&apos;ll email you a one-time link - no password needed.
          </p>
        )}

        <button
          type="submit"
          disabled={
            loading || !emailValid || (mode === "password" && !password.trim())
          }
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-white text-base font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading
            ? "Signing in..."
            : mode === "password"
              ? "Sign in with Regal Mail"
              : "Email me a sign-in link"}
        </button>

        <div className="flex justify-end">
          <a
            href={REGAL_MAIL_WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/40 transition-colors hover:text-white"
          >
            Forgot password?
          </a>
        </div>
      </form>

      <AuthDivider />

      <p className="text-center text-sm text-white/40">
        New to Regal Companion?{" "}
        <a
          href={REGAL_MAIL_WEB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-white transition-colors hover:text-white/70"
        >
          Create your Regal Mail account
        </a>
      </p>

      <p className="text-center text-[11px] leading-relaxed text-white/40">
        By signing in you agree to our{" "}
        <Link href="/legal/terms" className="underline-offset-2 hover:text-white hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="underline-offset-2 hover:text-white hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <AuthSecurityFooter />
    </div>
  );
}
