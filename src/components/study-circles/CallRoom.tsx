"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorUp,
  Sparkles,
  Users,
  MessageSquare,
  Loader2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  endCircleCall,
  joinCircleCall,
  leaveCircleCall,
  setCallMedia,
  type CircleCall,
} from "@/lib/study-circles";
import { Button } from "@/components/ui/Button";
import { cn, getInitials } from "@/lib/utils";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};

type PeerState = {
  pc: RTCPeerConnection;
  stream: MediaStream;
  displayName: string;
  cameraOn: boolean;
  micOn: boolean;
};

type SignalMessage = {
  type: "offer" | "answer" | "ice" | "hello" | "goodbye" | "media";
  from: string;
  to?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  media?: { camera: boolean; mic: boolean };
  displayName?: string;
};

type ParticipantRow = {
  user_id: string;
  role: string;
  camera_on: boolean;
  mic_on: boolean;
  left_at: string | null;
  display_name?: string | null;
};

export function CallRoom({
  call,
  circleName,
  userId,
  displayName,
  isHost,
  onClose,
  onAskAI,
  aiBusy,
}: {
  call: CircleCall;
  circleName: string;
  userId: string;
  displayName: string;
  isHost: boolean;
  onClose: () => void;
  onAskAI: (prompt: string) => Promise<void>;
  aiBusy: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(call.mode === "video");
  const [screenSharing, setScreenSharing] = useState(false);
  const [peers, setPeers] = useState<Record<string, PeerState>>({});
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "ended">("connecting");
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAI, setShowAI] = useState(false);

  const peersRef = useRef<Record<string, PeerState>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  const sendSignal = useCallback((msg: SignalMessage) => {
    channelRef.current?.send({ type: "broadcast", event: "signal", payload: msg });
  }, []);

  const upsertPeer = useCallback(
    (id: string, updater: (prev: PeerState | undefined) => PeerState) => {
      setPeers((prev) => ({ ...prev, [id]: updater(prev[id]) }));
    },
    []
  );

  const removePeer = useCallback((id: string) => {
    setPeers((prev) => {
      const next = { ...prev };
      next[id]?.pc.close();
      delete next[id];
      return next;
    });
  }, []);

  const createPeerConnection = useCallback(
    (peerId: string, initiator: boolean) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      const remoteStream = new MediaStream();

      const local = localStreamRef.current;
      if (local) {
        for (const track of local.getTracks()) pc.addTrack(track, local);
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal({ type: "ice", from: userId, to: peerId, candidate: e.candidate.toJSON() });
        }
      };

      pc.ontrack = (e) => {
        for (const track of e.streams[0]?.getTracks() ?? [e.track]) {
          if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
            remoteStream.addTrack(track);
          }
        }
        upsertPeer(peerId, (prev) => ({
          pc,
          stream: remoteStream,
          displayName: prev?.displayName ?? "Student",
          cameraOn: prev?.cameraOn ?? true,
          micOn: prev?.micOn ?? true,
        }));
      };

      pc.onconnectionstatechange = () => {
        if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
          removePeer(peerId);
        }
      };

      upsertPeer(peerId, (prev) => ({
        pc,
        stream: remoteStream,
        displayName: prev?.displayName ?? "Student",
        cameraOn: prev?.cameraOn ?? true,
        micOn: prev?.micOn ?? true,
      }));

      if (initiator) {
        void (async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal({ type: "offer", from: userId, to: peerId, sdp: offer, displayName });
        })();
      }

      return pc;
    },
    [displayName, removePeer, sendSignal, upsertPeer, userId]
  );

  const bootstrap = useCallback(async () => {
    setStatus("connecting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: call.mode === "video" ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setMicOn(true);
      setCameraOn(call.mode === "video");
    } catch (err) {
      console.error("[call] getUserMedia failed", err);
      // Continue without media — chat still works
    }

    await joinCircleCall(supabase, call.id, isHost, { camera: call.mode === "video", mic: true });

    const channel = supabase.channel(`call-${call.id}`, {
      config: { broadcast: { self: false }, presence: { key: userId } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "signal" }, async (payload) => {
      const msg = payload.payload as SignalMessage;
      if (msg.from === userId) return;
      if (msg.to && msg.to !== userId) return;

      switch (msg.type) {
        case "hello": {
          if (userId < msg.from) {
            createPeerConnection(msg.from, true);
          }
          upsertPeer(msg.from, (prev) => ({
            ...(prev ?? {
              pc: new RTCPeerConnection(ICE_SERVERS),
              stream: new MediaStream(),
              cameraOn: false,
              micOn: false,
            }),
            displayName: msg.displayName ?? prev?.displayName ?? "Student",
          }));
          break;
        }
        case "offer": {
          const pc = createPeerConnection(msg.from, false);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp!));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ type: "answer", from: userId, to: msg.from, sdp: answer, displayName });
          upsertPeer(msg.from, (prev) => ({
            ...(prev ?? { pc, stream: new MediaStream(), cameraOn: false, micOn: false }),
            displayName: msg.displayName ?? prev?.displayName ?? "Student",
          }));
          break;
        }
        case "answer": {
          const peer = peersRef.current[msg.from];
          if (peer && msg.sdp) {
            await peer.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            upsertPeer(msg.from, (prev) => ({
              ...(prev ?? peer),
              displayName: msg.displayName ?? prev?.displayName ?? peer.displayName,
            }));
          }
          break;
        }
        case "ice": {
          const peer = peersRef.current[msg.from];
          if (peer && msg.candidate) {
            try {
              await peer.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch (e) {
              console.warn("[call] ice add failed", e);
            }
          }
          break;
        }
        case "media": {
          upsertPeer(msg.from, (prev) => ({
            ...(prev ?? {
              pc: new RTCPeerConnection(ICE_SERVERS),
              stream: new MediaStream(),
              displayName: msg.displayName ?? "Student",
            }),
            cameraOn: msg.media?.camera ?? false,
            micOn: msg.media?.mic ?? false,
          }));
          break;
        }
        case "goodbye": {
          removePeer(msg.from);
          break;
        }
      }
    });

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "companion_circle_call_participants",
        filter: `call_id=eq.${call.id}`,
      },
      () => void refreshParticipants()
    );

    await channel.subscribe(async (subStatus) => {
      if (subStatus === "SUBSCRIBED") {
        setStatus("live");
        sendSignal({ type: "hello", from: userId, displayName });
        void refreshParticipants();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.id, call.mode, displayName, isHost, supabase, userId]);

  const refreshParticipants = useCallback(async () => {
    const { data } = await supabase
      .from("companion_circle_call_participants")
      .select("user_id, role, camera_on, mic_on, left_at")
      .eq("call_id", call.id)
      .is("left_at", null);
    if (!data) return;
    const ids = data.map((p) => p.user_id);
    let profileMap = new Map<string, string | null>();
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("companion_profiles")
        .select("id, display_name")
        .in("id", ids);
      profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    }
    setParticipants(
      data.map((p) => ({
        ...(p as ParticipantRow),
        display_name: profileMap.get(p.user_id) ?? null,
      }))
    );
  }, [call.id, supabase]);

  const teardown = useCallback(
    async (endForAll: boolean) => {
      sendSignal({ type: "goodbye", from: userId });
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      for (const peer of Object.values(peersRef.current)) peer.pc.close();
      setPeers({});
      const stream = localStreamRef.current;
      if (stream) for (const t of stream.getTracks()) t.stop();
      localStreamRef.current = null;
      setLocalStream(null);
      await leaveCircleCall(supabase, call.id);
      if (endForAll) {
        try {
          await endCircleCall(supabase, call.id);
        } catch {
          /* not host */
        }
      }
      setStatus("ended");
      onClose();
    },
    [call.id, onClose, sendSignal, supabase, userId]
  );

  useEffect(() => {
    void bootstrap();
    return () => {
      void teardown(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    const next = !micOn;
    for (const t of s.getAudioTracks()) t.enabled = next;
    setMicOn(next);
    void setCallMedia(supabase, call.id, { mic: next });
    sendSignal({ type: "media", from: userId, media: { camera: cameraOn, mic: next }, displayName });
  }, [call.id, cameraOn, displayName, micOn, sendSignal, supabase, userId]);

  const toggleCamera = useCallback(async () => {
    const s = localStreamRef.current;
    if (!s) return;
    const videoTracks = s.getVideoTracks();
    const next = !cameraOn;

    if (videoTracks.length === 0 && next) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
        });
        const newTrack = newStream.getVideoTracks()[0];
        if (newTrack) {
          s.addTrack(newTrack);
          for (const peer of Object.values(peersRef.current)) {
            peer.pc.addTrack(newTrack, s);
          }
        }
      } catch (e) {
        console.warn("[call] camera enable failed", e);
        return;
      }
    } else {
      for (const t of videoTracks) t.enabled = next;
    }

    setCameraOn(next);
    void setCallMedia(supabase, call.id, { camera: next });
    sendSignal({ type: "media", from: userId, media: { camera: next, mic: micOn }, displayName });
  }, [call.id, cameraOn, displayName, micOn, sendSignal, supabase, userId]);

  const startScreenShare = useCallback(async () => {
    if (screenSharing) {
      screenTrackRef.current?.stop();
      screenTrackRef.current = null;
      setScreenSharing(false);
      const s = localStreamRef.current;
      if (s && cameraOn) {
        const track = s.getVideoTracks()[0];
        if (track) {
          for (const peer of Object.values(peersRef.current)) {
            const sender = peer.pc.getSenders().find((s) => s.track?.kind === "video");
            void sender?.replaceTrack(track);
          }
        }
      }
      return;
    }

    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = screen.getVideoTracks()[0];
      if (!track) return;
      screenTrackRef.current = track;
      setScreenSharing(true);
      for (const peer of Object.values(peersRef.current)) {
        const sender = peer.pc.getSenders().find((s) => s.track?.kind === "video");
        void sender?.replaceTrack(track);
      }
      track.addEventListener("ended", () => {
        setScreenSharing(false);
        screenTrackRef.current = null;
      });
    } catch (e) {
      console.warn("[call] screen share failed", e);
    }
  }, [cameraOn, screenSharing]);

  const submitAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    const p = aiPrompt.trim();
    setAiPrompt("");
    setShowAI(false);
    await onAskAI(p);
  };

  const total = participants.length + (participants.some((p) => p.user_id === userId) ? 0 : 1);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#08040f]">
      <header className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-regal-pink font-semibold">
            {call.mode === "video" ? "Video call" : "Audio call"} · {circleName}
          </p>
          <p className="text-sm text-white/80 flex items-center gap-2 mt-0.5">
            <Users className="w-3.5 h-3.5" />
            {total} {total === 1 ? "person" : "people"}
            {status === "connecting" && <span className="text-xs text-amber-300">connecting…</span>}
            {status === "live" && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> live
              </span>
            )}
          </p>
        </div>
        <button onClick={() => void teardown(false)} className="text-muted hover:text-white" aria-label="Minimize">
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-hidden p-3 sm:p-4">
        <div
          className={cn(
            "h-full grid gap-3 auto-rows-fr",
            call.mode === "video"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          )}
        >
          <VideoTile
            stream={localStream}
            displayName={`${displayName} (you)`}
            cameraOn={cameraOn}
            micOn={micOn}
            local
            videoRef={localVideoRef}
            audioOnly={call.mode === "audio"}
          />
          {Object.entries(peers).map(([id, p]) => (
            <RemoteTile key={id} peer={p} audioOnly={call.mode === "audio"} />
          ))}
        </div>
      </div>

      <footer className="border-t border-white/10 p-3 relative">
        {showAI && (
          <form
            onSubmit={submitAI}
            className="absolute left-3 right-3 bottom-full mb-2 bg-[#12081f] border border-white/15 rounded-2xl p-3 shadow-2xl"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-regal-pink shrink-0" />
              <input
                autoFocus
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask Regal AI to help the group…"
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-muted"
              />
              <Button type="submit" size="sm" disabled={aiBusy || !aiPrompt.trim()}>
                {aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Ask"}
              </Button>
            </div>
            <p className="text-[10px] text-muted mt-1 pl-6">
              Regal AI’s response appears in the circle chat so everyone can see it.
            </p>
          </form>
        )}

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={toggleMic}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center border transition-colors",
              micOn
                ? "bg-white/10 border-white/15 text-white"
                : "bg-red-500/20 border-red-400/30 text-red-200"
            )}
            aria-label={micOn ? "Mute mic" : "Unmute mic"}
          >
            {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          {call.mode === "video" && (
            <button
              onClick={() => void toggleCamera()}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center border transition-colors",
                cameraOn
                  ? "bg-white/10 border-white/15 text-white"
                  : "bg-red-500/20 border-red-400/30 text-red-200"
              )}
              aria-label={cameraOn ? "Turn off camera" : "Turn on camera"}
            >
              {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
          )}
          {call.mode === "video" && (
            <button
              onClick={() => void startScreenShare()}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center border transition-colors",
                screenSharing
                  ? "bg-regal-purple-500/30 border-regal-purple-400/40 text-white"
                  : "bg-white/10 border-white/15 text-white"
              )}
              aria-label="Share screen"
            >
              <MonitorUp className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowAI((v) => !v)}
            className="h-11 px-4 rounded-full flex items-center gap-2 border border-regal-purple-400/30 bg-regal-purple-500/20 text-white hover:bg-regal-purple-500/30 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Regal AI</span>
          </button>
          <button
            onClick={onClose}
            className="h-11 px-3 rounded-full flex items-center gap-2 border border-white/10 text-white/80 hover:text-white transition-colors"
            aria-label="Open chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => void teardown(isHost)}
            className="h-11 px-5 rounded-full flex items-center gap-2 bg-red-500/25 border border-red-400/40 text-red-100 hover:bg-red-500/40 transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="text-sm font-semibold">{isHost ? "End" : "Leave"}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

