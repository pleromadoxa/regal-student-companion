"use client";

import Link from "next/link";
import {
  ArrowRight,
  Cloud,
  LayoutDashboard,
  Mail,
  Sparkles,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { REGAL_CLOUD, REGAL_MAIL_URL, REGAL_AI } from "@/lib/branding";

const STEPS = [
  {
    n: "01",
    icon: Mail,
    title: "Sign in with Regal Mail",
    desc: "Open Regal Mail or use your existing @regalmail.me account. One identity across the entire Regal ecosystem — no extra passwords.",
    detail: "Your profile photo and name sync automatically into Companion.",
    cta: { label: "Go to Regal Mail", href: REGAL_MAIL_URL, external: true },
  },
  {
    n: "02",
    icon: CreditCard,
    title: "Choose your plan",
    desc: "Start free on Scholar with core tools and daily Regal AI limits. Upgrade when you need Regal Cloud sync, Exam War Room, and higher AI quotas.",
    detail: "Graduate and Campus unlock voice tutoring, exports, and priority Regal AI.",
    cta: { label: "Compare plans", href: "#pricing", external: false },
  },
  {
    n: "03",
    icon: LayoutDashboard,
    title: "Launch your workspace",
    desc: "Open the dashboard — tasks, calendar, focus timer, dictionary, and 21+ student tools in one academic OS.",
    detail: "Pin flagship tools like Exam War Room, Research Lab, and Regal Mentor from the sidebar.",
    cta: { label: "Sign in free", href: "/login", external: false },
  },
  {
    n: "04",
    icon: Sparkles,
    title: `Study with ${REGAL_AI}`,
    desc: "Generate essay plans, solve math step-by-step, summarize research, prep for exams, and talk through problems with the live voice tutor on paid plans.",
    detail: "Regal AI routes intelligently for speed and quality — always review outputs before submitting work.",
    cta: null,
  },
  {
    n: "05",
    icon: Cloud,
    title: `Back up with ${REGAL_CLOUD}`,
    desc: "On Graduate and Campus, push tool drafts, mentor chats, CV entries, and exam plans to Regal Cloud. Pull on any device before a new semester or exam week.",
    detail: "Your local data stays yours — sync is manual and under your control.",
    cta: null,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="py-24 px-4 sm:px-6 bg-white/[0.02] border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-regal-pink mb-3">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            From sign-in to exam day in five steps
          </h2>
          <p className="text-muted mt-4 leading-relaxed">
            Regal Companion is built around your Regal Mail identity — set up once, study all
            semester, and sync when you need to.
          </p>
        </div>

        <div className="relative">
          <div
            className="hidden lg:block absolute left-8 top-8 bottom-8 w-px bg-gradient-to-b from-regal-purple-500/50 via-regal-pink/30 to-transparent"
            aria-hidden
          />
          <div className="space-y-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.n}
                  className="relative flex flex-col lg:flex-row gap-6 lg:gap-10 p-6 sm:p-8 rounded-2xl border border-white/10 bg-[#08040f]/60 glass-panel-hover"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="flex items-start gap-4 lg:w-72 shrink-0">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl regal-ai-gradient flex items-center justify-center shadow-lg shadow-regal-purple-500/25">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-regal-purple-300 border border-white/10">
                        {step.n}
                      </span>
                    </div>
                    <div className="lg:hidden flex-1">
                      <h3 className="text-lg font-bold text-white">{step.title}</h3>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white hidden lg:block mb-2">{step.title}</h3>
                    <p className="text-sm text-white/90 leading-relaxed">{step.desc}</p>
                    <p className="text-sm text-muted mt-2 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {step.detail}
                    </p>
                    {step.cta && (
                      <div className="mt-4">
                        {step.cta.external ? (
                          <a href={step.cta.href} target="_blank" rel="noopener noreferrer">
                            <Button variant="secondary" size="sm" className="gap-1.5">
                              {step.cta.label} <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        ) : step.cta.href.startsWith("#") ? (
                          <a href={step.cta.href}>
                            <Button variant="secondary" size="sm" className="gap-1.5">
                              {step.cta.label} <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        ) : (
                          <Link href={step.cta.href}>
                            <Button variant="secondary" size="sm" className="gap-1.5">
                              {step.cta.label} <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link href="/login">
            <Button size="lg" className="gap-2">
              Get started free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
