/** Strip AI artifacts and normalize markdown for student-facing content. */
export function sanitizeAIContent(raw: string): string {
  let text = raw
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

  text = text.replace(/^```(?:markdown|md)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

  const lines = text.split("\n").filter((line) => {
    const lower = line.toLowerCase().trim();
    if (lower.startsWith("as an ai") || lower.startsWith("as a language model")) return false;
    if (/^here(?:'s| is) (?:the|your)/i.test(lower)) return false;
    return true;
  });

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
