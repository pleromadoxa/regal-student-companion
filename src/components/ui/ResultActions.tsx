"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/** Copy text to the clipboard with a short "Copied" confirmation. */
export function CopyButton({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const copy = async () => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions): fall back to a selectable textarea.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => void copy()}
      className={cn("gap-1.5", className)}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-300" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

/** Download text content as a file (defaults to .md). */
export function DownloadTextButton({
  value,
  filename = "regal-ai-result.md",
  className,
}: {
  value: string;
  filename?: string;
  className?: string;
}) {
  const download = () => {
    if (!value.trim()) return;
    const type = filename.endsWith(".txt")
      ? "text/plain;charset=utf-8"
      : "text/markdown;charset=utf-8";
    const blob = new Blob([value], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={download}
      className={cn("gap-1.5", className)}
      aria-label={`Download ${filename}`}
    >
      <Download className="w-3.5 h-3.5" />
      Download
    </Button>
  );
}

/**
 * Copy + Download pair for any generated result. Drop into a result card
 * header so every AI generation is always exportable.
 */
export function ResultActions({
  value,
  filename,
  className,
}: {
  value: string;
  filename?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <CopyButton value={value} />
      <DownloadTextButton value={value} filename={filename} />
    </div>
  );
}
