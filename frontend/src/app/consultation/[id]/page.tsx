"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  MessageSquare, Users, Maximize2, Minimize2,
  Loader2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AGORA_APP_ID, createAgoraClient, createLocalTracks, fetchAgoraToken } from "@/lib/agora";
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack, IRemoteVideoTrack, IRemoteAudioTrack } from "agora-rtc-sdk-ng";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface ConsultationPageProps {
  params: { id: string };
}

type ConnectionState = "idle" | "connecting" | "connected" | "error";

export default function ConsultationPage({ params }: ConsultationPageProps) {
  const router = useRouter();
  const channelName = `appointment-${params.id}`;

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<IRemoteVideoTrack | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<IRemoteAudioTrack | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [duration, setDuration] = useState(0);
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);

  // Timer
  useEffect(() => {
    if (connectionState !== "connected") return;
    const interval = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [connectionState]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const joinChannel = useCallback(async () => {
    if (!AGORA_APP_ID) {
      toast.error("Agora App ID is not configured");
      setConnectionState("error");
      return;
    }

    setConnectionState("connecting");

    try {
      const client = createAgoraClient();
      clientRef.current = client;

      const uid = Math.floor(Math.random() * 100000);
      const token = await fetchAgoraToken(channelName, uid);

      // Handle remote user joining
      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "video") {
          setRemoteVideoTrack(user.videoTrack ?? null);
          setRemoteUserJoined(true);
        }
        if (mediaType === "audio") {
          setRemoteAudioTrack(user.audioTrack ?? null);
          user.audioTrack?.play();
        }
      });

      client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "video") setRemoteVideoTrack(null);
        if (mediaType === "audio") setRemoteAudioTrack(null);
      });

      client.on("user-left", () => {
        setRemoteUserJoined(false);
        setRemoteVideoTrack(null);
        setRemoteAudioTrack(null);
        toast("The other participant has left the call.", { icon: "👋" });
      });

      await client.join(AGORA_APP_ID, channelName, token, uid);
      const [audioTrack, videoTrack] = await createLocalTracks();

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      await client.publish([audioTrack, videoTrack]);
      setConnectionState("connected");
    } catch (err) {
      console.error("Agora join error:", err);
      setConnectionState("error");
      toast.error("Failed to join video call. Check your camera/microphone permissions.");
    }
  }, [channelName]);

  // Play local video
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current && !isVideoOff) {
      localVideoTrack.play(localVideoRef.current);
    }
    return () => { localVideoTrack?.stop(); };
  }, [localVideoTrack, isVideoOff]);

  // Play remote video
  useEffect(() => {
    if (remoteVideoTrack && remoteVideoRef.current) {
      remoteVideoTrack.play(remoteVideoRef.current);
    }
    return () => { remoteVideoTrack?.stop(); };
  }, [remoteVideoTrack]);

  useEffect(() => {
    joinChannel();
    return () => { leaveChannel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leaveChannel = async () => {
    localAudioTrack?.close();
    localVideoTrack?.close();
    if (clientRef.current) {
      await clientRef.current.leave();
      clientRef.current = null;
    }
  };

  const handleEndCall = async () => {
    await leaveChannel();
    toast.success("Call ended");
    router.push("/dashboard");
  };

  const toggleMute = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setMuted(!isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <div className={cn("bg-gray-900 text-white flex flex-col", isFullscreen ? "fixed inset-0 z-50" : "min-h-screen")}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800/80 backdrop-blur border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-sm">
            {connectionState === "connecting" ? "Connecting..." :
             connectionState === "connected" ? `Live · ${formatDuration(duration)}` :
             connectionState === "error" ? "Connection Failed" : "Initializing"}
          </span>
          {remoteUserJoined && (
            <Badge variant="success" className="text-xs">Doctor Connected</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs gap-1">
            <Users className="h-3 w-3" />
            {remoteUserJoined ? "2" : "1"} participant{remoteUserJoined ? "s" : ""}
          </Badge>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-gray-950">
        {/* Remote Video (main) */}
        <div
          ref={remoteVideoRef}
          className="absolute inset-0"
        >
          {!remoteUserJoined && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              {connectionState === "connecting" ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-gray-400 text-sm">Connecting to secure video channel...</p>
                </>
              ) : connectionState === "error" ? (
                <>
                  <AlertCircle className="h-10 w-10 text-red-400" />
                  <p className="text-gray-400 text-sm">Connection failed. Check permissions.</p>
                  <Button variant="outline" onClick={joinChannel} className="text-white border-gray-600">
                    Retry
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl">
                    🩺
                  </div>
                  <p className="text-gray-400 text-sm">Waiting for doctor to join...</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Local Video (PiP) */}
        <div
          ref={localVideoRef}
          className="absolute bottom-4 right-4 w-40 h-28 md:w-52 md:h-36 rounded-xl overflow-hidden border-2 border-gray-600 bg-gray-800 shadow-xl"
        >
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <VideoOff className="h-6 w-6 text-gray-500" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-5 bg-gray-800/90 backdrop-blur border-t border-gray-700">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all",
              isMuted ? "bg-red-500/20 text-red-400" : "bg-gray-700 hover:bg-gray-600 text-white"
            )}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            <span className="text-xs">{isMuted ? "Unmute" : "Mute"}</span>
          </button>

          <button
            onClick={toggleVideo}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all",
              isVideoOff ? "bg-red-500/20 text-red-400" : "bg-gray-700 hover:bg-gray-600 text-white"
            )}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            <span className="text-xs">{isVideoOff ? "Start Video" : "Stop Video"}</span>
          </button>

          <button
            onClick={handleEndCall}
            className="flex flex-col items-center gap-1.5 bg-red-600 hover:bg-red-700 px-8 py-3 rounded-2xl transition-all"
          >
            <PhoneOff className="h-5 w-5" />
            <span className="text-xs font-medium">End Call</span>
          </button>

          <button className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-gray-700 hover:bg-gray-600 transition-all">
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs">Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}
