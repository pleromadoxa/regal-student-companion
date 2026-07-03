"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X,
  Copy,
  Check,
  Loader2,
  RefreshCcw,
  Share2,
  Mail,
  MessageCircle,
  Send,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createCircleInvite, buildInviteUrl } from "@/lib/study-circles";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Props = {
  circleId: string;
  circleName: string;
  onClose: () => void;
};

const TTL_OPTIONS = [
  { label: "1 hour", hours: 1 },
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
  { label: "Never", hours: 0 },
];

export function InviteDialog({ circleId, circleName, onClose }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ttlHours, setTtlHours] = useState(168);
  const [limit, setLimit] = useState<string>("");

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const supabase = createClient();
      const parsedLimit = limit.trim() ? Math.max(1, parseInt(limit, 10) || 0) : undefined;
      const result = await createCircleInvite(supabase, circleId, {
        ttlHours,
        maxUses: parsedLimit,
      });
      setCode(result.code);
      setExpiresAt(result.expiresAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create invite");
    } finally {
      setBusy(false);
    }
  }, [circleId, ttlHours, limit]);

  useEffect(() => {
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inviteUrl = code ? buildInviteUrl(code) : "";

  const copy = () => {
    if (!inviteUrl) return;
    void navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (!inviteUrl) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `Join "${circleName}" on Regal Student Companion`,
          text: `Join my study circle "${circleName}" on Regal Student Companion.`,
          url: inviteUrl,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    copy();
  };

  const encoded = encodeURIComponent(
    `Join my Regal Student Companion study circle "${circleName}": ${inviteUrl}`
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-[#12081f] border border-white/15 shadow-2xl shadow-black/60 p-5">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Invite to study circle</h2>
            <p className="text-xs text-muted mt-0.5">Share a link — only Companion users can join.</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted font-medium">Expires</label>
            <select
              value={ttlHours}
              onChange={(e) => setTtlHours(Number(e.target.value))}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-regal-purple-400/50"
            >
              {TTL_OPTIONS.map((o) => (
                <option key={o.hours} value={o.hours} className="bg-[#12081f]">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted font-medium">Max uses</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Unlimited"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white placeholder:text-muted outline-none focus:border-regal-purple-400/50"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 text-xs text-regal-pink hover:text-white transition-colors mb-3"
        >
          <RefreshCcw className={cn("w-3 h-3", busy && "animate-spin")} />
          Regenerate link
        </button>

        <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2">
          {busy && !code ? (
            <div className="flex items-center gap-2 text-muted text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating invite...
            </div>
          ) : inviteUrl ? (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted font-medium">Invite link</p>
                <p className="text-sm text-white truncate mt-0.5">{inviteUrl}</p>
                {expiresAt && (
                  <p className="text-[10px] text-muted mt-1">
                    Expires {new Date(expiresAt).toLocaleString()}
                  </p>
                )}
              </div>
              <Button size="sm" onClick={copy} className="shrink-0">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </>
          ) : null}
        </div>

        {error && <p className="text-xs text-red-300 mt-2">{error}</p>}

        {inviteUrl && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-wider text-muted font-medium mb-2">Share via</p>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => void share()}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px]"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <a
                href={`https://wa.me/?text=${encoded}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px]"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encoded}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px]"
              >
                <Send className="w-4 h-4" />
                Telegram
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(
                  `Join "${circleName}" on Regal Companion`
                )}&body=${encoded}`}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px]"
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2 text-[11px] text-muted">
          <Users className="w-3.5 h-3.5 shrink-0" />
          Anyone with this link who is signed into Regal Student Companion can join.
        </div>
      </div>
    </div>
  );
}
