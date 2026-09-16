import wrtc from "@roamhq/wrtc";
import dotenv from "dotenv";
dotenv.config();

const { RTCPeerConnection } = wrtc;

export function createPeerConnection(label: string): RTCPeerConnection {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302"] },
      {
        urls: process.env.TURN_URL!,
        username: process.env.TURN_USERNAME!,
        credential: process.env.TURN_CREDENTIAL!,
      },
    ],
  });

  pc.oniceconnectionstatechange = () => {
    console.log(`[${label}] ICE connection state:`, pc.iceConnectionState);
  };

  pc.onconnectionstatechange = () => {
    console.log(`[${label}] connection state:`, pc.connectionState);
  };

  return pc;
}