"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { EducationAiScene } from "@/components/auth/EducationAiScene";

export function AuthShell() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Animated panel — desktop */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] p-8 xl:p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-regal-purple-950/80 via-[#08040f] to-[#08040f]" />
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <Image src="/logo.png" alt="" width={48} height={48} className="rounded-xl" />
            <div>
              <p className="font-bold text-white text-lg">Regal Companion</p>
              <p className="text-xs text-regal-pink">Education × AI</p>
            </div>
          </div>
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight max-w-md">
            Your academic workspace,{" "}
            <span className="regal-gradient-text">supercharged by Regal AI</span>
          </h2>
          <p className="text-muted mt-4 max-w-md text-sm leading-relaxed">
            Sign in with your Regal Mail account to unlock tasks, exam prep, research
            tools, cloud sync, and 21+ student utilities — all in one place.
          </p>
        </div>
        <div className="relative z-10 flex-1 flex items-center py-8">
          <div className="w-full max-w-lg">
            <EducationAiScene />
          </div>
        </div>
        <p className="relative z-10 text-xs text-muted">
          Trusted by Regal Mail students · Secured by Supabase Auth
        </p>
      </div>

      {/* Mobile hero strip */}
      <div className="lg:hidden relative h-48 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-regal-purple-900/50 to-regal-pink/10" />
        <div className="relative z-10 p-6 flex items-center justify-between h-full">
          <div>
            <Link href="/" className="text-xs text-muted hover:text-white flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3 h-3" /> Home
            </Link>
            <h1 className="text-xl font-bold text-white">Sign in</h1>
            <p className="text-xs text-muted mt-1">Regal Mail students only</p>
          </div>
          <Image src="/logo.png" alt="" width={56} height={56} className="rounded-xl shadow-lg" />
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[#08040f]">
        <div className="w-full max-w-md page-enter">
          <LoginForm compact />
        </div>
      </div>
    </div>
  );
}
