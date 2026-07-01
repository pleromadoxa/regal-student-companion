/** Strip AI artifacts and normalize markdown for student-facing content. */
export function sanitizeAIContent(raw: string): string {
  if (!raw?.trim()) return "";

  let text = raw
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2022\u2023\u2043\u2219]/g, "-")
    .replace(/\r\n/g, "\n")
    .trim();

  text = text
    .replace(/^```(?:markdown|md|text|json)?\s*\n?/gim, "")
    .replace(/\n?```\s*$/gim, "")
    .replace(/^---+$/gm, "")
    .replace(/^\*\*\*+$/gm, "");

  const aiMetaPatterns = [
    /^as an ai\b/i,
    /^as a language model\b/i,
    /^i(?:'m| am) (?:an ai|a language model)/i,
    /^certainly[!.,]?\s*/i,
    /^of course[!.,]?\s*/i,
    /^great question[!.,]?\s*/i,
    /^here(?:'s| is) (?:the|your|a)\b/i,
    /^i hope this helps/i,
    /^let me know if/i,
    /^feel free to/i,
    /^please note that/i,
  ];

  const lines = text.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (aiMetaPatterns.some((p) => p.test(trimmed))) return false;
    if (/^#{1,6}\s*(response|output|result)\s*$/i.test(trimmed)) return false;
    return true;
  });

  text = lines
    .join("\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "");

  text = text.replace(
    /([\u2600-\u27BF]|[\uD83C-\uDBFF\uDC00-\uDFFF]+|[\u2700-\u27BF])/g,
    ""
  );

  return text.trim();
}

/** Heuristic AI-detection likelihood (0-100). Lower is more human-like. */
export function estimateAiDetectionScore(text: string): number {
  if (!text.trim()) return 0;

  const sample = text.slice(0, 8000);
  const sentences = sample.split(/[.!?]+/).filter((s) => s.trim().length > 8);
  if (sentences.length === 0) return 50;

  let score = 8;

  const aiPhrases = [
    /\bfurthermore\b/gi,
    /\bmoreover\b/gi,
    /\bin conclusion\b/gi,
    /\bit is important to note\b/gi,
    /\bit's worth noting\b/gi,
    /\bdelve\b/gi,
    /\bleverage\b/gi,
    /\butilize\b/gi,
    /\bcomprehensive\b/gi,
    /\brobust\b/gi,
    /\blandscape\b/gi,
    /\btapestry\b/gi,
    /\bmultifaceted\b/gi,
    /\bin today's world\b/gi,
    /\bas an ai\b/gi,
    /\bi cannot\b/gi,
    /\bplay a crucial role\b/gi,
    /\bserves as a\b/gi,
  ];

  for (const re of aiPhrases) {
    const matches = sample.match(re);
    if (matches) score += matches.length * 4;
  }

  const lengths = sentences.map((s) => s.trim().split(/\s+/).length);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((sum, len) => sum + (len - avgLen) ** 2, 0) / lengths.length;

  if (variance < 12) score += 18;
  if (avgLen > 28) score += 10;
  if (avgLen > 35) score += 8;

  const commaDensity = (sample.match(/,/g)?.length ?? 0) / sample.length;
  if (commaDensity > 0.04) score += 6;

  const contractionCount = (sample.match(/\b\w+'(?:t|re|ve|ll|d|s)\b/gi) ?? []).length;
  if (contractionCount < 1 && sample.length > 400) score += 8;

  return Math.min(100, Math.max(0, Math.round(score)));
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
