import type { DictionaryEntry } from "@/types";

/** Curated academic vocabulary — rotates by day of year */
export const WORD_OF_THE_DAY_POOL = [
  "ephemeral", "ubiquitous", "pragmatic", "eloquent", "diligent", "resilient",
  "ambiguous", "catalyst", "empirical", "hypothesis", "juxtapose", "meticulous",
  "nuance", "paradigm", "quintessential", "scrutinize", "synthesis", "tenacious",
  "verbose", "warrant", "aberration", "benevolent", "cacophony", "debilitate",
  "eclectic", "fastidious", "gregarious", "heuristic", "immutable", "juxtaposition",
  "kinetic", "laconic", "magnanimous", "nefarious", "obfuscate", "perfunctory",
  "quixotic", "recalcitrant", "salient", "taciturn", "unilateral", "vacillate",
  "whimsical", "zealous", "acumen", "bolster", "conundrum", "dichotomy",
  "egregious", "fortuitous", "gratuitous", "harbinger", "iconoclast", "judicious",
  "kudos", "languid", "malleable", "nonchalant", "ostensible", "precocious",
  "quagmire", "revere", "surreptitious", "truculent", "usurp", "venerable",
  "wistful", "yoke", "zenith", "alacrity", "bellicose", "capricious",
  "deference", "exacerbate", "fallacious", "garrulous", "hierarchy", "impetuous",
  "jovial", "kindle", "luminous", "maverick", "nascent", "obsequious",
  "penchant", "quell", "rhetoric", "stolid", "transient", "untenable",
  "veracity", "wane", "yearn", "abstruse", "circumspect", "disparate",
  "enervate", "fervent", "guile", "hackneyed", "inherent", "jaded",
] as const;

export function getDayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export function getTodaysWord(date = new Date()): string {
  const day = getDayOfYear(date);
  return WORD_OF_THE_DAY_POOL[day % WORD_OF_THE_DAY_POOL.length];
}

/** Six curated words that rotate daily — excludes today's Word of the Day */
export function getDailySuggestedWords(count = 6, date = new Date()): string[] {
  const day = getDayOfYear(date);
  const wotd = getTodaysWord(date);
  const words: string[] = [];
  let offset = 0;

  while (words.length < count && offset < WORD_OF_THE_DAY_POOL.length * 2) {
    const word =
      WORD_OF_THE_DAY_POOL[(day + offset * 11) % WORD_OF_THE_DAY_POOL.length];
    if (word !== wotd && !words.includes(word)) words.push(word);
    offset++;
  }

  return words;
}

export function formatWordOfDayDate(date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export async function fetchDictionaryEntry(
  word: string
): Promise<DictionaryEntry | null> {
  const key = word.trim().toLowerCase();
  if (!key) return null;

  if (typeof window !== "undefined") {
    const cached = sessionStorage.getItem(`dict:${key}`);
    if (cached) {
      try {
        return JSON.parse(cached) as DictionaryEntry;
      } catch {
        sessionStorage.removeItem(`dict:${key}`);
      }
    }
  }

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      word: string;
      phonetic?: string;
      phonetics?: { text?: string }[];
      meanings: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[];
    }>;
    const item = data[0];
    const entry: DictionaryEntry = {
      word: item.word,
      phonetic: item.phonetic ?? item.phonetics?.[0]?.text,
      meanings: item.meanings.map(
        (m: {
          partOfSpeech: string;
          definitions: { definition: string; example?: string }[];
        }) => ({
          partOfSpeech: m.partOfSpeech,
          definitions: m.definitions.slice(0, 3).map((d) => ({
            definition: d.definition,
            example: d.example,
          })),
        })
      ),
    };

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`dict:${key}`, JSON.stringify(entry));
      } catch {
        /* quota exceeded — ignore */
      }
    }

    return entry;
  } catch {
    return null;
  }
}

export async function getWordOfTheDayEntry(date = new Date()) {
  const word = getTodaysWord(date);
  const entry = await fetchDictionaryEntry(word);
  return {
    word,
    dateLabel: formatWordOfDayDate(date),
    dayOfYear: getDayOfYear(date),
    entry,
  };
}
