"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Send, Users, Hash } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { cn, getInitials } from "@/lib/utils";
import type { StudyCircle, CircleMessage } from "@/types";

export function StudyCirclesClient({
  initialCircles,
  userId,
}: {
  initialCircles: StudyCircle[];
  userId: string;
}) {
  const [circles, setCircles] = useState(initialCircles);
  const [activeCircle, setActiveCircle] = useState<StudyCircle | null>(
    initialCircles[0] ?? null
  );
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const loadMessages = async (circleId: string) => {
    const { data } = await supabase
      .from("companion_circle_messages")
      .select("*")
      .eq("circle_id", circleId)
      .order("created_at", { ascending: true });

    if (data) {
      const withProfiles = await Promise.all(
        (data as CircleMessage[]).map(async (msg) => {
          const { data: profile } = await supabase
            .from("companion_profiles")
            .select("display_name")
            .eq("id", msg.user_id)
            .single();
          return { ...msg, profile: profile ?? undefined };
        })
      );
      setMessages(withProfiles);
    }
  };

  useEffect(() => {
    if (!activeCircle) return;
    loadMessages(activeCircle.id);

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
        () => loadMessages(activeCircle.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCircle?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const refreshCircles = async () => {
    const { data: memberships } = await supabase
      .from("companion_circle_members")
      .select("circle_id")
      .eq("user_id", userId);
    const circleIds = memberships?.map((m) => m.circle_id) ?? [];
    if (circleIds.length === 0) {
      setCircles([]);
      return;
    }
    const { data } = await supabase
      .from("companion_study_circles")
      .select("*")
      .in("id", circleIds);
    if (data) setCircles(data as StudyCircle[]);
  };

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
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCircle || !newMessage.trim()) return;

    await supabase.from("companion_circle_messages").insert({
      circle_id: activeCircle.id,
      user_id: userId,
      content: newMessage.trim(),
    });

    setNewMessage("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Study Circles</h1>
          <p className="text-muted text-sm mt-1">
            Group chats for collaborative study sessions
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-4 h-4" /> New Circle
        </Button>
      </div>

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
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create Circle</Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid lg:grid-cols-4 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        <Card className="lg:col-span-1 overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-base">Your Circles</CardTitle>
          </CardHeader>
          {circles.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">No circles yet</p>
          ) : (
            <ul className="space-y-1">
              {circles.map((circle) => (
                <button
                  key={circle.id}
                  onClick={() => setActiveCircle(circle)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-colors",
                    activeCircle?.id === circle.id
                      ? "bg-regal-purple-500/30 border border-regal-purple-400/30"
                      : "hover:bg-white/5"
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
                  </div>
                </button>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-3 flex flex-col overflow-hidden p-0">
          {activeCircle ? (
            <>
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-regal-purple-300" />
                  <div>
                    <p className="font-semibold text-white">{activeCircle.name}</p>
                    <CardDescription>{activeCircle.description ?? activeCircle.subject}</CardDescription>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.user_id === userId;
                  const senderName =
                    msg.profile?.display_name ??
                    msg.profile?.email?.split("@")[0] ??
                    "Student";
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex gap-2", isOwn && "flex-row-reverse")}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-regal-purple-500 to-regal-pink flex items-center justify-center text-xs font-bold shrink-0">
                        {getInitials(senderName)}
                      </div>
                      <div
                        className={cn(
                          "max-w-[75%] p-3 rounded-2xl text-sm",
                          isOwn
                            ? "bg-regal-purple-500/30 text-white rounded-br-md"
                            : "bg-white/10 text-white/90 rounded-bl-md"
                        )}
                      >
                        {!isOwn && (
                          <p className="text-xs text-regal-pink font-medium mb-1">
                            {senderName}
                          </p>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={sendMessage}
                className="p-4 border-t border-white/10 flex gap-2"
              >
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
              Select or create a study circle to start chatting
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
