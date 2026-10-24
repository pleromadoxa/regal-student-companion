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

const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en";
const WIKTIONARY_API = "https://en.wiktionary.org/api/rest_v1/page/definition";

/** Strip markup that Wiktionary embeds in definition text. */
function stripMarkup(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function fetchFromDictionaryApi(key: string): Promise<DictionaryEntry | null> {
  const res = await fetch(`${DICTIONARY_API}/${encodeURIComponent(key)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{
    word: string;
    phonetic?: string;
    phonetics?: { text?: string }[];
    meanings: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[];
  }>;
  const item = data[0];
  if (!item?.meanings?.length) return null;

  return {
    word: item.word,
    phonetic: item.phonetic ?? item.phonetics?.[0]?.text,
    meanings: item.meanings.slice(0, 4).map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions.slice(0, 3).map((d) => ({
        definition: stripMarkup(d.definition),
        example: d.example ? stripMarkup(d.example) : undefined,
      })),
    })),
  };
}

async function fetchFromWiktionary(key: string): Promise<DictionaryEntry | null> {
  const res = await fetch(`${WIKTIONARY_API}/${encodeURIComponent(key)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<
    string,
    { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[]
  >;
  const senses = data.en;
  if (!senses?.length) return null;

  return {
    word: key,
    meanings: senses
      .filter((s) => s.definitions?.length)
      .slice(0, 4)
      .map((s) => ({
        partOfSpeech: s.partOfSpeech,
        definitions: s.definitions.slice(0, 3).map((d) => ({
          definition: stripMarkup(d.definition),
          example: d.example ? stripMarkup(d.example) : undefined,
        })),
      })),
  };
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

  // Primary source, then Wiktionary so a third-party outage never breaks lookup.
  let entry: DictionaryEntry | null = null;
  try {
    entry = await fetchFromDictionaryApi(key);
  } catch {
    entry = null;
  }
  if (!entry) {
    try {
      entry = await fetchFromWiktionary(key);
    } catch {
      entry = null;
    }
  }
  if (!entry) return null;

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`dict:${key}`, JSON.stringify(entry));
    } catch {
      /* quota exceeded — ignore */
    }
  }

  return entry;
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
