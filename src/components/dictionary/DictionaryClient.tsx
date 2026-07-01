"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  BookmarkCheck,
  Loader2,
  BookOpen,
  Sparkles,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchDictionaryEntry,
  getDailySuggestedWords,
  formatWordOfDayDate,
} from "@/lib/word-of-the-day";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { WordOfTheDay } from "@/components/dictionary/WordOfTheDay";
import { cn } from "@/lib/utils";
import type { DictionaryBookmark, DictionaryEntry } from "@/types";

const SEARCH_DEBOUNCE_MS = 350;
const MIN_SEARCH_LENGTH = 2;

function DictionaryContent({
  initialBookmarks,
  word,
  dateLabel,
}: {
  initialBookmarks: DictionaryBookmark[];
  word: string;
  dateLabel: string;
}) {
  const searchParams = useSearchParams();
  const initialWord = searchParams.get("word");

  const suggestedWords = useMemo(() => getDailySuggestedWords(6), []);
  const suggestionsDateLabel = formatWordOfDayDate();

  const [query, setQuery] = useState(initialWord ?? "");
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [savingWord, setSavingWord] = useState<string | null>(null);
  const [suggestedBlurbs, setSuggestedBlurbs] = useState<Record<string, string>>({});

  const lookupIdRef = useRef(0);
  const skipDebounceRef = useRef(!!initialWord);

  const lookupWord = useCallback(async (raw: string) => {
    const word = raw.trim();
    if (word.length < MIN_SEARCH_LENGTH) {
      setEntry(null);
      setError(null);
      setLoading(false);
      return;
    }

    const id = ++lookupIdRef.current;
    setLoading(true);
    setError(null);

    const result = await fetchDictionaryEntry(word);
    if (id !== lookupIdRef.current) return;

    if (result) {
      setEntry(result);
      setError(null);
    } else {
      setEntry(null);
      setError(`No definition found for "${word}"`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialWord) void lookupWord(initialWord);
  }, [initialWord, lookupWord]);

  useEffect(() => {
    let cancelled = false;

    const fromBookmarks: Record<string, string> = {};
    for (const w of suggestedWords) {
      const bm = bookmarks.find(
        (b) => b.word.toLowerCase() === w.toLowerCase()
      );
      if (bm) fromBookmarks[w] = bm.definition;
    }
    setSuggestedBlurbs(fromBookmarks);

    const missing = suggestedWords.filter((w) => !fromBookmarks[w]);
    if (missing.length === 0) return;

    void Promise.all(
      missing.map(async (w) => {
        const result = await fetchDictionaryEntry(w);
        const blurb = result?.meanings[0]?.definitions[0]?.definition;
        return blurb ? ([w, blurb] as const) : null;
      })
    ).then((results) => {
      if (cancelled) return;
      setSuggestedBlurbs((prev) => {
        const next = { ...prev };
        for (const row of results) {
          if (row) next[row[0]] = row[1];
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [suggestedWords, bookmarks]);

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setEntry(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => void lookupWord(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, lookupWord]);

  const isBookmarked = (w: string) =>
    bookmarks.some((b) => b.word.toLowerCase() === w.toLowerCase());

  const entryBookmarked = entry ? isBookmarked(entry.word) : false;

  const saveWord = async (target: DictionaryEntry) => {
    if (isBookmarked(target.word)) return;
    setSavingWord(target.word);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingWord(null);
      return;
    }

    const definition =
      target.meanings[0]?.definitions[0]?.definition ?? "No definition";
    const { data } = await supabase
      .from("companion_dictionary_bookmarks")
      .insert({
        user_id: user.id,
        word: target.word,
        definition,
        phonetic: target.phonetic ?? null,
      })
      .select()
      .single();

    if (data) setBookmarks((prev) => [data as DictionaryBookmark, ...prev]);
    setSavingWord(null);
  };

  const removeWord = async (w: string) => {
    const bm = bookmarks.find((b) => b.word.toLowerCase() === w.toLowerCase());
    if (!bm) return;
    setSavingWord(w);
    const supabase = createClient();
    await supabase
      .from("companion_dictionary_bookmarks")
      .delete()
      .eq("id", bm.id);
    setBookmarks((prev) => prev.filter((b) => b.id !== bm.id));
    setSavingWord(null);
  };

  const toggleBookmark = async () => {
    if (!entry) return;
    if (entryBookmarked) await removeWord(entry.word);
    else await saveWord(entry);
  };

  const selectSuggestedWord = (w: string) => {
    skipDebounceRef.current = true;
    setQuery(w);
    void lookupWord(w);
  };

  const quickSaveSuggested = async (w: string) => {
    if (isBookmarked(w)) {
      await removeWord(w);
      return;
    }
    setSavingWord(w);
    const result = await fetchDictionaryEntry(w);
    if (result) await saveWord(result);
    else setSavingWord(null);
  };

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        title="Dictionary"
        description="Live word lookup, daily vocabulary picks, and your personal word list"
      />

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-stretch">
        <WordOfTheDay word={word} dateLabel={dateLabel} variant="hero" />

        <Card className="flex flex-col min-h-[200px] max-h-[280px] lg:min-h-[280px] lg:max-h-[420px] border-regal-purple-400/20">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4 text-regal-purple-300" />
              My Word List
              {bookmarks.length > 0 && (
                <span className="text-muted font-normal text-sm">
                  ({bookmarks.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mt-1 pr-1">
            {bookmarks.length === 0 ? (
              <p className="text-xs text-muted leading-relaxed py-2">
                Words you save from search or Today&apos;s Picks will show up here.
              </p>
            ) : (
              <ul className="space-y-2">
                {bookmarks.map((bm) => (
                  <li
                    key={bm.id}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-regal-purple-400/25 transition-colors cursor-pointer group"
                    onClick={() => selectSuggestedWord(bm.word)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white capitalize">
                        {bm.word}
                        {bm.phonetic && (
                          <span className="text-muted font-normal font-mono ml-2 text-xs">
                            {bm.phonetic}
                          </span>
                        )}
                      </p>
                      <BookmarkCheck className="w-3.5 h-3.5 text-regal-pink shrink-0 opacity-60 group-hover:opacity-100" />
                    </div>
                    <p className="text-xs text-muted mt-1 line-clamp-2">
                      {bm.definition}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
        {/* Main search + results */}
        <div className="space-y-6 min-w-0">
          <Card>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Start typing to search…"
                className="pl-10 pr-10"
                autoComplete="off"
                spellCheck={false}
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-regal-purple-300 animate-spin" />
              )}
            </div>
            <p className="text-xs text-muted mt-2">
              Results update as you type · min {MIN_SEARCH_LENGTH} characters
            </p>
          </Card>

          {error && (
            <p className="text-sm text-red-300 text-center py-2">{error}</p>
          )}

          {entry && (
            <Card className="border-regal-purple-400/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-white capitalize tracking-tight">
                    {entry.word}
                  </h2>
                  {entry.phonetic && (
                    <p className="text-muted font-mono text-sm mt-1">
                      {entry.phonetic}
                    </p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleBookmark}
                  disabled={savingWord === entry.word}
                >
                  {entryBookmarked ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-regal-pink" /> In
                      my list
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Add to my list
                    </>
                  )}
                </Button>
              </div>
              <div className="mt-6 space-y-5">
                {entry.meanings.map((m, i) => (
                  <div
                    key={i}
                    className="pl-4 border-l-2 border-regal-purple-500/40"
                  >
                    <p className="text-xs font-bold text-regal-pink uppercase tracking-widest">
                      {m.partOfSpeech}
                    </p>
                    <ol className="mt-2 space-y-3">
                      {m.definitions.map((d, j) => (
                        <li
                          key={j}
                          className="text-sm text-white/90 leading-relaxed"
                        >
                          <span className="text-regal-purple-300 font-medium mr-2">
                            {j + 1}.
                          </span>
                          {d.definition}
                          {d.example && (
                            <p className="text-xs text-muted mt-1.5 italic pl-5 border-l border-white/10 ml-1">
                              &ldquo;{d.example}&rdquo;
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Daily suggested words sidebar */}
        <aside className="lg:sticky lg:top-6 space-y-3">
          <Card className="border-regal-purple-400/20 overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-regal-pink" />
              <h3 className="text-sm font-bold text-white">Today&apos;s Picks</h3>
            </div>
            <p className="text-[11px] text-muted mb-4 leading-relaxed">
              Six words to explore — refreshed every day
              <span className="block mt-0.5 text-white/40">{suggestionsDateLabel}</span>
            </p>
            <ul className="space-y-2">
              {suggestedWords.map((w, i) => {
                const saved = isBookmarked(w);
                const active =
                  entry?.word.toLowerCase() === w.toLowerCase();
                return (
                  <li key={w}>
                    <div
                      className={cn(
                        "flex items-start gap-2 p-2.5 rounded-xl border transition-all",
                        active
                          ? "bg-regal-purple-500/15 border-regal-purple-400/40"
                          : "bg-white/[0.03] border-white/8 hover:border-regal-purple-400/30 hover:bg-white/[0.05]"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => selectSuggestedWord(w)}
                        className="flex-1 text-left min-w-0"
                      >
                        <span className="text-[10px] font-bold text-regal-purple-300 uppercase tracking-wider">
                          {i + 1}
                        </span>
                        <p className="text-sm font-semibold text-white capitalize">
                          {w}
                        </p>
                        {suggestedBlurbs[w] ? (
                          <p className="text-[11px] text-muted mt-1 line-clamp-2 leading-snug">
                            {suggestedBlurbs[w]}
                          </p>
                        ) : (
                          <div className="h-3 w-[85%] shimmer rounded mt-1.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void quickSaveSuggested(w)}
                        disabled={savingWord === w}
                        title={saved ? "Remove from list" : "Add to my list"}
                        className={cn(
                          "p-1.5 rounded-lg border transition-colors shrink-0",
                          saved
                            ? "border-regal-pink/30 bg-regal-pink/10 text-regal-pink"
                            : "border-white/10 text-muted hover:text-white hover:border-regal-purple-400/40"
                        )}
                      >
                        {savingWord === w ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : saved ? (
                          <BookmarkCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function DictionaryClient({
  initialBookmarks,
  word,
  dateLabel,
}: {
  initialBookmarks: DictionaryBookmark[];
  word: string;
  dateLabel: string;
}) {
  return (
    <Suspense fallback={null}>
      <DictionaryContent
        initialBookmarks={initialBookmarks}
        word={word}
        dateLabel={dateLabel}
      />
    </Suspense>
  );
}
