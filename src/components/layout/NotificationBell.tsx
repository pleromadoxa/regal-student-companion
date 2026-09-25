"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Phone, Loader2, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { subscribeSafely } from "@/lib/realtime";
import { useToastOptional } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { CompanionNotification } from "@/types";

export function NotificationBell({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const toast = useToastOptional();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<CompanionNotification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Supabase's channel() returns the *existing* channel when a topic is reused,
  // and registering postgres_changes callbacks on an already-subscribed channel
  // throws. The bell is mounted more than once (desktop sidebar + mobile
  // header) on the shared browser client, so every instance needs its own topic.
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "") || "0";
  const channelTopic = `notifications-${userId}-${instanceId}`;

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await supabase
          .from("companion_notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(12);
        if (cancelled) return;
        setNotifications((data as CompanionNotification[]) ?? []);
        setLoading(false);
      } catch (e) {
        console.error("[NotificationBell] failed to load notifications:", e);
        if (!cancelled) setLoading(false);
      }
    };
    void load();

    const dispose = subscribeSafely(
      supabase,
      channelTopic,
      (channel) =>
        channel
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "companion_notifications",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const incoming = payload.new as CompanionNotification;
              setNotifications((prev) => [incoming, ...prev].slice(0, 20));
              if (incoming.type === "study_circle_call_started") {
                toast.info(incoming.title);
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "companion_notifications",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const incoming = payload.new as CompanionNotification;
              setNotifications((prev) =>
                prev.map((n) => (n.id === incoming.id ? incoming : n))
              );
            }
          ),
      { label: "NotificationBell" }
    );

    return () => {
      cancelled = true;
      dispose();
    };
  }, [supabase, toast, userId, channelTopic]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markRead = async (notification: CompanionNotification) => {
    if (!notification.read_at) {
      await supabase
        .from("companion_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notification.id)
        .eq("user_id", userId);
    }
    setOpen(false);
    if (notification.href) router.push(notification.href);
  };

  const markAllRead = async () => {
    if (!notifications.some((n) => !n.read_at)) return;
    await supabase
      .from("companion_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-10 h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] text-white flex items-center justify-center transition-all duration-150"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-regal-pink text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/[0.08] bg-[#0c0818] shadow-2xl shadow-black/50 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div>
              <p className="text-[13px] font-semibold text-white">Notifications</p>
              <p className="text-[10px] text-muted">Study circles, live calls, and updates</p>
            </div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-[11px] text-regal-pink hover:text-white flex items-center gap-1 transition-colors duration-150"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-[13px] text-muted flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-[13px] text-muted">No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void markRead(notification)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors duration-150",
                    !notification.read_at && "bg-regal-purple-500/[0.06]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-regal-pink" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-white truncate">{notification.title}</p>
                        {!notification.read_at && (
                          <span className="w-1.5 h-1.5 rounded-full bg-regal-pink shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-white/60 mt-1 leading-relaxed">{notification.body}</p>
                      <p className="text-[10px] text-muted mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-white/[0.06] text-right">
            <Link href="/study-circles" className="text-[11px] text-muted hover:text-white transition-colors duration-150">
              Open Study Circles
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
