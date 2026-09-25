"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  BookOpen,
  Cloud,
  GraduationCap,
  Mail,
  Mic,
  Shield,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { EducationAiScene } from "@/components/auth/EducationAiScene";
import { USER_FACING, REGAL_AI, REGAL_CLOUD, REGAL_MAIL_URL } from "@/lib/branding";

const HIGHLIGHTS = [
  { icon: Sparkles, label: REGAL_AI, desc: "21+ AI-powered study tools" },
  { icon: Swords, label: "Exam War Room", desc: "Battle plans before finals" },
  { icon: Cloud, label: REGAL_CLOUD, desc: "Sync across devices" },
  { icon: Mic, label: "Regal Live", desc: "Real-time voice tutoring" },
];

export function AuthShell() {
  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-[#06050b] overflow-x-hidden">
      {/* Left — brand & preview (desktop) */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[52%] relative flex-col p-8 xl:p-12 overflow-hidden">
        <div className="absolute inset-0 auth-mesh-bg" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-br from-regal-purple-950/85 via-[#06050b]/95 to-[#06050b]" aria-hidden />

        <div className="relative z-10 flex flex-col h-full">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] text-muted hover:text-white transition-colors duration-150 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="mt-8 flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-regal-purple-500/30 to-regal-pink/20 blur-md" />
              <Image
                src="/logo.png"
                alt=""
                width={88}
                height={88}
                className="relative rounded-2xl shadow-2xl shadow-regal-purple-500/30"
                priority
              />
            </div>
            <div>
              <p className="font-bold text-white text-xl tracking-tight">Regal Companion</p>
              <p className="text-[13px] text-regal-pink font-medium">Education × {REGAL_AI}</p>
            </div>
          </div>

          <div className="mt-10 max-w-lg">
            <h1 className="text-3xl xl:text-[2.65rem] font-bold text-white leading-[1.1] tracking-tight">
              Your semester command center,{" "}
              <span className="regal-gradient-text">powered by {REGAL_AI}</span>
            </h1>
            <p className="text-muted mt-5 text-[15px] leading-relaxed">
              One Regal Mail sign-in unlocks tasks, exam prep, research, {REGAL_CLOUD}, live voice
              tutoring, and everything you need from syllabus week to finals.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 max-w-lg">
            {HIGHLIGHTS.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex gap-3 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm"
              >
                <div className="w-9 h-9 rounded-lg regal-ai-gradient flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{label}</p>
                  <p className="text-[11px] text-muted leading-snug mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 flex items-center py-8 min-h-0">
            <div className="w-full max-w-xl">
              <EducationAiScene />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted pt-4 border-t border-white/[0.06]">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              {USER_FACING.authSecured}
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-regal-pink" />
              Free Scholar plan
            </span>
            <a
              href={REGAL_MAIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors duration-150"
            >
              <Mail className="w-3.5 h-3.5" />
              regalmail.me
            </a>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden relative shrink-0 overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 auth-mesh-bg opacity-50" aria-hidden />
        <div className="relative z-10 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-white mb-3"
              >
                <ArrowLeft className="w-3 h-3" /> Home
              </Link>
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="" width={64} height={64} className="rounded-xl shadow-lg shadow-regal-purple-500/25" />
                <div>
                  <h1 className="text-lg font-bold text-white leading-tight tracking-tight">Sign in</h1>
                  <p className="text-xs text-muted mt-0.5">Regal Mail students</p>
                </div>
              </div>
            </div>
            <a
              href={REGAL_MAIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 mt-8 px-3 py-2 rounded-xl text-xs font-medium border border-white/[0.08] text-muted hover:text-white hover:border-regal-purple-400/30 transition-all duration-150"
            >
              Regal Mail
            </a>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {[
              { icon: BookOpen, text: "21+ tools" },
              { icon: GraduationCap, text: REGAL_AI },
              { icon: Cloud, text: REGAL_CLOUD },
            ].map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-white/80"
              >
                <Icon className="w-3 h-3 text-regal-pink" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col lg:justify-center relative min-h-0">
        <div className="absolute inset-0 lg:hidden auth-mesh-bg opacity-25 pointer-events-none" aria-hidden />
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 py-8 lg:py-12 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="w-full max-w-[440px] page-enter">
            <LoginForm compact />
            <p className="text-center text-[11px] text-muted mt-6 leading-relaxed px-2">
              By signing in you agree to our{" "}
              <Link
                href="/legal/terms"
                className="text-regal-purple-300 hover:text-white underline-offset-2 hover:underline"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/privacy"
                className="text-regal-purple-300 hover:text-white underline-offset-2 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
