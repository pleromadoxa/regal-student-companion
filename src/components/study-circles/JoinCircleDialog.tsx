"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Search, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { parseInviteCode, previewInvite, joinCircleByCode } from "@/lib/study-circles";

export function JoinCircleDialog({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: (circleId: string) => Promise<void> | void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewInvite>>>(null);

  const code = parseInviteCode(value);

  const handlePreview = async () => {
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      const result = await previewInvite(supabase, code);
      setPreview(result);
      if (!result?.circle_id) {
        setError("Invite not found. Check the link or code and try again.");
        return;
      }
      if (!result.is_valid) {
        setError("This invite has expired, been revoked, or reached its usage limit.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not preview invite");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      const result = await joinCircleByCode(supabase, code);
      if (!result.joined || !result.circleId) {
        setError(result.message || "Could not join this study circle.");
        return;
      }
      await onJoined(result.circleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join this study circle.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-[#12081f] border border-white/15 shadow-2xl shadow-black/60 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Join a study circle</h2>
            <p className="text-xs text-muted mt-0.5">
              Paste an invite link or code to preview the circle before you join.
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste invite link or code..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-regal-purple-400 focus:ring-1 focus:ring-regal-purple-400/50"
            autoFocus
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handlePreview()}
            disabled={!code || busy}
            className="shrink-0"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {preview?.circle_id && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-widest text-regal-pink font-semibold">
              Invite preview
            </p>
            <h3 className="text-lg font-bold text-white mt-1">{preview.circle_name}</h3>
            {preview.circle_subject && <p className="text-sm text-muted mt-1">{preview.circle_subject}</p>}
            {preview.circle_description && (
              <p className="text-sm text-white/80 mt-3 leading-relaxed">{preview.circle_description}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/80">
                {preview.member_count} member{preview.member_count === 1 ? "" : "s"}
              </span>
              {preview.already_member && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-200">
                  Already a member
                </span>
              )}
              {preview.expires_at && (
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/80">
                  Expires {new Date(preview.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="ghost" className="sm:w-1/3" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 gap-2"
                onClick={() => void handleJoin()}
                disabled={busy || !preview.is_valid}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : preview.already_member ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {preview.already_member ? "Open circle" : "Join study circle"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
