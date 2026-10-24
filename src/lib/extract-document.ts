/**
 * Client-side document text extraction for uploads.
 *
 * Supports PDF, DOCX, legacy DOC (best effort), and plain text — with no
 * language assumptions, so worksheets in French, Spanish, Arabic script in
 * LTR locales, etc. all come through as long as the file encodes text.
 *
 * PDF uses pdfjs-dist; DOCX is unzipped in the browser via
 * DecompressionStream (no extra dependencies).
 */

export type ExtractedDocKind = "pdf" | "docx" | "doc" | "txt" | "unknown";

export type ExtractedDocument = {
  text: string;
  kind: ExtractedDocKind;
  /** True when the text hit MAX_DOCUMENT_CHARS and was cut. */
  truncated: boolean;
  /** Total characters extracted before any truncation. */
  charCount: number;
};

/** ~20k tokens: comfortably inside Gemini's context; the Workers AI fallback
 * degrades gracefully on longer input. */
export const MAX_DOCUMENT_CHARS = 80_000;

export function detectDocKind(fileName: string, mimeType?: string): ExtractedDocKind {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "doc") return "doc";
  if (ext === "txt" || ext === "md" || ext === "text" || ext === "rtf") return "txt";
  if (mimeType?.startsWith("text/")) return "txt";
  return "unknown";
}

export function isSupportedUpload(fileName: string, mimeType?: string): boolean {
  return detectDocKind(fileName, mimeType) !== "unknown";
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

type PdfTextItem = {
  str?: string;
  transform?: number[];
  hasEOL?: boolean;
};

async function ensurePdfWorker() {
  const pdfjs = await import("pdfjs-dist");
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }
  return pdfjs;
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await ensurePdfWorker();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;

  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = (await page.getTextContent()) as { items: PdfTextItem[] };
    const lines: string[] = [];
    let currentLine: string[] = [];
    let lastY: number | null = null;

    for (const item of content.items) {
      if (typeof item.str !== "string") continue;
      const y = item.transform?.[5] ?? 0;
      // New visual line when the baseline moves more than ~2pt.
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(currentLine.join(""));
        currentLine = [];
      }
      currentLine.push(item.str);
      if (item.hasEOL) {
        lines.push(currentLine.join(""));
        currentLine = [];
        lastY = null;
        continue;
      }
      lastY = y;
    }
    if (currentLine.length) lines.push(currentLine.join(""));

    // pdfjs keeps spacing inside item strings; trim each line and drop empties.
    pages.push(lines.map((l) => l.replace(/[ \t]+$/g, "").trim()).filter(Boolean).join("\n"));
    page.cleanup?.();
  }
  await loadingTask.destroy();
  return pages.filter(Boolean).join("\n\n");
}

/* ------------------------------------------------------------------ */
/* ZIP (DOCX container)                                                */
/* ------------------------------------------------------------------ */

/** Minimal zip reader: parses the central directory, then inflates entries. */
async function readZipEntries(buf: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // Locate End Of Central Directory record (scan backwards for safety).
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66_000); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a valid document archive.");

  const entryCount = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);

  const entries = new Map<string, { method: number; compSize: number; localOffset: number }>();
  for (let i = 0; i < entryCount; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(buf.subarray(offset + 46, offset + 46 + nameLen));
    entries.set(name, { method, compSize, localOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }

  async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
    if (typeof DecompressionStream === "undefined") {
      throw new Error(
        "This browser cannot unpack .docx files. Please upload a PDF or TXT instead."
      );
    }
    const stream = new Blob([bytes as unknown as BlobPart])
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  const out = new Map<string, Uint8Array>();
  for (const [name, e] of entries) {
    if (name.endsWith("/")) continue;
    const local = e.localOffset;
    if (view.getUint32(local, true) !== 0x04034b50) continue;
    const nameLen = view.getUint16(local + 26, true);
    const extraLen = view.getUint16(local + 28, true);
    const start = local + 30 + nameLen + extraLen;
    const raw = buf.subarray(start, start + e.compSize);
    out.set(name, e.method === 0 ? raw : await inflateRaw(raw));
  }
  return out;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&");
}

function docxXmlToText(xml: string): string {
  return (
    xml
      // Paragraph and line-break boundaries first.
      .replace(/<w:p[ >][^>]*>/g, "")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<w:cr[^>]*\/>/g, "\n")
      .replace(/<w:tab[^>]*\/>/g, "\t")
      // Keep only text runs.
      .replace(/<w:t[^>]*>/g, "")
      .replace(/<\/w:t>/g, "")
      // Strip every remaining tag and any embedded drawings.
      .replace(/<[^>]+>/g, "")
      .replace(/\[\d+ chars\]/g, "")
  );
}

