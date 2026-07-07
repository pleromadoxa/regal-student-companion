"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Phone, Loader2, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("companion_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12);
      setNotifications((data as CompanionNotification[]) ?? []);
      setLoading(false);
    };
    void load();

    const channel = supabase
      .channel(`notifications-${userId}`)
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
          setNotifications((prev) => prev.map((n) => (n.id === incoming.id ? incoming : n)));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, toast, userId]);

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
        className="relative w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors"
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
        <div className="absolute right-0 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/15 bg-[#12081f] shadow-2xl shadow-black/60 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div>
              <p className="text-sm font-semibold text-white">Notifications</p>
              <p className="text-[11px] text-muted">Study circles, live calls, and updates</p>
            </div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs text-regal-pink hover:text-white flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-sm text-muted flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-sm text-muted">No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void markRead(notification)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors",
                    !notification.read_at && "bg-regal-purple-500/10"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-regal-pink" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{notification.title}</p>
                        {!notification.read_at && (
                          <span className="w-2 h-2 rounded-full bg-regal-pink shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-white/75 mt-1 leading-relaxed">{notification.body}</p>
                      <p className="text-[10px] text-muted mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-white/10 text-right">
            <Link href="/study-circles" className="text-xs text-muted hover:text-white">
              Open Study Circles
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
