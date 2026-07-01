"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  RotateCcw,
  Layers,
  BookOpen,
  Clock,
  Award,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  FolderPlus,
  GraduationCap,
  List,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  useUserId,
  ToolShell,
  ToolStat,
  ToolSection,
  ToolEmpty,
} from "@/components/tools/shared";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const MASTERED_LEVEL = 5;
const DEFAULT_DECK = "General";

type Flashcard = {
  id: string;
  user_id: string;
  front: string;
  back: string;
  deck: string;
  mastery: number;
  created_at: string;
};

type ViewMode = "manage" | "study";

function isMastered(mastery: number) {
  return mastery >= MASTERED_LEVEL;
}

function isDue(card: Flashcard) {
  return !isMastered(card.mastery);
}

function sortForStudy(a: Flashcard, b: Flashcard) {
  if (a.mastery !== b.mastery) return a.mastery - b.mastery;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

export function FlashcardsTool() {
  const { uid, ready } = useUserId();
  const supabase = createClient();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeck, setSelectedDeck] = useState<string>(DEFAULT_DECK);
  const [newDeckName, setNewDeckName] = useState("");
  const [showNewDeck, setShowNewDeck] = useState(false);

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [viewMode, setViewMode] = useState<ViewMode>("manage");
  const [studyQueue, setStudyQueue] = useState<Flashcard[]>([]);
  const [studyIdx, setStudyIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [browseIdx, setBrowseIdx] = useState(0);

  const loadCards = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const { data } = await supabase
      .from("companion_flashcards")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setCards((data as Flashcard[]) ?? []);
    setLoading(false);
  }, [uid, supabase]);

  useEffect(() => {
    if (ready && uid) loadCards();
    else if (ready) setLoading(false);
  }, [ready, uid, loadCards]);

  const decks = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cards) {
      counts.set(c.deck, (counts.get(c.deck) ?? 0) + 1);
    }
    const names = [...counts.keys()].sort((a, b) => a.localeCompare(b));
    if (!names.includes(DEFAULT_DECK)) names.unshift(DEFAULT_DECK);
    return names.map((name) => ({ name, count: counts.get(name) ?? 0 }));
  }, [cards]);

  const deckCards = useMemo(
    () => cards.filter((c) => c.deck === selectedDeck),
    [cards, selectedDeck]
  );

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deckCards;
    return deckCards.filter(
      (c) =>
        c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q)
    );
  }, [deckCards, search]);

  const stats = useMemo(() => {
    const total = cards.length;
    const due = cards.filter(isDue).length;
    const mastered = cards.filter((c) => isMastered(c.mastery)).length;
    return { total, due, mastered };
  }, [cards]);

  const currentBrowseCard = filteredCards[browseIdx] ?? null;
  const currentStudyCard = studyQueue[studyIdx] ?? null;

  useEffect(() => {
    setBrowseIdx(0);
    setSelectedIds(new Set());
  }, [selectedDeck, search]);

  useEffect(() => {
    if (browseIdx >= filteredCards.length) {
      setBrowseIdx(Math.max(0, filteredCards.length - 1));
    }
  }, [filteredCards.length, browseIdx]);

  const addCard = async () => {
    if (!uid || !front.trim()) return;
    const { data } = await supabase
      .from("companion_flashcards")
      .insert({
        user_id: uid,
        front: front.trim(),
        back: back.trim(),
        deck: selectedDeck,
        mastery: 0,
      })
      .select()
      .single();
    if (data) {
      setCards((c) => [data as Flashcard, ...c]);
      setFront("");
      setBack("");
    }
  };

  const createDeck = () => {
    const name = newDeckName.trim();
    if (!name) return;
    setSelectedDeck(name);
    setNewDeckName("");
    setShowNewDeck(false);
  };

  const deleteDeck = async (deckName: string) => {
    if (!uid) return;
    const deckCardIds = cards.filter((c) => c.deck === deckName).map((c) => c.id);
    if (deckCardIds.length > 0) {
      await supabase.from("companion_flashcards").delete().in("id", deckCardIds);
      setCards((c) => c.filter((x) => x.deck !== deckName));
    }
    if (selectedDeck === deckName) setSelectedDeck(DEFAULT_DECK);
  };

  const deleteCard = async (id: string) => {
    await supabase.from("companion_flashcards").delete().eq("id", id);
    setCards((c) => c.filter((x) => x.id !== id));
    setSelectedIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    await supabase.from("companion_flashcards").delete().in("id", ids);
    setCards((c) => c.filter((x) => !selectedIds.has(x.id)));
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCards.map((c) => c.id)));
    }
  };

  const updateMastery = async (card: Flashcard, correct: boolean) => {
    const next = correct
      ? Math.min(MASTERED_LEVEL, card.mastery + 1)
      : Math.max(0, card.mastery - 1);
    await supabase
      .from("companion_flashcards")
      .update({ mastery: next })
      .eq("id", card.id);
    setCards((c) =>
      c.map((x) => (x.id === card.id ? { ...x, mastery: next } : x))
    );
    setStudyQueue((q) =>
      q.map((x) => (x.id === card.id ? { ...x, mastery: next } : x))
    );
  };

  const startStudy = () => {
    const queue = deckCards.filter(isDue).sort(sortForStudy);
    if (queue.length === 0) return;
    setStudyQueue(queue);
    setStudyIdx(0);
    setFlipped(false);
    setViewMode("study");
  };

  const handleStudyAnswer = async (correct: boolean) => {
    const card = studyQueue[studyIdx];
    if (!card) return;
    await updateMastery(card, correct);
    setFlipped(false);
    if (studyIdx < studyQueue.length - 1) {
      setStudyIdx((i) => i + 1);
    } else {
      setViewMode("manage");
      setStudyQueue([]);
    }
  };

  const goNext = useCallback(() => {
    if (viewMode === "study" && studyQueue.length) {
      setFlipped(false);
      setStudyIdx((i) => (i + 1) % studyQueue.length);
    } else if (filteredCards.length) {
      setFlipped(false);
      setBrowseIdx((i) => (i + 1) % filteredCards.length);
    }
  }, [viewMode, studyQueue.length, filteredCards.length]);

  const goPrev = useCallback(() => {
    if (viewMode === "study" && studyQueue.length) {
      setFlipped(false);
      setStudyIdx((i) => (i - 1 + studyQueue.length) % studyQueue.length);
    } else if (filteredCards.length) {
      setFlipped(false);
      setBrowseIdx((i) => (i - 1 + filteredCards.length) % filteredCards.length);
    }
  }, [viewMode, studyQueue.length, filteredCards.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") {
        goNext();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  const activeCard = viewMode === "study" ? currentStudyCard : currentBrowseCard;
  const activeIdx = viewMode === "study" ? studyIdx : browseIdx;
  const activeTotal =
    viewMode === "study" ? studyQueue.length : filteredCards.length;

  const deckDueCount = deckCards.filter(isDue).length;

  if (!ready || loading) {
    return (
      <Card className="py-20 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-regal-purple-300 animate-spin" />
        <p className="text-sm text-muted">Loading flashcards…</p>
      </Card>
    );
  }

  if (!uid) {
    return (
      <ToolEmpty
        icon={BookOpen}
        title="Sign in required"
        description="Log in to create decks, study with spaced repetition, and track mastery."
      />
    );
  }

  const sidebar = (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-bold text-muted uppercase tracking-widest">
            Decks
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowNewDeck((s) => !s)}
            aria-label="New deck"
          >
            <FolderPlus className="w-4 h-4" />
          </Button>
        </div>
        {showNewDeck && (
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Deck name"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createDeck()}
            />
            <Button size="sm" onClick={createDeck}>
              Add
            </Button>
          </div>
        )}
        <ul className="space-y-1 max-h-[320px] overflow-y-auto">
          {decks.map(({ name, count }) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => setSelectedDeck(name)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left",
                  selectedDeck === name
                    ? "bg-regal-purple-500/25 border border-regal-purple-400/30 text-white"
                    : "text-muted hover:text-white hover:bg-white/5"
                )}
              >
                <span className="truncate font-medium">{name}</span>
                <span className="text-xs tabular-nums shrink-0 opacity-70">
                  {count}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {selectedDeck !== DEFAULT_DECK && (
          <Button
            size="sm"
            variant="danger"
            className="w-full mt-3"
            onClick={() => deleteDeck(selectedDeck)}
          >
            <Trash2 className="w-3 h-3" />
            Delete deck
          </Button>
        )}
      </Card>

      <Card className="p-4 space-y-2 text-xs text-muted">
        <p className="font-semibold text-white text-sm">Shortcuts</p>
        <p>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">
            Space
          </kbd>{" "}
          Flip card
        </p>
        <p>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">
            ←
          </kbd>{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">
            →
          </kbd>{" "}
          Navigate
        </p>
      </Card>
    </div>
  );

  return (
    <ToolShell
      stats={
        <>
          <ToolStat
            label="Total cards"
            value={stats.total}
            icon={Layers}
            accent="purple"
          />
          <ToolStat
            label="Due for review"
            value={stats.due}
            icon={Clock}
            accent="pink"
          />
          <ToolStat
            label="Mastered"
            value={stats.mastered}
            icon={Award}
            accent="emerald"
          />
        </>
      }
      sidebar={sidebar}
    >
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={viewMode === "manage" ? "primary" : "secondary"}
          onClick={() => setViewMode("manage")}
        >
          <List className="w-4 h-4" />
          Manage
        </Button>
        <Button
          size="sm"
          variant={viewMode === "study" ? "primary" : "secondary"}
          onClick={startStudy}
          disabled={deckDueCount === 0}
        >
          <GraduationCap className="w-4 h-4" />
          Study ({deckDueCount} due)
        </Button>
      </div>

      {viewMode === "study" && studyQueue.length > 0 ? (
        <ToolSection
          title="Spaced repetition"
          description="Rate yourself after flipping. Cards advance on correct or incorrect."
        >
          <FlashcardFace
            card={activeCard}
            flipped={flipped}
            idx={activeIdx}
            total={activeTotal}
            onFlip={() => setFlipped((f) => !f)}
          />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="sm" variant="secondary" onClick={goPrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setFlipped(false)}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="secondary" onClick={goNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {flipped && activeCard && (
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="secondary"
                className="border-emerald-500/30 text-emerald-200"
                onClick={() => handleStudyAnswer(true)}
              >
                <Check className="w-4 h-4" />
                Got it
              </Button>
              <Button variant="danger" onClick={() => handleStudyAnswer(false)}>
                <X className="w-4 h-4" />
                Missed it
              </Button>
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="mx-auto block"
            onClick={() => {
              setViewMode("manage");
              setStudyQueue([]);
            }}
          >
            Exit study mode
          </Button>
        </ToolSection>
      ) : cards.length === 0 ? (
        <ToolEmpty
          icon={BookOpen}
          title="No flashcards yet"
          description="Create your first deck and add cards to start studying with spaced repetition."
          action={
            <Button onClick={() => setShowNewDeck(true)}>
              <FolderPlus className="w-4 h-4" />
              Create a deck
            </Button>
          }
        />
      ) : (
        <>
          <ToolSection title="Add card" description={`Deck: ${selectedDeck}`}>
            <Card className="space-y-3">
              <div>
                <Label>Front (question)</Label>
                <Input
                  placeholder="Term or question"
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCard()}
                />
              </div>
              <div>
                <Label>Back (answer)</Label>
                <Input
                  placeholder="Definition or answer"
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCard()}
                />
              </div>
              <Button onClick={addCard} disabled={!front.trim()}>
                <Plus className="w-4 h-4" />
                Add to {selectedDeck}
              </Button>
            </Card>
          </ToolSection>

          {deckCards.length === 0 ? (
            <ToolEmpty
              icon={Layers}
              title={`No cards in ${selectedDeck}`}
              description="Add your first card to this deck above."
            />
          ) : (
            <>
              {filteredCards.length > 0 && (
                <ToolSection
                  title="Preview"
                  description="Click or press Space to flip"
                >
                  <FlashcardFace
                    card={currentBrowseCard}
                    flipped={flipped}
                    idx={browseIdx}
                    total={filteredCards.length}
                    onFlip={() => setFlipped((f) => !f)}
                  />
                  <div className="flex justify-center gap-2">
                    <Button size="sm" variant="secondary" onClick={goPrev}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setFlipped(false)}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={goNext}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </ToolSection>
              )}

              <ToolSection
                title="Card library"
                description={`${filteredCards.length} card${filteredCards.length === 1 ? "" : "s"}`}
                action={
                  selectedIds.size > 0 ? (
                    <Button size="sm" variant="danger" onClick={bulkDelete}>
                      <Trash2 className="w-3 h-3" />
                      Delete {selectedIds.size}
                    </Button>
                  ) : undefined
                }
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                  <Input
                    placeholder="Search front or back…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {filteredCards.length === 0 ? (
                  <ToolEmpty
                    icon={Search}
                    title="No matches"
                    description="Try a different search term or clear the filter."
                    action={
                      <Button size="sm" variant="secondary" onClick={() => setSearch("")}>
                        Clear search
                      </Button>
                    }
                  />
                ) : (
                  <Card className="divide-y divide-white/5 p-0 overflow-hidden">
                    <label className="flex items-center gap-3 px-4 py-2.5 text-xs text-muted cursor-pointer hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={
                          filteredCards.length > 0 &&
                          selectedIds.size === filteredCards.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-white/20"
                      />
                      Select all
                    </label>
                    <ul className="max-h-[280px] overflow-y-auto">
                      {filteredCards.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 group"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            className="mt-1 rounded border-white/20 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white truncate">{c.front}</p>
                            <p className="text-xs text-muted truncate">{c.back}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <MasteryBadge mastery={c.mastery} />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                              onClick={() => deleteCard(c.id)}
                              aria-label="Delete card"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </ToolSection>
            </>
          )}
        </>
      )}
    </ToolShell>
  );
}

function MasteryBadge({ mastery }: { mastery: number }) {
  const mastered = isMastered(mastery);
  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
        mastered
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-regal-pink/15 text-regal-pink"
      )}
    >
      {mastered ? "Mastered" : `Lv ${mastery}`}
    </span>
  );
}

