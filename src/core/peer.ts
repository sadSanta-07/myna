import wrtc from "@roamhq/wrtc";
import dotenv from "dotenv";
dotenv.config();

const { RTCPeerConnection } = wrtc;

export function createPeerConnection(
  role: "host" | "guest",
  customIceServers?: RTCIceServer[]
): RTCPeerConnection {
  const iceServers: RTCIceServer[] =
    customIceServers && customIceServers.length > 0
      ? customIceServers
      : [{ urls: "stun:stun.l.google.com:19302" }];

  const pc = new wrtc.RTCPeerConnection({ iceServers });

  return pc;
}
