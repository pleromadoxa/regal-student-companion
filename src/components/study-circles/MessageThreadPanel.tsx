"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageSquareText, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { getInitials } from "@/lib/utils";
import type { CircleMessage, CircleMessageComment } from "@/types";

export function MessageThreadPanel({
  message,
  circleId,
  userId,
  onClose,
}: {
  message: CircleMessage;
  circleId: string;
  userId: string;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<CircleMessageComment[]>([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("companion_circle_message_comments")
        .select("*")
        .eq("parent_message_id", message.id)
        .order("created_at", { ascending: true });

      const rows = (data as CircleMessageComment[]) ?? [];
      if (rows.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      const ids = [...new Set(rows.map((row) => row.user_id))];
      const { data: profiles } = await supabase
        .from("companion_profiles")
        .select("id, display_name, email")
        .in("id", ids);
      const map = new Map((profiles ?? []).map((p) => [p.id, p]));

      setComments(
        rows.map((row) => ({
          ...row,
          profile: {
            display_name: map.get(row.user_id)?.display_name ?? null,
            email: map.get(row.user_id)?.email,
          },
        }))
      );
      setLoading(false);
    };

    void load();

    const channel = supabase
      .channel(`thread-${message.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "companion_circle_message_comments",
          filter: `parent_message_id=eq.${message.id}`,
        },
        async (payload) => {
          const row = payload.new as CircleMessageComment;
          const { data: profile } = await supabase
            .from("companion_profiles")
            .select("display_name, email")
            .eq("id", row.user_id)
            .maybeSingle();
          setComments((prev) => [
            ...prev,
            {
              ...row,
              profile: {
                display_name: profile?.display_name ?? null,
                email: profile?.email,
              },
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [message.id, supabase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = value.trim();
    if (!content) return;
    setSending(true);
    setValue("");
    try {
      await supabase.from("companion_circle_message_comments").insert({
        circle_id: circleId,
        parent_message_id: message.id,
        user_id: userId,
        content,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[75] w-full max-w-lg bg-[#0f0719] border-l border-white/10 shadow-2xl shadow-black/60 flex flex-col">
      <div className="flex items-start justify-between gap-3 p-4 border-b border-white/10">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-regal-pink font-semibold">Message thread</p>
          <p className="text-sm text-white/85 mt-1 leading-relaxed break-words">{message.content}</p>
        </div>
        <button onClick={onClose} className="text-muted hover:text-white" aria-label="Close thread">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-sm text-muted flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading thread...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-muted text-center py-10">
            <MessageSquareText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No comments yet. Start the thread.
          </div>
        ) : (
          comments.map((comment) => {
            const name = comment.profile?.display_name ?? comment.profile?.email ?? "Student";
            return (
              <div key={comment.id} className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-regal-purple-500 to-regal-pink flex items-center justify-center text-xs font-bold shrink-0">
                  {getInitials(name)}
                </div>
                <div className="flex-1 rounded-2xl bg-white/8 border border-white/10 px-3 py-2">
                  <p className="text-xs text-regal-pink font-medium">{name}</p>
                  <p className="text-sm text-white/90 whitespace-pre-wrap break-words mt-1">
                    {comment.content}
                  </p>
                  <p className="text-[10px] text-muted mt-2">
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="p-4 border-t border-white/10 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a thread comment..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-regal-purple-400 focus:ring-1 focus:ring-regal-purple-400/50"
        />
        <Button type="submit" disabled={sending || !value.trim()}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
