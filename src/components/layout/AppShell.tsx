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
  Sigma,
  User,
  GraduationCap,
  FileUser,
  Crown,
  Swords,
  PenLine,
  Mail,
  Shield,
  ScrollText,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { NAV_SECTIONS } from "@/lib/student-tools";
import { REGAL_AI_NAME } from "@/lib/regal-ai";
import { REGAL_MAIL_LABEL, REGAL_MAIL_URL } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { RegalAIBadge } from "@/components/ui/RegalAIBadge";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { MobilePageTitle } from "@/components/layout/MobilePageTitle";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { WorkspaceDock } from "@/components/layout/WorkspaceDock";
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
  Shield,
  ScrollText,
} as const;

const SIDEBAR_STORAGE_KEY = "rsc_sidebar_collapsed";

/** Quick-jump destinations shown in the slim icon rail. */
const RAIL_ITEMS: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tools", icon: Grid3x3, label: "Student Tools" },
  { href: "/assignments", icon: FileText, label: "Assignments" },
  { href: "/research", icon: Brain, label: "Research Lab" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/achievements", icon: Trophy, label: "Achievement Vault" },
];

function isNavItemActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`);
}

type SidebarContentProps = {
  pathname: string;
  isAdmin: boolean;
  profile: CompanionProfile | null;
  displayName: string;
  onMobileNavigate: () => void;
  onSignOut: () => void;
  activeRailId: string;
};

// Module scope (not created during render) so the sidebar subtree keeps a
// stable identity across renders.
function SidebarContent({
  pathname,
  isAdmin,
  profile,
  displayName,
  onMobileNavigate,
  onSignOut,
  activeRailId,
}: SidebarContentProps) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
        <Link href="/dashboard" onClick={onMobileNavigate} className="flex min-w-0 items-center gap-2.5 group">
          <Image
            src="/logo.png"
            alt="Regal Student Companion"
            width={64}
            height={64}
            className="size-8 shrink-0 rounded-lg transition-transform duration-200 group-hover:scale-105"
            priority
          />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight tracking-tight text-white">
              Regal Student
            </p>
            <p className="truncate text-[11px] font-medium leading-tight text-muted">Companion</p>
          </div>
        </Link>
      </div>

      <div className="mb-3 flex shrink-0 items-center gap-2 rounded-md border border-white/[0.07] bg-white/[0.03] px-2.5 py-2">
        <span className="relative flex size-1.5 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-white/85">{REGAL_AI_NAME} Ready</p>
          <p className="truncate text-[10px] text-muted/80">Assignments · Research · Tools</p>
        </div>
      </div>

      <div className="mb-2 grid shrink-0 grid-cols-2 gap-1.5">
        <a
          href={REGAL_MAIL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-1.5 text-[11px] font-medium text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-white"
        >
          <Mail className="size-3 shrink-0" />
          {REGAL_MAIL_LABEL}
        </a>
        <Link
          href="/activity"
          onClick={onMobileNavigate}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors duration-150",
            pathname === "/activity"
              ? "border-white/[0.12] bg-white/[0.07] text-white"
              : "border-white/[0.07] bg-white/[0.03] text-muted hover:bg-white/[0.06] hover:text-white"
          )}
        >
          <ScrollText className="size-3 shrink-0" />
          Activity
        </Link>
      </div>

      {isAdmin && (
        <Link
          href="/admin"
          onClick={onMobileNavigate}
          className={cn(
            "mb-2 flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-150",
            pathname.startsWith("/admin")
              ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
              : "border-amber-500/15 bg-amber-500/[0.04] text-amber-200/70 hover:bg-amber-500/10 hover:text-amber-200"
          )}
        >
          <Shield className="size-3.5 shrink-0" />
          Admin Console
        </Link>
      )}

      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden scrollbar-none pr-0.5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted/60">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = ICONS[item.icon as keyof typeof ICONS];
                const active = isNavItemActive(pathname, item.href);
                const isRegalAI = "regalAI" in item && item.regalAI === true;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={onMobileNavigate}
                    className="ws-nav-link"
                    data-active={active ? "true" : "false"}
                  >
                    {active && (
                      <motion.span
                        layoutId={activeRailId}
                        className="ws-nav-rail"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 420, damping: 34 }
                        }
                      />
                    )}
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active ? "text-primary" : "text-muted/70 group-hover:text-muted"
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-[12.5px]">{item.label}</span>
                    {isRegalAI && <RegalAIBadge className="scale-[0.75] origin-right shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto shrink-0 border-t border-white/[0.06] pt-3">
        <Link
          href="/profile"
          onClick={onMobileNavigate}
          className={cn(
            "mb-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors duration-150",
            pathname === "/profile" ? "bg-white/[0.07]" : "hover:bg-white/[0.05]"
          )}
        >
          <ProfileAvatar
            userId={profile?.id ?? ""}
            name={displayName}
            avatarUrl={profile?.avatar_url}
            size={28}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold leading-tight text-white">{displayName}</p>
            <p className="truncate text-[10px] leading-tight text-muted">{profile?.email}</p>
          </div>
        </Link>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium text-muted transition-colors duration-150 hover:bg-white/[0.05] hover:text-white"
        >
          <LogOut className="size-3.5" />
          Sign out
        </button>
        <p className="px-2.5 pb-1 pt-2 text-[9.5px] leading-relaxed text-muted/50">
          © {new Date().getFullYear()} Spatial Regal. All Rights Reserved.
        </p>
      </div>
    </>
  );
}

export function AppShell({
  profile,
  isAdmin = false,
  children,
}: {
  profile: CompanionProfile | null;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const inTool = pathname.startsWith("/tools/") && pathname !== "/tools";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const displayName =
    profile?.display_name ?? profile?.email?.split("@")[0] ?? "Student";

  const sidebarProps: SidebarContentProps = {
    pathname,
    isAdmin,
    profile,
    displayName,
    onMobileNavigate: () => setMobileOpen(false),
    onSignOut: handleSignOut,
    activeRailId: "sidebar-active-rail",
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* ── Icon rail (Workspace-style, desktop) ─────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-12 flex-col items-center gap-1 border-r border-white/[0.06] bg-[var(--sidebar)] py-2.5 lg:flex">
        <Link
          href="/dashboard"
          className="group relative mb-1 flex size-8 shrink-0 items-center justify-center"
          aria-label="Dashboard"
        >
          <Image
            src="/logo.png"
            alt=""
            width={64}
            height={64}
            className="size-8 rounded-lg transition-transform duration-200 group-hover:scale-105"
            priority
          />
        </Link>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="group relative flex size-8 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-white"
          aria-label="Search (⌘K)"
          title="Search — ⌘K"
        >
          <Search className="size-4" />
        </button>

        <span className="my-1 h-px w-6 bg-white/[0.08]" aria-hidden />

        {RAIL_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex size-8 items-center justify-center rounded-md transition-colors duration-150",
                active
                  ? "bg-white/[0.08] text-white"
                  : "text-muted/70 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              {active && <span className="ws-nav-rail" aria-hidden />}
              <Icon className={cn("size-4", active && "text-primary")} />
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/[0.1] bg-slate-900/95 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}

        <div className="mt-auto flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="group relative flex size-8 items-center justify-center rounded-md text-muted/70 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/[0.1] bg-slate-900/95 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100">
              {collapsed ? "Expand" : "Collapse"}
            </span>
          </button>
          <Link
            href="/profile"
            className="group relative flex size-8 items-center justify-center rounded-md transition-colors duration-150 hover:bg-white/[0.06]"
            aria-label="My Profile"
          >
            <ProfileAvatar
              userId={profile?.id ?? ""}
              name={displayName}
              avatarUrl={profile?.avatar_url}
              size={26}
            />
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/[0.1] bg-slate-900/95 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100">
              {displayName}
            </span>
          </Link>
        </div>
      </aside>

      {/* ── Sidebar panel (Workspace-style, desktop) ─────────────────────── */}
      {!collapsed && (
        <aside className="fixed inset-y-0 left-12 z-30 hidden w-[232px] flex-col border-r border-white/[0.06] bg-[var(--sidebar)] px-2.5 py-2.5 lg:flex">
          <SidebarContent {...sidebarProps} />
        </aside>
      )}

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[272px] flex-col overflow-y-auto border-r border-white/[0.06] bg-[var(--sidebar)] px-2.5 py-2.5">
            <button
              className="absolute right-3 top-3 z-10 rounded-md p-1 text-muted hover:text-white"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            <SidebarContent {...sidebarProps} activeRailId="sidebar-active-rail-mobile" />
          </aside>
        </div>
      )}

      {/* ── Content column ───────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          collapsed ? "lg:ml-12" : "lg:ml-[280px]"
        )}
      >
        {/* Desktop header — Workspace OS bar: title · search · actions */}
        <header className="sticky top-0 z-30 hidden h-11 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[var(--surface)] px-4 lg:flex">
          <div className="min-w-0 shrink-0">
            <MobilePageTitle />
          </div>

          <div className="mx-auto min-w-0 max-w-xl flex-1">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="ws-search-btn flex h-8 w-full items-center gap-2.5 rounded-md pl-2.5 pr-2 text-left"
            >
              <Search className="size-4 shrink-0" />
              <span className="flex-1 truncate text-[13px]">Search</span>
              <kbd className="hidden rounded border border-white/[0.1] bg-white/[0.05] px-1.5 py-px font-sans text-[10px] text-muted md:inline">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {profile?.id && <NotificationBell userId={profile.id} />}
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-white/[0.06]"
            >
              <ProfileAvatar
                userId={profile?.id ?? ""}
                name={displayName}
                avatarUrl={profile?.avatar_url}
                size={26}
              />
              <span className="hidden max-w-[120px] truncate text-[12.5px] font-semibold text-white xl:block">
                {displayName}
              </span>
            </Link>
          </div>
        </header>

        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/[0.06] bg-[var(--surface)] px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] lg:hidden">
          {inTool ? (
            <Link href="/tools" className="text-muted hover:text-white" aria-label="Back to tools">
              <ChevronLeft className="size-5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="text-white"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
          )}
          <Image
            src="/logo.png"
            alt=""
            width={48}
            height={48}
            className="size-7 rounded-md"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <MobilePageTitle />
          </div>
          {profile?.id && <NotificationBell userId={profile.id} />}
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-7">
          {children}
          {/* breathing room so page content never hides behind the dock */}
          <div aria-hidden className="hidden h-20 md:block" />
        </main>
      </div>

      <CommandPalette />
      <WorkspaceDock />
    </div>
  );
}
