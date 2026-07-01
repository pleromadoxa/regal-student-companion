"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Volume2,
  Sparkles,
  ArrowRight,
  Quote,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchDictionaryEntry } from "@/lib/word-of-the-day";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { DictionaryEntry } from "@/types";

type WordOfTheDayProps = {
  word: string;
  dateLabel: string;
  entry?: DictionaryEntry | null;
  variant?: "dashboard" | "hero";
  bookmarked?: boolean;
  onBookmarkChange?: (saved: boolean) => void;
};

export function WordOfTheDay({
  word,
  dateLabel,
  entry: initialEntry = null,
  variant = "dashboard",
  bookmarked: initialBookmarked = false,
  onBookmarkChange,
}: WordOfTheDayProps) {
  const [entry, setEntry] = useState<DictionaryEntry | null>(initialEntry);
  const [loadingDef, setLoadingDef] = useState(!initialEntry);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialEntry) return;
    let cancelled = false;
    setLoadingDef(true);
    fetchDictionaryEntry(word).then((result) => {
      if (!cancelled) {
        setEntry(result);
        setLoadingDef(false);
      }
    });
    return () => { cancelled = true; };
  }, [word, initialEntry]);

  useEffect(() => {
    if (initialBookmarked) return;
    const supabase = createClient();
    supabase
      .from("companion_dictionary_bookmarks")
      .select("id")
      .ilike("word", word)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setBookmarked(true);
      });
  }, [word, initialBookmarked]);

  const primary = entry?.meanings[0];
  const definition = primary?.definitions[0]?.definition;
  const example = primary?.definitions[0]?.example;
  const partOfSpeech = primary?.partOfSpeech;

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }, [word]);

  const toggleBookmark = async () => {
    if (!entry || !definition) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (bookmarked) {
      await supabase
        .from("companion_dictionary_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("word", entry.word);
      setBookmarked(false);
      onBookmarkChange?.(false);
    } else {
      await supabase.from("companion_dictionary_bookmarks").insert({
        user_id: user.id,
        word: entry.word,
        definition,
        phonetic: entry.phonetic ?? null,
      });
      setBookmarked(true);
      onBookmarkChange?.(true);
    }
    setSaving(false);
  };

  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl group h-full flex flex-col",
        isHero ? "min-h-[280px]" : ""
      )}
    >
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-regal-purple-500 via-regal-pink to-regal-purple-600 opacity-80 p-[1px]">
        <div className="absolute inset-[1px] rounded-2xl bg-[#0a0612]" />
      </div>

      {/* Ambient glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-regal-purple-500/20 rounded-full blur-3xl pointer-events-none wotd-glow" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-regal-pink/15 rounded-full blur-3xl pointer-events-none" />

      <div
        className={cn(
          "relative z-10 p-5 sm:p-6 flex flex-col flex-1 min-h-0",
          isHero ? "sm:p-10" : ""
        )}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-regal-purple-500/20 border border-regal-purple-400/30">
              <Sparkles className="w-3.5 h-3.5 text-regal-pink" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-regal-pink">
                Word of the Day
              </span>
            </div>
            {!isHero && (
              <span className="hidden sm:inline text-[11px] text-muted">{dateLabel}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={speak}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-muted hover:text-white hover:border-regal-purple-400/40 transition-all"
              title="Pronounce"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            {entry && (
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleBookmark}
                disabled={saving}
                className="!px-3"
              >
                {bookmarked ? (
                  <BookmarkCheck className="w-4 h-4 text-regal-pink" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {isHero && (
          <p className="text-xs text-muted mb-4">{dateLabel}</p>
        )}

        <div className={cn("flex-1 min-h-0", isHero ? "max-w-3xl" : "")}>
          {/* The word */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <h2
              className={cn(
                "font-bold text-white capitalize tracking-tight wotd-word",
                isHero ? "text-5xl sm:text-6xl lg:text-7xl" : "text-3xl sm:text-4xl"
              )}
            >
              {entry?.word ?? word}
            </h2>
            {entry?.phonetic && (
              <span
                className={cn(
                  "text-muted font-mono pb-1",
                  isHero ? "text-lg" : "text-sm"
                )}
              >
                {entry.phonetic}
              </span>
            )}
          </div>

          {partOfSpeech && (
            <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider bg-regal-pink/15 text-regal-pink border border-regal-pink/25 mb-4">
              {partOfSpeech}
            </span>
          )}

          {loadingDef ? (
            <div className="flex items-center gap-2 text-muted text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading definition…
            </div>
          ) : definition ? (
            <p
              className={cn(
                "text-white/90 leading-relaxed",
                isHero ? "text-lg sm:text-xl max-w-2xl" : "text-sm sm:text-base line-clamp-3"
              )}
            >
              {definition}
            </p>
          ) : (
            <p className="text-muted text-sm">Loading definition…</p>
          )}

          {example && isHero && (
            <div className="mt-6 flex gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/10 max-w-2xl">
              <Quote className="w-5 h-5 text-regal-purple-300 shrink-0 mt-0.5 opacity-60" />
              <p className="text-sm text-muted italic leading-relaxed">
                &ldquo;{example}&rdquo;
              </p>
            </div>
          )}

          {example && !isHero && (
            <p className="mt-3 text-xs text-muted italic line-clamp-2">
              &ldquo;{example}&rdquo;
            </p>
          )}

          {/* Extra meanings for hero */}
          {isHero && entry && entry.meanings.length > 1 && (
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              {entry.meanings.slice(1, 3).map((m, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/8"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-regal-purple-300">
                    {m.partOfSpeech}
                  </span>
                  <p className="text-sm text-white/80 mt-1.5 leading-relaxed">
                    {m.definitions[0]?.definition}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-muted">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Expand your vocabulary daily</span>
          </div>
          <Link
            href={`/dictionary?word=${encodeURIComponent(entry?.word ?? word)}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-regal-pink hover:text-white transition-colors group/link"
          >
            Explore in Dictionary
            <ArrowRight className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function WordOfTheDaySkeleton({ variant = "dashboard" }: { variant?: "dashboard" | "hero" }) {
  return (
    <div className={cn("shimmer rounded-2xl", variant === "hero" ? "h-72" : "h-48")} />
  );
}
