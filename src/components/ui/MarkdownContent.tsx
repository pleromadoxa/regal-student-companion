"use client";

import { cn } from "@/lib/utils";

function inlineFormat(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*")) {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else {
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-200 text-sm">
          {token.slice(1, -1)}
        </code>
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let key = 0;

  const flushList = () => {
    if (!listItems.length) return;
    const Tag = listOrdered ? "ol" : "ul";
    nodes.push(
      <Tag
        key={key++}
        className={cn(
          "my-3 space-y-1.5 text-sm text-white/85",
          listOrdered ? "list-decimal list-inside" : "list-disc list-inside"
        )}
      >
        {listItems.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {inlineFormat(item)}
          </li>
        ))}
      </Tag>
    );
    listItems = [];
    listOrdered = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    const h3 = trimmed.match(/^###\s+(.+)/);
    const h2 = trimmed.match(/^##\s+(.+)/);
    const h1 = trimmed.match(/^#\s+(.+)/);
    const bullet = trimmed.match(/^[-*]\s+(.+)/);
    const numbered = trimmed.match(/^\d+\.\s+(.+)/);

    if (h1) {
      flushList();
      nodes.push(
        <h2 key={key++} className="text-xl font-bold text-white mt-8 mb-3 first:mt-0 border-b border-white/10 pb-2">
          {inlineFormat(h1[1])}
        </h2>
      );
    } else if (h2) {
      flushList();
      nodes.push(
        <h3 key={key++} className="text-lg font-semibold text-regal-purple-200 mt-6 mb-2">
          {inlineFormat(h2[1])}
        </h3>
      );
    } else if (h3) {
      flushList();
      nodes.push(
        <h4 key={key++} className="text-base font-semibold text-white/90 mt-4 mb-1.5">
          {inlineFormat(h3[1])}
        </h4>
      );
    } else if (bullet) {
      listOrdered = false;
      listItems.push(bullet[1]);
    } else if (numbered) {
      listOrdered = true;
      listItems.push(numbered[1]);
    } else {
      flushList();
      nodes.push(
        <p key={key++} className="text-sm text-white/80 leading-relaxed my-2">
          {inlineFormat(trimmed)}
        </p>
      );
    }
  }
  flushList();

  return (
    <div className={cn("prose-invert max-w-none", className)}>
      {nodes.length ? nodes : <p className="text-muted text-sm">No content yet.</p>}
    </div>
  );
}