function VideoTile({
  stream,
  displayName,
  cameraOn,
  micOn,
  local,
  videoRef,
  audioOnly,
}: {
  stream: MediaStream | null;
  displayName: string;
  cameraOn: boolean;
  micOn: boolean;
  local?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  audioOnly?: boolean;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? localRef;

  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [ref, stream]);

  const showVideo = cameraOn && !audioOnly && stream && stream.getVideoTracks().length > 0;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 min-h-[140px]">
      {showVideo ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={local}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-regal-purple-900/40 to-black">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-regal-purple-500 to-regal-pink flex items-center justify-center text-xl font-bold text-white">
            {getInitials(displayName)}
          </div>
          <p className="text-xs text-white/80">{displayName}</p>
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
        <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[11px] font-medium truncate max-w-[60%]">
          {displayName}
        </span>
        <span
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-white",
            micOn ? "bg-black/60" : "bg-red-500/70"
          )}
        >
          {micOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
        </span>
      </div>
    </div>
  );
}

function RemoteTile({ peer, audioOnly }: { peer: PeerState; audioOnly?: boolean }) {
  return (
    <VideoTile
      stream={peer.stream}
      displayName={peer.displayName}
      cameraOn={peer.cameraOn}
      micOn={peer.micOn}
      audioOnly={audioOnly}
    />
  );
}
