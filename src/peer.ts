import wrtc from "@roamhq/wrtc";
import dotenv from "dotenv";
dotenv.config();

const { RTCPeerConnection } = wrtc;

export function createPeerConnection(label: string): RTCPeerConnection {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.relay.metered.ca:80" },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: process.env.TURN_USERNAME!,
        credential: process.env.TURN_CREDENTIAL!,
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: process.env.TURN_USERNAME!,
        credential: process.env.TURN_CREDENTIAL!,
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: process.env.TURN_USERNAME!,
        credential: process.env.TURN_CREDENTIAL!,
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
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