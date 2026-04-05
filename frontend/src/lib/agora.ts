import AgoraRTC, {
  type IAgoraRTCClient,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";

export const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? "";

export function createAgoraClient(): IAgoraRTCClient {
  return AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
}

export async function createLocalTracks(): Promise<[IMicrophoneAudioTrack, ICameraVideoTrack]> {
  return AgoraRTC.createMicrophoneAndCameraTracks(
    { encoderConfig: "music_standard" },
    { encoderConfig: "720p_2" }
  );
}

/**
 * Fetches an Agora token from your backend.
 * Your backend should call Agora's Token Builder and return it.
 */
export async function fetchAgoraToken(channelName: string, uid: number): Promise<string> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const response = await fetch(`${apiUrl}/video/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelName, uid }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Agora token");
  }

  const data = await response.json();
  return data.token as string;
}
