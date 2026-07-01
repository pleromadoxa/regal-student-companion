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
import { SITE } from "@/lib/site";

const FEATURES = [
  {
    icon: Brain,
    title: "Regal AI everywhere",
    desc: "Gemini + Cloudflare Workers AI power 21+ tools — essays, math, research, mentor chat, and live voice tutoring.",
  },
  {
    icon: Swords,
    title: "Exam War Room",
    desc: "AI-generated day-by-day battle plans, weak-spot drills, and last-24-hour playbooks before finals.",
  },
  {
    icon: BookOpen,
    title: "Research Lab",
    desc: "Notebook LM-style source uploads, summaries, FAQ generation, and chat-with-your-materials.",
  },
  {
    icon: GraduationCap,
    title: "Continuous CV & Courses",
    desc: "Build a living CV timeline and generate course materials per subject — export-ready for applications.",
  },
  {
    icon: Cloud,
    title: "Cloud sync (R2)",
    desc: "Back up tool drafts, mentor chats, and exam plans to Cloudflare R2. Pull on any device.",
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
    desc: "Talk through problems with Regal AI in real time — perfect for math, languages, and exam review.",
  },
];

const STEPS = [
  { n: "01", title: "Sign in with Regal Mail", desc: "Use your existing @regalmail.me account — no new password to remember." },
  { n: "02", title: "Pick your plan", desc: "Start free on Scholar, upgrade via Paystack when you need more AI and cloud sync." },
  { n: "03", title: "Study smarter", desc: "Launch tools from the dashboard, sync progress to the cloud, and crush your semester." },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#08040f] text-white overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-[#08040f]/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg" />
            <span className="font-bold text-sm hidden sm:block">Regal Companion</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-regal-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-regal-purple-400/30 bg-regal-purple-500/10 text-xs font-medium text-regal-purple-200 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-regal-pink" />
                Built for Regal Mail students
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
                The academic workspace{" "}
                <span className="regal-gradient-text">powered by Regal AI</span>
              </h1>
              <p className="mt-6 text-lg text-muted max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {SITE.description} Plan essays, prep for exams, sync your progress to the cloud,
                and access 21+ student tools — all with one Regal Mail sign-in.
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
                <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Isolated companion data</span>
                <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Edge AI on Cloudflare</span>
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
      <section id="features" className="py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">Everything you need for the semester</h2>
            <p className="text-muted mt-4">
              One app replaces scattered tabs, lost notes, and last-minute panic. Regal Companion
              is your command center from syllabus week to finals.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-5 rounded-2xl glass-panel glass-panel-hover group"
              >
                <div className="w-10 h-10 rounded-xl regal-ai-gradient flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-4 sm:px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Up and running in minutes</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="relative p-6 rounded-2xl border border-white/10">
                <span className="text-5xl font-black text-regal-purple-500/20">{s.n}</span>
                <h3 className="text-lg font-bold text-white mt-2">{s.title}</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Simple, student-friendly pricing</h2>
            <p className="text-muted mt-4">
              Start free on Scholar. Upgrade anytime with Paystack — secure card payments in USD.
              Paid plans unlock cloud sync, Exam War Room, and higher AI limits.
            </p>
          </div>
          <PricingCards />
          <p className="text-center text-xs text-muted mt-8 max-w-lg mx-auto">
            Payments processed securely by Paystack. Cancel anytime. Limits reset daily (AI) or
            monthly (voice). Scholar plan requires a Regal Mail account.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center glass-panel rounded-3xl p-10 sm:p-14 border-regal-purple-400/20">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to own your semester?</h2>
          <p className="text-muted mt-3 mb-8">
            Join Regal Mail students using AI, cloud sync, and elite study tools on{" "}
            <strong className="text-white">regalcompanion.cloud</strong>.
          </p>
          <Link href="/login">
            <Button size="lg" className="gap-2">
              Create your workspace <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-white/10 text-center text-xs text-muted">
        <p>© {new Date().getFullYear()} Regal Student Companion · Part of the Regal ecosystem</p>
        <p className="mt-2">
          <a href="https://regalmail.me" className="text-regal-pink hover:underline" target="_blank" rel="noopener noreferrer">
            regalmail.me
          </a>
          {" · "}
          <a href="#pricing" className="hover:text-white">Pricing</a>
          {" · "}
          <Link href="/login" className="hover:text-white">Sign in</Link>
        </p>
      </footer>
    </div>
  );
}
