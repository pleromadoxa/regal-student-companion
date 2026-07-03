"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Send,
  Users,
  Hash,
  Copy,
  Check,
  UserPlus,
  Sparkles,
  Loader2,
  Crown,
  LogOut,
  MessageSquare,
  Smile,
  Phone,
  Video,
  Lock,
  Reply,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { cn, getInitials } from "@/lib/utils";
import type { PlanId } from "@/lib/plans";
import type { StudyCircle, CircleMessage } from "@/types";
import {
  buildInviteUrl,
  createCircleInvite,
  toggleReaction,
  startCircleCall,
  type CircleCall,
} from "@/lib/study-circles";
import { EmojiPicker } from "./EmojiPicker";
import { InviteDialog } from "./InviteDialog";
import { CallRoom } from "./CallRoom";

type CircleMember = {
  user_id: string;
  role: string;
  display_name: string | null;
};

type MobileTab = "circles" | "chat" | "members";

const QUICK_REACTIONS = ["👍", "❤️", "🔥", "🎉", "😂", "🤔"];

export function StudyCirclesClient({
  initialCircles,
  userId,
  displayName,
  planId,
  callsAllowed,
}: {
  initialCircles: StudyCircle[];
  userId: string;
  displayName: string;
  planId: PlanId;
  callsAllowed: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [circles, setCircles] = useState(initialCircles);
  const [activeCircle, setActiveCircle] = useState<StudyCircle | null>(initialCircles[0] ?? null);
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<CircleMessage | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [activeCall, setActiveCall] = useState<CircleCall | null>(null);
  const [callBusy, setCallBusy] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const activeCircleId = activeCircle?.id;

  const loadMessages = useCallback(
    async (circleId: string) => {
      const { data } = await supabase
        .from("companion_circle_messages")
        .select("*")
        .eq("circle_id", circleId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!data?.length) {
        setMessages([]);
        return;
      }

      const userIds = [...new Set(data.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("companion_profiles")
        .select("id, display_name")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);

      setMessages(
        (data as CircleMessage[]).map((msg) => ({
          ...msg,
          profile: { display_name: profileMap.get(msg.user_id) ?? null },
        }))
      );
    },
    [supabase]
  );

  const loadMembers = useCallback(
    async (circleId: string) => {
      const { data: rows } = await supabase
        .from("companion_circle_members")
        .select("user_id, role")
        .eq("circle_id", circleId);
      if (!rows?.length) {
        setMembers([]);
        return;
      }
      const ids = rows.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("companion_profiles")
        .select("id, display_name")
        .in("id", ids);
      const map = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
      setMembers(
        rows.map((r) => ({
          user_id: r.user_id,
          role: r.role,
          display_name: map.get(r.user_id) ?? null,
        }))
      );
    },
    [supabase]
  );

  const refreshCircle = useCallback(
    async (circleId: string) => {
      const { data } = await supabase
        .from("companion_study_circles")
        .select("id, name, description, subject, owner_id, is_public, created_at, active_call_id, calls_enabled, avatar_url, topic_tags")
        .eq("id", circleId)
        .maybeSingle();
      if (data) {
        setActiveCircle(data as StudyCircle);
        setCircles((prev) =>
          prev.map((c) => (c.id === data.id ? (data as StudyCircle) : c))
        );
      }
    },
    [supabase]
  );

  const refreshCircles = useCallback(async () => {
    const [{ data: memberships }, { data: owned }] = await Promise.all([
      supabase.from("companion_circle_members").select("circle_id").eq("user_id", userId),
      supabase
        .from("companion_study_circles")
        .select(
          "id, name, description, subject, owner_id, is_public, created_at, active_call_id, calls_enabled, avatar_url, topic_tags"
        )
        .eq("owner_id", userId),
    ]);
    const circleIds = memberships?.map((m) => m.circle_id) ?? [];
    const merged: StudyCircle[] = (owned ?? []) as StudyCircle[];
    if (circleIds.length > 0) {
      const { data } = await supabase
        .from("companion_study_circles")
        .select(
          "id, name, description, subject, owner_id, is_public, created_at, active_call_id, calls_enabled, avatar_url, topic_tags"
        )
        .in("id", circleIds);
      for (const c of data ?? []) {
        if (!merged.some((m) => m.id === c.id)) merged.push(c as StudyCircle);
      }
    }
    setCircles(merged);
  }, [supabase, userId]);

  useEffect(() => {
    if (!activeCircleId) return;
    void loadMessages(activeCircleId);
    void loadMembers(activeCircleId);

    const channel = supabase
      .channel(`circle-${activeCircleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "companion_circle_messages",
          filter: `circle_id=eq.${activeCircleId}`,
        },
        (payload) => {
          const row = payload.new as CircleMessage;
          void (async () => {
            const { data: profile } = await supabase
              .from("companion_profiles")
              .select("display_name")
              .eq("id", row.user_id)
              .maybeSingle();
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return [
                ...prev,
                {
                  ...row,
                  reactions: (row.reactions as Record<string, string[]>) ?? {},
                  profile: { display_name: profile?.display_name ?? null },
                },
              ];
            });
          })();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "companion_circle_messages",
          filter: `circle_id=eq.${activeCircleId}`,
        },
        (payload) => {
          const row = payload.new as CircleMessage;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === row.id
                ? { ...m, reactions: (row.reactions as Record<string, string[]>) ?? {} }
                : m
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "companion_study_circles",
          filter: `id=eq.${activeCircleId}`,
        },
        (payload) => {
          const row = payload.new as StudyCircle;
          setActiveCircle((prev) => (prev ? { ...prev, ...row } : prev));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeCircleId, loadMessages, loadMembers, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const initial = searchParams.get("circle");
    if (initial && circles.some((c) => c.id === initial)) {
      const target = circles.find((c) => c.id === initial);
      if (target) {
        setActiveCircle(target);
        setMobileTab("chat");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: circle } = await supabase
      .from("companion_study_circles")
      .insert({
        name,
        subject: subject || null,
        description: description || null,
        owner_id: userId,
        is_public: false,
      })
      .select()
      .single();

    if (circle) {
      await supabase.from("companion_circle_members").insert({
        circle_id: circle.id,
        user_id: userId,
        role: "owner",
      });
      setName("");
      setSubject("");
      setDescription("");
      setShowCreate(false);
      await refreshCircles();
      setActiveCircle(circle as StudyCircle);
      setMobileTab("chat");
    }
  };

  const leaveCircle = async () => {
    if (!activeCircle || activeCircle.owner_id === userId) return;
    await supabase
      .from("companion_circle_members")
      .delete()
      .eq("circle_id", activeCircle.id)
      .eq("user_id", userId);
    setActiveCircle(null);
    await refreshCircles();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCircle || !newMessage.trim()) return;
    const content = newMessage.trim();
    const askAI = content.toLowerCase().startsWith("@ai") || content.toLowerCase().startsWith("@regal");
    setNewMessage("");
    const replyToId = replyTo?.id ?? null;
    setReplyTo(null);

    if (askAI) {
      const prompt = content.replace(/^@ai\s*|^@regal\s*/i, "").trim() || "Help this study circle right now.";
      await triggerAI(prompt);
      return;
    }

    const { data } = await supabase
      .from("companion_circle_messages")
      .insert({
        circle_id: activeCircle.id,
        user_id: userId,
        content,
        reply_to: replyToId,
      })
      .select()
      .single();

    if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === (data as CircleMessage).id)) return prev;
        return [
          ...prev,
          {
            ...(data as CircleMessage),
            reactions: {},
            profile: { display_name: displayName },
          },
        ];
      });
    }
  };

  const triggerAI = async (prompt: string, options?: { inCall?: boolean }) => {
    if (!activeCircle) return;
    setAiBusy(true);
    try {
      const res = await fetch("/api/study-circles/ai-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          circleId: activeCircle.id,
          prompt,
          inCall: options?.inCall ?? false,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setCallError(data.error ?? "Regal AI failed");
      }
    } catch (e) {
      setCallError(e instanceof Error ? e.message : "Regal AI failed");
    } finally {
      setAiBusy(false);
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    try {
      await toggleReaction(supabase, msgId, emoji);
    } catch (e) {
      console.error("[reaction]", e);
    }
  };

  const quickCopyInvite = async () => {
    if (!activeCircle) return;
    try {
      const invite = await createCircleInvite(supabase, activeCircle.id, { ttlHours: 168 });
      const url = buildInviteUrl(invite.code);
      await navigator.clipboard.writeText(url);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 2200);
    } catch (e) {
      console.error("[invite]", e);
    }
  };

  const startCall = async (mode: "audio" | "video") => {
    if (!activeCircle) return;
    setCallError(null);
    setCallBusy(true);
    try {
      const res = await fetch("/api/study-circles/call-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circleId: activeCircle.id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setCallError(data.error ?? "Cannot start call");
        return;
      }
      const call = await startCircleCall(supabase, activeCircle.id, mode);
      setActiveCall(call);
      void refreshCircle(activeCircle.id);
    } catch (e) {
      setCallError(e instanceof Error ? e.message : "Failed to start call");
    } finally {
      setCallBusy(false);
    }
  };

  const joinExistingCall = async () => {
    if (!activeCircle?.active_call_id) return;
    if (!callsAllowed) {
      setCallError("Group calls require a Graduate or Campus plan. Upgrade in Profile → Plans.");
      return;
    }
    const { data } = await supabase
      .from("companion_circle_calls")
      .select("*")
      .eq("id", activeCircle.active_call_id)
      .maybeSingle();
    if (data && !(data as CircleCall).ended_at) {
      setActiveCall(data as CircleCall);
    }
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Study Circles"
        description="Live chats, emoji reactions, audio & video calls, and Regal AI on demand for your study group."
        action={
          <Button onClick={() => setShowCreate((v) => !v)}>
            <Plus className="w-4 h-4" /> New Circle
          </Button>
        }
      />

      {showCreate && (
        <Card>
          <form onSubmit={createCircle} className="space-y-4">
            <div>
              <Label>Circle name</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Organic Chemistry Study Group"
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Chemistry"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create circle</Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex lg:hidden gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
        {(["circles", "chat", "members"] as MobileTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={cn(
              "flex-1 py-2 text-xs font-medium rounded-lg capitalize transition-colors",
              mobileTab === tab ? "bg-regal-purple-500/30 text-white" : "text-muted"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-4 h-[calc(100vh-280px)] min-h-[520px]">
        {/* Sidebar */}
        <Card
          className={cn(
            "lg:col-span-3 overflow-y-auto flex flex-col",
            mobileTab !== "circles" && "hidden lg:flex"
          )}
        >
          <CardHeader>
            <CardTitle className="text-base">Your circles</CardTitle>
            <CardDescription>{circles.length} active</CardDescription>
          </CardHeader>
          {circles.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No circles yet"
              description="Create a circle or ask a classmate for an invite link."
            />
          ) : (
            <ul className="space-y-1 px-2 pb-2">
              {circles.map((circle) => (
                <button
                  key={circle.id}
                  type="button"
                  onClick={() => {
                    setActiveCircle(circle);
                    setMobileTab("chat");
                    router.replace(`/study-circles?circle=${circle.id}`);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-colors",
                    activeCircle?.id === circle.id
                      ? "bg-regal-purple-500/30 border border-regal-purple-400/30"
                      : "hover:bg-white/5 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-regal-pink shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{circle.name}</p>
                      {circle.subject && (
                        <p className="text-xs text-muted truncate">{circle.subject}</p>
                      )}
                    </div>
                    {circle.active_call_id && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        live
                      </span>
                    )}
                    {circle.owner_id === userId && (
                      <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </ul>
          )}
        </Card>

        {/* Chat */}
        <Card
          className={cn(
            "lg:col-span-6 flex flex-col overflow-hidden p-0",
            mobileTab !== "chat" && "hidden lg:flex"
          )}
        >
          {activeCircle ? (
            <>
              <div className="p-4 border-b border-white/10 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Users className="w-5 h-5 text-regal-purple-300 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{activeCircle.name}</p>
                    <CardDescription className="truncate">
                      {activeCircle.description ?? activeCircle.subject}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {activeCircle.active_call_id && !activeCall && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void joinExistingCall()}
                      title="Join live call"
                      className="gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Join call
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void startCall("audio")}
                    disabled={callBusy}
                    title={callsAllowed ? "Start audio call" : "Audio calls require a paid plan"}
                  >
                    {callsAllowed ? <Phone className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void startCall("video")}
                    disabled={callBusy}
                    title={callsAllowed ? "Start video call" : "Video calls require a paid plan"}
                  >
                    {callsAllowed ? <Video className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void quickCopyInvite()}
                    title="Copy invite link"
                  >
                    {inviteLinkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowInvite(true)}
                    title="Share invite"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </Button>
                  {activeCircle.owner_id !== userId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void leaveCircle()}
                      title="Leave circle"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {callError && (
                <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/25 text-amber-100 text-xs flex items-center justify-between gap-2">
                  <span className="leading-relaxed">{callError}</span>
                  <button onClick={() => setCallError(null)} className="text-amber-100/70 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-12 text-muted text-sm">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Start the conversation. Try{" "}
                    <code className="text-regal-pink">@ai explain this topic</code> to bring Regal AI in.
                  </div>
                )}
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isOwn={msg.user_id === userId && !msg.is_ai}
                    onReact={(emoji) => void handleReaction(msg.id, emoji)}
                    onReply={() => setReplyTo(msg)}
                    referenced={
                      msg.reply_to
                        ? messages.find((m) => m.id === msg.reply_to) ?? null
                        : null
                    }
                    userId={userId}
                  />
                ))}
                {aiBusy && (
                  <div className="flex items-center gap-2 text-xs text-regal-pink pl-11">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Regal AI is thinking…
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {replyTo && (
                <div className="px-4 py-2 border-t border-white/5 flex items-center gap-2 bg-white/[0.03]">
                  <Reply className="w-3 h-3 text-regal-pink shrink-0" />
                  <p className="text-xs text-muted flex-1 truncate">
                    Replying to <span className="text-white/80">{replyTo.profile?.display_name ?? "Student"}</span>: {replyTo.content.slice(0, 60)}
                  </p>
                  <button onClick={() => setReplyTo(null)} className="text-muted hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <form onSubmit={sendMessage} className="p-3 border-t border-white/10 flex gap-2 relative">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmoji((v) => !v)}
                    className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center justify-center transition-colors"
                    aria-label="Emojis"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  {showEmoji && (
                    <EmojiPicker
                      onClose={() => setShowEmoji(false)}
                      onPick={(emoji) => {
                        setNewMessage((m) => m + emoji);
                        composerRef.current?.focus();
                      }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewMessage((m) => (m.trim().length === 0 ? "@ai " : m + " @ai "));
                    composerRef.current?.focus();
                  }}
                  className="h-10 px-3 rounded-xl bg-regal-purple-500/20 hover:bg-regal-purple-500/30 border border-regal-purple-400/30 text-white flex items-center gap-1.5 transition-colors"
                  aria-label="Ask Regal AI"
                >
                  <Sparkles className="w-4 h-4 text-regal-pink" />
                  <span className="text-xs font-medium hidden sm:inline">AI</span>
                </button>
                <Input
                  ref={composerRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Message your study circle... (@ai to ask Regal AI)"
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim() || aiBusy}>
                  {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted p-8 text-center">
              Select or create a study circle to start collaborating.
            </div>
          )}
        </Card>

        {/* Members */}
        <Card
          className={cn(
            "lg:col-span-3 overflow-y-auto flex flex-col gap-4",
            mobileTab !== "members" && "hidden lg:flex"
          )}
        >
          <CardHeader>
            <CardTitle className="text-base">Members</CardTitle>
            <CardDescription>{members.length} in circle</CardDescription>
          </CardHeader>
          <ul className="space-y-2 px-2">
            {members.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center gap-2 p-2 rounded-xl bg-white/5"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                  {getInitials(m.display_name ?? "S")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{m.display_name ?? "Student"}</p>
                  <p className="text-[10px] text-muted capitalize">{m.role}</p>
                </div>
                {m.user_id === userId && <span className="text-[10px] text-regal-pink">you</span>}
              </li>
            ))}
          </ul>

          {activeCircle && (
            <div className="p-3 mt-auto border-t border-white/10 space-y-2">
              <Button
                size="sm"
                variant="secondary"
                className="w-full gap-2"
                onClick={() => void triggerAI("Summarize the last few messages and suggest a next study step for the group.")}
                disabled={aiBusy}
              >
                {aiBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Ask Regal AI
              </Button>
              <p className="text-[10px] text-muted leading-relaxed text-center">
                {planId === "scholar"
                  ? "Chat is free forever. Audio & video calls unlock on Graduate."
                  : "You have unlimited audio & video calls."}
              </p>
            </div>
          )}
        </Card>
      </div>

      {showInvite && activeCircle && (
        <InviteDialog
          circleId={activeCircle.id}
          circleName={activeCircle.name}
          onClose={() => setShowInvite(false)}
        />
      )}

      {activeCall && activeCircle && (
        <CallRoom
          call={activeCall}
          circleName={activeCircle.name}
          userId={userId}
          displayName={displayName}
          isHost={activeCall.started_by === userId}
          aiBusy={aiBusy}
          onAskAI={(prompt) => triggerAI(prompt, { inCall: true })}
          onClose={() => {
            setActiveCall(null);
            if (activeCircleId) void refreshCircle(activeCircleId);
          }}
        />
      )}
    </div>
  );
}

function MessageBubble({
  msg,
  isOwn,
  onReact,
  onReply,
  referenced,
  userId,
}: {
  msg: CircleMessage;
  isOwn: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  referenced: CircleMessage | null;
  userId: string;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const senderName = msg.is_ai
    ? "Regal AI"
    : msg.profile?.display_name ?? "Student";

  const reactions = msg.reactions ?? {};
  const reactionEntries = Object.entries(reactions).filter(
    ([, users]) => Array.isArray(users) && users.length > 0
  );

  return (
    <div
      className={cn(
        "flex gap-2 group",
        isOwn && "flex-row-reverse",
        msg.is_ai && "flex-row"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
          msg.is_ai
            ? "bg-gradient-to-br from-regal-pink to-regal-purple-500 shadow-lg shadow-regal-purple-500/30"
            : "bg-gradient-to-br from-regal-purple-500 to-regal-pink"
        )}
      >
        {msg.is_ai ? <Sparkles className="w-4 h-4 text-white" /> : getInitials(senderName)}
      </div>
      <div
        className={cn(
          "max-w-[80%] relative",
          isOwn && "items-end"
        )}
      >
        {referenced && (
          <div
            className={cn(
              "text-[10px] px-2 py-1 rounded-t-lg bg-white/5 border-l-2 border-regal-pink/50 text-muted truncate max-w-full mb-1",
              isOwn ? "ml-auto text-right" : ""
            )}
          >
            ↪ {referenced.profile?.display_name ?? (referenced.is_ai ? "Regal AI" : "Student")}: {referenced.content.slice(0, 50)}
          </div>
        )}
        <div
          onMouseEnter={() => setShowQuick(true)}
          onMouseLeave={() => setShowQuick(false)}
          className={cn(
            "p-3 rounded-2xl text-sm relative",
            msg.is_ai
              ? "bg-regal-pink/10 border border-regal-pink/25 text-white rounded-bl-md"
              : isOwn
                ? "bg-regal-purple-500/30 text-white rounded-br-md"
                : "bg-white/10 text-white/90 rounded-bl-md"
          )}
        >
          {!isOwn && (
            <p
              className={cn(
                "text-xs font-medium mb-1",
                msg.is_ai ? "text-regal-pink" : "text-regal-pink"
              )}
            >
              {senderName}
              {msg.is_ai && (
                <span className="ml-1 text-[9px] uppercase tracking-widest text-regal-pink/70">
                  · AI
                </span>
              )}
            </p>
          )}
          {msg.is_ai ? (
            <MarkdownContent content={msg.content} />
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          )}
          <p className="text-[10px] text-muted mt-1 opacity-60">
            {new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {showQuick && (
            <div
              className={cn(
                "absolute -top-8 flex gap-0.5 bg-[#12081f] border border-white/15 rounded-full shadow-lg px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                isOwn ? "right-0" : "left-0"
              )}
            >
              {QUICK_REACTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => onReact(e)}
                  className="text-sm hover:bg-white/10 rounded-full w-6 h-6 flex items-center justify-center"
                >
                  {e}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowPicker((v) => !v)}
                className="text-white/70 hover:text-white text-xs px-1"
              >
                +
              </button>
              <button
                type="button"
                onClick={onReply}
                className="text-white/70 hover:text-white w-6 h-6 flex items-center justify-center"
                aria-label="Reply"
              >
                <Reply className="w-3 h-3" />
              </button>
            </div>
          )}

          {showPicker && (
            <EmojiPicker
              onClose={() => setShowPicker(false)}
              onPick={(emoji) => {
                onReact(emoji);
                setShowPicker(false);
              }}
              align={isOwn ? "right" : "left"}
            />
          )}
        </div>

        {reactionEntries.length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1", isOwn && "justify-end")}>
            {reactionEntries.map(([emoji, users]) => {
              const mine = Array.isArray(users) && users.includes(userId);
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[11px] border transition-colors flex items-center gap-1",
                    mine
                      ? "bg-regal-purple-500/30 border-regal-purple-400/40 text-white"
                      : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                  )}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] opacity-80">{Array.isArray(users) ? users.length : 0}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
