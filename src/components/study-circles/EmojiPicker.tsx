"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const EMOJI_GROUPS: Record<string, string[]> = {
  Recent: [],
  Reactions: ["👍", "❤️", "🔥", "🎉", "😂", "🙌", "🤯", "👏", "💯", "✅", "❌", "🤔"],
  Study: ["📚", "📖", "✏️", "📝", "🧠", "🎓", "🏆", "⭐", "💡", "🔬", "🧪", "📐", "📏", "🖊️", "📓", "📌"],
  Faces: ["😀", "😃", "😄", "😁", "😊", "😍", "😎", "🥳", "🤩", "😇", "🙂", "😉", "😅", "😌", "🥲", "🤗", "🤨", "😐", "😑", "🙄", "😴", "🥱", "😵‍💫", "😭", "😢", "😤", "😡", "🤯", "😱"],
  Symbols: ["✨", "⚡", "💫", "🌟", "☀️", "🌙", "🌈", "🔔", "🔒", "🔓", "🔑", "🧩", "❗", "❓", "‼️", "✔️", "❤️‍🔥", "💥", "💢", "💤"],
  Objects: ["💻", "🖥️", "⌨️", "🖱️", "📱", "☎️", "🖨️", "🕹️", "🎧", "🎤", "🎬", "📷", "💾", "💿", "📀", "📼", "🎞️"],
  Food: ["☕", "🍵", "🍺", "🍎", "🍊", "🍌", "🍉", "🍇", "🍓", "🍍", "🥑", "🥦", "🥕", "🌽", "🥐", "🍞", "🧀", "🥗", "🍕", "🍔", "🌮", "🍣", "🍜", "🍰", "🍫", "🍪", "🍩", "🍦"],
  Travel: ["✈️", "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🏍️", "🚲", "🛴", "🛵", "🛺", "🚋", "🚝", "🚅", "🛫", "🛬", "🛥️", "⛵", "🚀"],
  Nature: ["🌱", "🌲", "🌳", "🌴", "🌵", "🌾", "🌻", "🌸", "🌺", "🌷", "🌹", "🥀", "🍀", "🍁", "🌍", "🌎", "🌏", "🌊", "🔥", "❄️"],
};

const RECENT_KEY = "regal-emoji-recent";

export function EmojiPicker({
  onPick,
  onClose,
  align = "left",
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
  align?: "left" | "right";
}) {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("Recent");
  const [recent, setRecent] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
      setRecent(stored.slice(0, 24));
      if (stored.length > 0) setActiveGroup("Recent");
      else setActiveGroup("Reactions");
    } catch {
      setActiveGroup("Reactions");
    }
  }, []);

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const groups = useMemo<Record<string, string[]>>(
    () => ({ ...EMOJI_GROUPS, Recent: recent }),
    [recent]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return groups[activeGroup] ?? [];
    const all = Object.values(groups).flat();
    return [...new Set(all)];
  }, [groups, activeGroup, query]);

  const handlePick = (emoji: string) => {
    onPick(emoji);
    const updated = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, 24);
    setRecent(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute bottom-14 z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl bg-[#12081f] border border-white/15 shadow-2xl shadow-black/60 p-3",
        align === "right" ? "right-0" : "left-0"
      )}
    >
      <div className="flex items-center gap-2 mb-2 px-1">
        <Search className="w-3.5 h-3.5 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emojis..."
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-muted"
          autoFocus
        />
      </div>
      <div className="flex gap-1 overflow-x-auto scrollbar-none mb-2 pb-1">
        {Object.keys(groups).map((group) => (
          <button
            key={group}
            type="button"
            onClick={() => {
              setActiveGroup(group);
              setQuery("");
            }}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors",
              activeGroup === group && !query
                ? "bg-regal-purple-500/30 text-white"
                : "text-muted hover:text-white hover:bg-white/5"
            )}
          >
            {group}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-0.5 max-h-[220px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="col-span-8 text-center text-xs text-muted py-6">No emojis yet</p>
        ) : (
          filtered.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              type="button"
              onClick={() => handlePick(emoji)}
              className="text-lg p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              {emoji}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
