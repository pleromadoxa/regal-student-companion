"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  BookOpen,
  Users,
  Trophy,
  Timer,
  FileText,
  Brain,
  LogOut,
  Menu,
  X,
  Grid3x3,
  ChevronLeft,
  Sparkles,
  Sigma,
  User,
  GraduationCap,
  FileUser,
  Crown,
  Swords,
  PenLine,
  Mail,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NAV_SECTIONS } from "@/lib/student-tools";
import { REGAL_AI_NAME } from "@/lib/regal-ai";
import { REGAL_MAIL_LABEL, REGAL_MAIL_URL } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { MobilePageTitle } from "@/components/layout/MobilePageTitle";
import type { CompanionProfile } from "@/types";

const ICONS = {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  BookOpen,
  Users,
  Trophy,
  Timer,
  FileText,
  Brain,
  Grid3x3,
  Sigma,
  User,
  GraduationCap,
  FileUser,
  Crown,
  Swords,
  PenLine,
} as const;

export function AppShell({
  profile,
  children,
}: {
  profile: CompanionProfile | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const inTool = pathname.startsWith("/tools/") && pathname !== "/tools";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const displayName =
    profile?.display_name ?? profile?.email?.split("@")[0] ?? "Student";

  const SidebarContent = () => (
    <>
      <Link href="/dashboard" className="flex items-center gap-3 px-2 mb-6 group">
        <Image
          src="/logo.png"
          alt="Regal Student Companion"
          width={57}
          height={57}
          className="rounded-xl shadow-lg shadow-regal-purple-500/20 group-hover:scale-105 transition-transform"
          priority
        />
        <div>
          <p className="text-sm font-bold text-white leading-tight">Regal Student</p>
          <p className="text-xs text-regal-pink font-medium">Companion</p>
        </div>
      </Link>

      <div className="mb-4 px-2 py-2.5 rounded-xl bg-gradient-to-r from-regal-purple-500/15 to-regal-pink/10 border border-regal-purple-400/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-regal-pink" />
          <span className="text-[11px] font-semibold text-white/90">{REGAL_AI_NAME} Ready</span>
        </div>
        <p className="text-[10px] text-muted mt-0.5 pl-5">Assignments · Research · Tools</p>
      </div>

      <a
        href={REGAL_MAIL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium text-muted hover:text-white hover:bg-white/5 border border-white/8 transition-colors"
      >
        <Mail className="w-4 h-4 shrink-0" />
        {REGAL_MAIL_LABEL}
      </a>

      <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-bold text-muted/80 uppercase tracking-widest px-3 mb-1.5">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = ICONS[item.icon as keyof typeof ICONS];
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const isRegalAI =
                  "regalAI" in item && item.regalAI === true;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all",
                      active
                        ? "bg-regal-purple-500/25 text-white border border-regal-purple-400/25 shadow-sm shadow-regal-purple-500/10"
                        : "text-muted hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0 opacity-90" />
                    <span className="truncate flex-1">{item.label}</span>
                    {isRegalAI && <RegalAIBadge className="scale-90 origin-right" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-white/10">
        <p className="px-2 mb-3 text-[10px] text-muted leading-relaxed">
          © {new Date().getFullYear()} Quantum Regal. All Rights Reserved.
        </p>
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-2 mb-3 rounded-xl transition-colors",
            pathname === "/profile"
              ? "bg-regal-purple-500/20 border border-regal-purple-400/25"
              : "hover:bg-white/5"
          )}
        >
          <ProfileAvatar
            userId={profile?.id ?? ""}
            name={displayName}
            avatarUrl={profile?.avatar_url}
            size={36}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-[11px] text-muted truncate">{profile?.email}</p>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-r border-white/10 p-4 fixed inset-y-0 left-0 bg-[#08040f] z-30">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-[280px] h-full border-r border-white/10 p-4 bg-[#08040f]">
            <button className="absolute top-4 right-4 text-muted hover:text-white" onClick={() => setMobileOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-[260px] min-w-0">
        <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-white/10 glass-panel backdrop-blur-xl">
          {inTool ? (
            <Link href="/tools" className="text-muted hover:text-white" aria-label="Back to tools">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="text-white"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg" aria-hidden />
          <div className="min-w-0 flex-1">
            <MobilePageTitle />
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</main>
      </div>
    </div>
  );
}
