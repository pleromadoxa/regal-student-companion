"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  Cloud,
  GraduationCap,
  Mail,
  Mic,
  Shield,
  Sparkles,
  Swords,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { PricingCards } from "@/components/pricing/PricingCards";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { AppFooter } from "@/components/layout/AppFooter";
import { SITE } from "@/lib/site";
import {
  REGAL_AI,
  REGAL_CLOUD,
  REGAL_CLOUD_SHORT,
  REGAL_MAIL_LABEL,
  REGAL_MAIL_URL,
  USER_FACING,
} from "@/lib/branding";

const FEATURES = [
  {
    icon: Brain,
    title: "Regal AI everywhere",
    desc: `${USER_FACING.aiEverywhere} — essays, math, research, mentor chat, and live voice tutoring.`,
  },
  {
    icon: Swords,
    title: "Exam War Room",
    desc: "Regal AI-generated day-by-day battle plans, weak-spot drills, and last-24-hour playbooks before finals.",
  },
  {
    icon: BookOpen,
    title: "Research Lab",
    desc: "Upload sources, generate summaries and FAQs, and chat with your materials — all in one workspace.",
  },
  {
    icon: GraduationCap,
    title: "Continuous CV & Courses",
    desc: "Build a living CV timeline and generate course materials per subject — export-ready for applications.",
  },
  {
    icon: Cloud,
    title: REGAL_CLOUD_SHORT,
    desc: `Back up tool drafts, mentor chats, and exam plans to ${REGAL_CLOUD}. Pull on any device.`,
  },
  {
    icon: Users,
    title: "Study circles",
    desc: "Create private study groups with real-time messaging — collaborate with classmates on your terms.",
  },
  {
    icon: Calendar,
    title: "Academic OS",
    desc: "Tasks, calendar, assignments, focus timer, dictionary, leaderboard, and achievements in one shell.",
  },
  {
    icon: Mic,
    title: "Live voice tutor",
    desc: `Talk through problems with ${REGAL_AI} in real time — perfect for math, languages, and exam review.`,
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#06050b] text-white overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] backdrop-blur-xl bg-[#06050b]/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.png" alt="" width={56} height={56} className="rounded-lg shadow-lg shadow-regal-purple-500/20" />
            <span className="font-bold text-sm hidden sm:block tracking-tight">Regal Companion</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-muted">
            <a href="#features" className="hover:text-white transition-colors duration-150">Features</a>
            <a href="#how" className="hover:text-white transition-colors duration-150">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors duration-150">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={REGAL_MAIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden inline-flex"
              aria-label={REGAL_MAIL_LABEL}
            >
              <Button variant="ghost" size="sm" className="px-2">
                <Mail className="w-4 h-4" />
              </Button>
            </a>
            <a
              href={REGAL_MAIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex"
            >
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {REGAL_MAIL_LABEL}
              </Button>
            </a>
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-16 pb-24 px-4 sm:px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-regal-purple-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-regal-purple-400/20 bg-regal-purple-500/[0.08] text-xs font-medium text-regal-purple-200 mb-6">
                <Sparkles className="w-3 h-3 text-regal-pink" />
                Built for {REGAL_MAIL_LABEL} students
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight">
                The academic workspace{" "}
                <span className="regal-gradient-text">powered by {REGAL_AI}</span>
              </h1>
              <p className="mt-6 text-[15px] text-muted max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {SITE.description} Plan essays, prep for exams, sync your progress to {REGAL_CLOUD},
                and access 21+ student tools — all with one {REGAL_MAIL_LABEL} sign-in.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    Start free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <a href="#pricing">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    View plans
                  </Button>
                </a>
              </div>
              <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400" /> Isolated companion data</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-regal-pink" /> {REGAL_AI} at the edge</span>
                <RegalAIBadge />
              </div>
            </div>
            <div className="flex-1 w-full max-w-lg">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you need for the semester</h2>
            <p className="text-muted mt-4 text-[15px]">
              One app replaces scattered tabs, lost notes, and last-minute panic. Regal Companion
              is your command center from syllabus week to finals.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-5 rounded-2xl glass-panel glass-panel-hover group"
              >
                <div className="w-10 h-10 rounded-xl regal-ai-gradient flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2 text-[14px]">{title}</h3>
                <p className="text-[13px] text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HowItWorksSection />

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, student-friendly pricing</h2>
            <p className="text-muted mt-4 text-[15px]">
              Start free on Scholar. Every tier mirrors a Regal One plan — Graduate = Regal One ·
              Plus, Campus = Regal One · Premium, Ultra = Regal One · Ultra — so a Regal One
              subscription unlocks it here automatically. Upgrade anytime with{" "}
              {USER_FACING.securePayments}. Paid plans unlock {REGAL_CLOUD_SHORT}, Exam War Room,
              and higher {REGAL_AI} limits.
            </p>
          </div>
          <PricingCards />
          <p className="text-center text-xs text-muted mt-8 max-w-lg mx-auto">
            Payments processed securely. Cancel anytime. Limits reset daily ({REGAL_AI}) or
            monthly (voice). Scholar plan requires a {REGAL_MAIL_LABEL} account.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto text-center glass-panel rounded-3xl p-10 sm:p-14 border-regal-purple-400/15">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Ready to own your semester?</h2>
          <p className="text-muted mt-3 mb-8 text-[15px]">
            Join {REGAL_MAIL_LABEL} students using {REGAL_AI}, {REGAL_CLOUD}, and elite study tools on{" "}
            <strong className="text-white">regalcompanion.cloud</strong>.
          </p>
          <Link href="/login">
            <Button size="lg" className="gap-2">
              Create your workspace <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