async function extractDocxText(file: File): Promise<string> {
  const entries = await readZipEntries(new Uint8Array(await file.arrayBuffer()));
  const docXml = entries.get("word/document.xml");
  if (!docXml) throw new Error("This .docx file is missing its document body.");

  const xml = new TextDecoder("utf-8", { fatal: false }).decode(docXml);
  return decodeXmlEntities(docxXmlToText(xml))
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Legacy DOC (Word 97-2003 binary) — best effort                      */
/* ------------------------------------------------------------------ */

/** Score how much of a string looks like natural text (letters + spaces). */
function textiness(s: string): number {
  if (!s.length) return 0;
  let good = 0;
  for (const ch of s) {
    if (/[a-zA-ZÀ-ɏͰ-῿぀-鿿]/.test(ch) || /\s/.test(ch)) good++;
    else if (/[0-9.,;:'"()\-–—[\]]/.test(ch)) good += 0.6;
  }
  return good / s.length;
}

function extractPrintableRuns(s: string): string {
  const runs = s.match(/[^\x00-\x08\x0b\x0c\x0e-\x1f]{40,}/g) ?? [];
  return runs
    .map((r) => r.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim())
    .filter((r) => r.split(/\s+/).length >= 6 && textiness(r) > 0.6)
    .join("\n\n");
}

async function extractDocText(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const latin1 = new TextDecoder("latin1").decode(buf);
  const utf16 = new TextDecoder("utf-16le", { fatal: false }).decode(buf);

  const candidates = [extractPrintableRuns(latin1), extractPrintableRuns(utf16)];
  const best = candidates.sort((a, b) => textiness(b) - textiness(a))[0];

  if (!best || best.length < 40 || textiness(best) < 0.65) {
    throw new Error(
      "This legacy .doc file could not be read reliably. Save it as .docx or PDF and upload again."
    );
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function extractDocumentText(file: File): Promise<ExtractedDocument> {
  const kind = detectDocKind(file.name, file.type);

  let text: string;
  switch (kind) {
    case "pdf":
      text = await extractPdfText(file);
      break;
    case "docx":
      text = await extractDocxText(file);
      break;
    case "doc":
      text = await extractDocText(file);
      break;
    case "txt":
      text = (await file.text()).replace(/\r\n?/g, "\n");
      break;
    default:
      throw new Error("Unsupported file type. Upload a PDF, DOCX, DOC, or TXT file.");
  }

  // Normalize newlines; keep original in-line spacing (form layouts use it).
  text = text
    .replace(/ /g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text || text.replace(/\s/g, "").length < 10) {
    throw new Error(
      kind === "pdf"
        ? "No readable text found in this PDF — it may be a scanned image. Paste the text instead."
        : "No readable text found in this file. Paste the text instead."
    );
  }

  const charCount = text.length;
  const truncated = charCount > MAX_DOCUMENT_CHARS;
  return {
    text: truncated ? text.slice(0, MAX_DOCUMENT_CHARS) : text,
    kind,
    truncated,
    charCount,
  };
}
