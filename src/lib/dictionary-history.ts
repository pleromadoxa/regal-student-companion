/** Client-side dictionary lookup history (localStorage, no account needed). */

export type DictionaryHistoryItem = {
  word: string;
  at: number;
};

const HISTORY_KEY = "regal:dictionary:history:v1";
const HISTORY_LIMIT = 20;

export function getDictionaryHistory(): DictionaryHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DictionaryHistoryItem =>
        !!item &&
        typeof (item as DictionaryHistoryItem).word === "string" &&
        typeof (item as DictionaryHistoryItem).at === "number"
    );
  } catch {
    return [];
  }
}

/** Records a successful lookup at the front of history (deduped, capped). */
export function addDictionaryHistory(rawWord: string): DictionaryHistoryItem[] {
  const word = rawWord.trim();
  if (word.length < 2) return getDictionaryHistory();
  const next = [
    { word, at: Date.now() },
    ...getDictionaryHistory().filter(
      (item) => item.word.toLowerCase() !== word.toLowerCase()
    ),
  ].slice(0, HISTORY_LIMIT);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — history stays in-memory for this render */
  }
  return next;
}

export function clearDictionaryHistory(): void {
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

/** Compact relative label: "just now", "5m ago", "3h ago", otherwise a date. */
export function formatHistoryWhen(at: number): string {
  const diff = Date.now() - at;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Clipboard payload for a full dictionary entry (shared with copy buttons). */
export function entryToClipboardText(entry: {
  word: string;
  phonetic?: string | null;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}): string {
  const head = entry.phonetic ? `${entry.word}  ${entry.phonetic}` : entry.word;
  const lines: string[] = [head, ""];
  entry.meanings.forEach((meaning) => {
    lines.push(meaning.partOfSpeech.toUpperCase());
    meaning.definitions.forEach((definition, index) => {
      lines.push(`${index + 1}. ${definition.definition}`);
      if (definition.example) lines.push(`   e.g. "${definition.example}"`);
    });
    lines.push("");
  });
  return lines.join("\n").trim();
}
