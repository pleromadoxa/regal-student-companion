"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { askRegalAI } from "@/lib/regal-ai";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { cn, getInitials } from "@/lib/utils";
import type { StudyCircle, CircleMessage } from "@/types";

type CircleMember = {
  user_id: string;
  role: string;
  display_name: string | null;
};

type MobileTab = "circles" | "chat" | "members";

export function StudyCirclesClient({
  initialCircles,
  userId,
}: {
  initialCircles: StudyCircle[];
  userId: string;
}) {
  const searchParams = useSearchParams();
  const [circles, setCircles] = useState(initialCircles);
  const [activeCircle, setActiveCircle] = useState<StudyCircle | null>(initialCircles[0] ?? null);
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [copied, setCopied] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [joinError, setJoinError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const refreshCircles = useCallback(async () => {
    const [{ data: memberships }, { data: owned }] = await Promise.all([
      supabase.from("companion_circle_members").select("circle_id").eq("user_id", userId),
      supabase
        .from("companion_study_circles")
        .select("id, name, description, subject, owner_id, is_public, created_at")
        .eq("owner_id", userId),
    ]);
    const circleIds = memberships?.map((m) => m.circle_id) ?? [];
    let merged: StudyCircle[] = (owned ?? []) as StudyCircle[];
    if (circleIds.length > 0) {
      const { data } = await supabase
        .from("companion_study_circles")
        .select("id, name, description, subject, owner_id, is_public, created_at")
        .in("id", circleIds);
      for (const c of data ?? []) {
        if (!merged.some((m) => m.id === c.id)) merged.push(c as StudyCircle);
      }
    }
    setCircles(merged);
    if (activeCircle && !merged.some((c) => c.id === activeCircle.id)) {
      setActiveCircle(merged[0] ?? null);
    }
  }, [supabase, userId, activeCircle]);

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
      const withProfiles = await Promise.all(
        rows.map(async (r) => {
          const { data: profile } = await supabase
            .from("companion_profiles")
            .select("display_name")
            .eq("id", r.user_id)
            .single();
          return {
            user_id: r.user_id,
            role: r.role,
            display_name: profile?.display_name ?? null,
          };
        })
      );
      setMembers(withProfiles);
    },
    [supabase]
  );

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

  useEffect(() => {
    if (!activeCircle) return;
    void loadMessages(activeCircle.id);
    void loadMembers(activeCircle.id);

    const channel = supabase
      .channel(`circle-${activeCircle.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "companion_circle_messages",
          filter: `circle_id=eq.${activeCircle.id}`,
        },
        (payload) => {
          const row = payload.new as CircleMessage;
          if (row.user_id === userId) return;
          void (async () => {
            const { data: profile } = await supabase
              .from("companion_profiles")
              .select("display_name")
              .eq("id", row.user_id)
              .single();
            setMessages((prev) => [
              ...prev,
              { ...row, profile: { display_name: profile?.display_name ?? null } },
            ]);
          })();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCircle?.id, loadMessages, loadMembers, supabase, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const joinId = searchParams.get("join");
    if (joinId) {
      setJoinCode(joinId);
      setShowJoin(true);
    }
  }, [searchParams]);

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

  const joinCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const id = joinCode.trim();
    if (!id) return;

    const { data: circle } = await supabase
      .from("companion_study_circles")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!circle) {
      setJoinError("Circle not found. Check the invite link.");
      return;
    }

    const { data: existing } = await supabase
      .from("companion_circle_members")
      .select("user_id")
      .eq("circle_id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase.from("companion_circle_members").insert({
        circle_id: id,
        user_id: userId,
        role: "member",
      });
      if (error) {
        setJoinError("Could not join circle.");
        return;
      }
    }

    setShowJoin(false);
    setJoinCode("");
    await refreshCircles();
    const { data: full } = await supabase
      .from("companion_study_circles")
      .select("*")
      .eq("id", id)
      .single();
    if (full) {
      setActiveCircle(full as StudyCircle);
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
    await refreshCircles();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCircle || !newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage("");

    const { data } = await supabase
      .from("companion_circle_messages")
      .insert({
        circle_id: activeCircle.id,
        user_id: userId,
        content,
      })
      .select()
      .single();

    if (data) {
      setMessages((prev) => [
        ...prev,
        {
          ...(data as CircleMessage),
          profile: { display_name: null },
        },
      ]);
    }
  };

  const copyInvite = () => {
    if (!activeCircle) return;
    const url = `${window.location.origin}/study-circles?join=${activeCircle.id}`;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStudyTip = async () => {
    if (!activeCircle) return;
    setAiLoading(true);
    setAiTip(null);
    try {
      const recent = messages
        .slice(-6)
        .map((m) => m.content)
        .join("\n");
      const { text } = await askRegalAI({
        action: "tutor",
        question: `Study circle "${activeCircle.name}" (${activeCircle.subject ?? "general"}). Recent chat:\n${recent}\n\nGive one concise collaborative study tip for this group (markdown, 3-5 bullets max).`,
        subject: activeCircle.subject ?? "Study",
      });
      setAiTip(text);
    } catch {
      setAiTip("Regal AI could not generate a tip right now.");
    } finally {
      setAiLoading(false);
    }
  };

  const inviteUrl = activeCircle
    ? typeof window !== "undefined"
      ? `${window.location.origin}/study-circles?join=${activeCircle.id}`
      : ""
    : "";

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Study Circles"
        description="Collaborate with classmates in real-time group chats — invite friends and get Regal AI study tips for your circle."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowJoin(!showJoin)}>
              <UserPlus className="w-4 h-4" /> Join
            </Button>
            <Button onClick={() => setShowCreate(!showCreate)}>
              <Plus className="w-4 h-4" /> New Circle
            </Button>
          </div>
        }
      />

      {showJoin && (
        <Card className="border-regal-purple-400/20">
          <form onSubmit={joinCircle} className="space-y-3">
            <Label>Invite link or circle ID</Label>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Paste invite link or circle UUID..."
            />
            {joinError && <p className="text-sm text-red-300">{joinError}</p>}
            <div className="flex gap-2">
              <Button type="submit">Join circle</Button>
              <Button type="button" variant="ghost" onClick={() => setShowJoin(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {showCreate && (
        <Card>
          <form onSubmit={createCircle} className="space-y-4">
            <div>
              <Label>Circle name</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Organic Chemistry Study Group" />
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Chemistry" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create circle</Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
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

      <div className="grid lg:grid-cols-12 gap-4 h-[calc(100vh-280px)] min-h-[480px]">
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
              description="Create a study circle or join one with an invite link from a classmate."
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
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{circle.name}</p>
                      {circle.subject && (
                        <p className="text-xs text-muted truncate">{circle.subject}</p>
                      )}
                    </div>
                    {circle.owner_id === userId && (
                      <Crown className="w-3 h-3 text-amber-400 shrink-0 ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </ul>
          )}
        </Card>

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
                  <Button size="sm" variant="secondary" onClick={copyInvite} title="Copy invite link">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                  {activeCircle.owner_id !== userId && (
                    <Button size="sm" variant="ghost" onClick={() => void leaveCircle()} title="Leave circle">
                      <LogOut className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {inviteUrl && (
                <p className="text-[10px] text-muted px-4 py-1 border-b border-white/5 truncate">
                  Invite: {inviteUrl}
                </p>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-12 text-muted text-sm">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Start the conversation — share notes, questions, or exam prep plans.
                  </div>
                )}
                {messages.map((msg) => {
                  const isOwn = msg.user_id === userId;
                  const senderName = msg.profile?.display_name ?? "Student";
                  return (
                    <div key={msg.id} className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-regal-purple-500 to-regal-pink flex items-center justify-center text-xs font-bold shrink-0">
                        {getInitials(senderName)}
                      </div>
                      <div
                        className={cn(
                          "max-w-[80%] p-3 rounded-2xl text-sm",
                          isOwn
                            ? "bg-regal-purple-500/30 text-white rounded-br-md"
                            : "bg-white/10 text-white/90 rounded-bl-md"
                        )}
                      >
                        {!isOwn && (
                          <p className="text-xs text-regal-pink font-medium mb-1">{senderName}</p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className="text-[10px] text-muted mt-1 opacity-60">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t border-white/10 flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Message your study circle..."
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted">
              Select or create a study circle
            </div>
          )}
        </Card>

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
              <li key={m.user_id} className="flex items-center gap-2 p-2 rounded-xl bg-white/5">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                  {getInitials(m.display_name ?? "S")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{m.display_name ?? "Student"}</p>
                  <p className="text-[10px] text-muted capitalize">{m.role}</p>
                </div>
                {m.user_id === userId && (
                  <span className="text-[10px] text-regal-pink">you</span>
                )}
              </li>
            ))}
          </ul>

          {activeCircle && (
            <div className="p-3 mt-auto border-t border-white/10">
              <Button
                size="sm"
                variant="secondary"
                className="w-full gap-2"
                disabled={aiLoading}
                onClick={() => void getStudyTip()}
              >
                {aiLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Regal AI study tip
              </Button>
              {aiTip && (
                <div className="mt-3 p-3 rounded-xl bg-regal-purple-500/10 border border-regal-purple-400/20 text-xs">
                  <MarkdownContent content={aiTip} />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
