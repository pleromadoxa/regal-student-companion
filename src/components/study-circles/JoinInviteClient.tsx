"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Users, Hash, Sparkles, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { joinCircleByCode, type CircleInvitePreview } from "@/lib/study-circles";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function JoinInviteClient({
  code,
  preview,
  viewerName,
}: {
  code: string;
  preview: CircleInvitePreview | null;
  viewerName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(preview?.already_member ?? false);

  const handleJoin = useCallback(async () => {
    if (!preview?.is_valid) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = await joinCircleByCode(supabase, code);
      if (!result.joined) {
        setError(result.message);
        return;
      }
      setJoined(true);
      router.push(`/study-circles?circle=${result.circleId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join circle");
    } finally {
      setBusy(false);
    }
  }, [code, preview, router]);

  if (!preview || !preview.circle_id) {
    return (
      <div className="page-enter max-w-lg mx-auto pt-8">
        <Card className="text-center py-12 px-6">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-300 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invite not found</h1>
          <p className="text-muted text-sm mb-6">
            This invite link is invalid or has been removed. Ask the person who invited you for a new link.
          </p>
          <Link href="/study-circles">
            <Button variant="secondary">Back to Study Circles</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!preview.is_valid) {
    return (
      <div className="page-enter max-w-lg mx-auto pt-8">
        <Card className="text-center py-12 px-6">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-300 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invite expired</h1>
          <p className="text-muted text-sm mb-2">
            The invite to <span className="text-white font-medium">{preview.circle_name}</span> has expired or reached its usage limit.
          </p>
          <p className="text-muted text-sm mb-6">Ask a member for a new invite link.</p>
          <Link href="/study-circles">
            <Button variant="secondary">Back to Study Circles</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-enter max-w-lg mx-auto pt-4 sm:pt-8">
      <Card className="overflow-hidden">
        <div className="relative -m-5 mb-4 h-24 bg-gradient-to-br from-regal-purple-500/40 via-regal-pink/20 to-regal-purple-800/30">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center">
              <Hash className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[11px] uppercase tracking-widest text-regal-pink font-semibold">You’re invited</p>
          <h1 className="text-2xl font-bold text-white mt-1 leading-tight">{preview.circle_name}</h1>
          {preview.circle_subject && (
            <p className="text-sm text-muted mt-1">{preview.circle_subject}</p>
          )}
          {preview.circle_description && (
            <p className="text-sm text-white/80 mt-3 leading-relaxed max-w-sm mx-auto">
              {preview.circle_description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <Users className="w-4 h-4 text-regal-purple-300 mx-auto" />
            <p className="text-lg font-bold text-white mt-1">{preview.member_count}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted">Members</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <Sparkles className="w-4 h-4 text-regal-pink mx-auto" />
            <p className="text-lg font-bold text-white mt-1">Live</p>
            <p className="text-[10px] uppercase tracking-wider text-muted">Chat & calls</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-regal-purple-500/10 border border-regal-purple-400/20 p-3 text-xs text-white/90 leading-relaxed">
          You’ll join as <span className="font-semibold text-white">{viewerName}</span>. Members can chat, react
          with emojis, start audio/video calls, and share notes with{" "}
          <span className="text-regal-pink font-semibold">Regal AI</span>.
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {joined ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-2 text-emerald-300 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              You’re a member of this circle
            </div>
            <Link href={`/study-circles?circle=${preview.circle_id}`} className="w-full">
              <Button className="w-full gap-2">
                Open circle <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <Link href="/study-circles" className="sm:w-1/3">
              <Button variant="ghost" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button
              onClick={() => void handleJoin()}
              disabled={busy}
              className="flex-1 gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Join study circle
            </Button>
          </div>
        )}

        <p className="text-[11px] text-muted text-center mt-4">
          Only Regal Student Companion members can join. Invite: <code className="text-white/70">{code}</code>
        </p>
      </Card>
    </div>
  );
}
