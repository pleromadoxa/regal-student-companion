"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import { STUDENT_TOOLS, getToolBySlug } from "@/lib/student-tools";
import { CATEGORY_THEMES, getToolTheme } from "@/lib/tool-themes";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  ToolHubCard,
  ToolsHubPageIntro,
  ToolsHubSectionHeader,
} from "@/components/tools/ToolHubCard";
import {
  Layers,
  Calculator,
  AlarmClock,
  CalendarDays,
  StickyNote,
  Library,
  ShieldCheck,
  Sigma,
  Languages,
  Briefcase,
  Award,
  Flame,
  Clock,
  BookMarked,
  Network,
  HelpCircle,
  Heart,
  Wallet,
  UserPlus,
  GraduationCap,
  Sparkles,
  Brain,
  FileUser,
  PenLine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StudentTool } from "@/lib/student-tools";

const ICONS: Record<string, LucideIcon> = {
  Layers,
  Calculator,
  AlarmClock,
  CalendarDays,
  StickyNote,
  Library,
  ShieldCheck,
  Sigma,
  Languages,
  Briefcase,
  Award,
  Flame,
  Clock,
  BookMarked,
  Network,
  HelpCircle,
  Heart,
  Wallet,
  UserPlus,
  GraduationCap,
  Brain,
  FileUser,
  PenLine,
};

const CATEGORY_ORDER: StudentTool["category"][] = [
  "regal-ai",
  "study",
  "planning",
  "wellness",
];

const FEATURED_TOOLS = [
  {
    slug: "my-courses",
    href: "/my-courses",
    name: "My Courses",
    description: "AI-generated lessons & materials for every subject",
    icon: "GraduationCap",
    regalAI: true,
  },
  {
    slug: "continuous-cv",
    href: "/continuous-cv",
    name: "Continuous CV",
    description: "Build your living CV & export a beautiful PDF",
    icon: "FileUser",
    regalAI: true,
  },
  {
    slug: "research",
    href: "/research",
    name: "Research Lab",
    description: "Upload sources, summarize & chat with your research",
    icon: "Brain",
    regalAI: true,
  },
] as const;

function ToolGrid({ tools }: { tools: StudentTool[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
      {tools.map((tool) => {
        const Icon = ICONS[tool.icon] ?? Sparkles;
        return (
          <ToolHubCard
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            name={tool.name}
            description={tool.description}
            icon={Icon}
            theme={getToolTheme(tool.slug)}
            regalAI={tool.regalAI}
          />
        );
      })}
    </div>
  );
}

export function ToolsHub() {
  const regalCount = STUDENT_TOOLS.filter((t) => t.regalAI).length;

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    tools: STUDENT_TOOLS.filter((t) => t.category === cat),
    theme: CATEGORY_THEMES[cat],
  })).filter((g) => g.tools.length > 0);

  return (
    <div className="page-enter">
      <ToolsHubPageIntro toolCount={STUDENT_TOOLS.length} regalCount={regalCount} />

      <ToolsHubSectionHeader
        label="Featured"
        count={FEATURED_TOOLS.length}
        chipClass="from-regal-purple-500/20 to-regal-pink/10 border-regal-purple-400/30 text-regal-purple-200"
        dotClass="bg-regal-pink"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {FEATURED_TOOLS.map((tool) => {
          const Icon = ICONS[tool.icon] ?? Sparkles;
          return (
            <ToolHubCard
              key={tool.href}
              href={tool.href}
              name={tool.name}
              description={tool.description}
              icon={Icon}
              theme={getToolTheme(tool.slug)}
              regalAI={tool.regalAI}
            />
          );
        })}
      </div>

      {byCategory.map(({ category, tools, theme }) => (
        <section key={category}>
          <ToolsHubSectionHeader
            label={theme.label}
            count={tools.length}
            chipClass={theme.chip}
            dotClass={theme.dot}
          />
          <ToolGrid tools={tools} />
        </section>
      ))}
    </div>
  );
}

const ToolView = dynamic(
  () =>
    import("./tool-views").then((m) => {
      function Renderer({ slug }: { slug: string }) {
        const View = m.TOOL_COMPONENTS[slug];
        return View ? <View /> : null;
      }
      return Renderer;
    }),
  { ssr: false, loading: () => <div className="shimmer h-48 rounded-2xl" /> }
);

export function ToolPage({ slug }: { slug: string }) {
  const tool = getToolBySlug(slug);
  if (!tool) return null;

  return (
    <div className="page-enter">
      <div className="mb-6">
        <Link href="/tools">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4" /> All tools
          </Button>
        </Link>
        <PageHeader title={tool.name} description={tool.description} regalAI={tool.regalAI} />
      </div>
      <ToolView slug={slug} />
    </div>
  );
}