function FlashcardFace({
  card,
  flipped,
  idx,
  total,
  onFlip,
}: {
  card: Flashcard | null;
  flipped: boolean;
  idx: number;
  total: number;
  onFlip: () => void;
}) {
  if (!card) return null;

  return (
    <div
      className="perspective-[1000px] w-full max-w-lg mx-auto cursor-pointer"
      onClick={onFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFlip();
        }
      }}
      aria-label={flipped ? "Show question" : "Show answer"}
    >
      <div
        className={cn(
          "relative min-h-[220px] transition-transform duration-500",
          flipped && "rotate-y-180"
        )}
        style={{ transformStyle: "preserve-3d" }}
      >
        <Card
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center backface-hidden border-regal-purple-400/25",
            "bg-gradient-to-br from-regal-purple-500/10 to-regal-pink/5"
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          <p className="text-[10px] font-bold text-regal-purple-300 uppercase tracking-widest mb-2">
            Question · {idx + 1}/{total}
          </p>
          <p className="text-xl font-medium text-white text-center px-6">
            {card.front}
          </p>
          <MasteryBadge mastery={card.mastery} />
        </Card>
        <Card
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center backface-hidden border-regal-pink/25",
            "bg-gradient-to-br from-regal-pink/10 to-regal-purple-500/5 rotate-y-180"
          )}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <p className="text-[10px] font-bold text-regal-pink uppercase tracking-widest mb-2">
            Answer
          </p>
          <p className="text-xl font-medium text-white text-center px-6">
            {card.back || "—"}
          </p>
        </Card>
      </div>
      <p className="text-center text-xs text-muted mt-3">
        Tap or press Space to flip
      </p>
    </div>
  );
}
