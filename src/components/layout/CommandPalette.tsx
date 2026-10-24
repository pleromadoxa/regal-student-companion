"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  Award,
  BookMarked,
  BookOpen,
  Brain,
  Briefcase,
  Calculator,
  Calendar,
  CalendarDays,
  CheckSquare,
  Clock,
  Crown,
  FileText,
  FileUser,
  Flame,
  GraduationCap,
  Grid3x3,
  Heart,
  HelpCircle,
  Languages,
  Layers,
  LayoutDashboard,
  Library,
  Network,
  PenLine,
  Search,
  Shield,
  ShieldCheck,
  Sigma,
  Sparkles,
  StickyNote,
  Swords,
  ScrollText,
  Trophy,
  User,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NAV_SECTIONS, STUDENT_TOOLS } from "@/lib/student-tools";

const ICONS: Record<string, LucideIcon> = {
  AlarmClock,
  Award,
  BookMarked,
  BookOpen,
  Brain,
  Briefcase,
  Calculator,
  Calendar,
  CalendarDays,
  CheckSquare,
  Clock,
  Crown,
  FileText,
  FileUser,
  Flame,
  GraduationCap,
  Grid3x3,
  Heart,
  HelpCircle,
  Languages,
  Layers,
  LayoutDashboard,
  Library,
  Network,
  PenLine,
  Shield,
  ShieldCheck,
  Sigma,
  Sparkles,
  StickyNote,
  Swords,
  ScrollText,
  Trophy,
  User,
  UserPlus,
  Users,
  Wallet,
};

type PaletteItem = {
  id: string;
  label: string;
  subtitle?: string;
  href: string;
  icon: string;
  section: "navigation" | "tools";
};

const SECTION_LABELS: Record<string, string> = {
  navigation: "Navigation",
  tools: "Student Tools",
  results: "Search results",
};

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((v) => {
      if (v) {
        setQuery("");
        setSelectedIndex(0);
      }
      return !v;
    });
  }, []);

  const items = useMemo<PaletteItem[]>(() => {
    const nav: PaletteItem[] = NAV_SECTIONS.flatMap((section) =>
      section.items.map((item) => ({
        id: `nav-${item.href}`,
        label: item.label,
        href: item.href,
        icon: item.icon,
        section: "navigation" as const,
      }))
    );
    const tools: PaletteItem[] = STUDENT_TOOLS.map((tool) => ({
      id: `tool-${tool.slug}`,
      label: tool.name,
      subtitle: tool.description,
      href: `/tools/${tool.slug}`,
      icon: tool.icon,
      section: "tools" as const,
    }));
    const seen = new Set<string>();
    return [...nav, ...tools].filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.subtitle?.toLowerCase().includes(q) ?? false) ||
        item.href.toLowerCase().includes(q)
    );
  }, [items, query]);

  const grouped = useMemo(() => {
    if (query.trim()) return [{ section: "results", items: filtered }];
    return [
      { section: "navigation", items: filtered.filter((i) => i.section === "navigation") },
      { section: "tools", items: filtered.filter((i) => i.section === "tools") },
    ].filter((g) => g.items.length > 0);
  }, [filtered, query]);

  // Render-adjust: reset the highlighted item when the query changes
  // (no setState inside an effect — keeps react-hooks/set-state-in-effect clean).
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, [toggle]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  const executeItem = useCallback(
    (item: PaletteItem) => {
      close();
      if (item.href !== pathname) router.push(item.href);
    },
    [close, pathname, router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      executeItem(filtered[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  let runningIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="cmdk-shell relative w-full max-w-xl overflow-hidden rounded-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.03] px-4">
              <Search className="size-4 shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, tools, or actions…"
                className="h-11 flex-1 border-none bg-transparent text-sm font-medium text-white placeholder:text-muted focus:ring-0 focus-visible:outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden rounded-md border border-white/[0.12] bg-white/[0.06] px-1.5 py-0.5 font-sans text-[10px] font-semibold text-muted sm:inline">
                ESC
              </kbd>
            </div>

            <div className="max-h-[min(50vh,400px)] overflow-y-auto scrollbar-none py-2">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-muted">
                  <Search className="mx-auto mb-2 size-7 opacity-40" />
                  <p className="text-sm font-medium">No results for &ldquo;{query}&rdquo;</p>
                </div>
              ) : (
                grouped.map(({ section, items: sectionItems }) => (
                  <div key={section} className="px-2">
                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted/60">
                      {SECTION_LABELS[section]}
                    </p>
                    {sectionItems.map((item) => {
                      runningIndex += 1;
                      const idx = runningIndex;
                      const selected = idx === selectedIndex;
                      const Icon = ICONS[item.icon] ?? Grid3x3;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => executeItem(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className="cmdk-item flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors"
                          data-selected={selected ? "true" : "false"}
                        >
                          <Icon
                            className={`cmdk-item-icon size-4 shrink-0 ${
                              selected ? "" : "text-muted"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{item.label}</p>
                            {item.subtitle && (
                              <p className="truncate text-xs text-muted">{item.subtitle}</p>
                            )}
                          </div>
                          {selected && (
                            <kbd className="hidden text-[10px] font-medium text-muted/70 sm:inline">
                              ↵
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider text-muted/70">
              <div className="flex gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-white/[0.12] bg-white/[0.06] px-1 py-0.5">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-white/[0.12] bg-white/[0.06] px-1 py-0.5">↵</kbd>
                  select
                </span>
              </div>
              <span>Regal Command</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
