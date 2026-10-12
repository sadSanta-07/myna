import wrtc from "@roamhq/wrtc";
import dotenv from "dotenv";
dotenv.config();

const { RTCPeerConnection } = wrtc;

export function createPeerConnection(role: "host" | "peer", customIceServers?: any[]) {
  let defaultIceServers: any[] = [{ urls: "stun:stun.l.google.com:19302" }];

  if (process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    defaultIceServers = [
      { urls: "stun:stun.relay.metered.ca:80" },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      },
    ];
  }

  const iceServers = (customIceServers && customIceServers.length > 0)
    ? customIceServers
    : defaultIceServers;

  const pc = new RTCPeerConnection({ iceServers });

  pc.oniceconnectionstatechange = () => {
    console.log(`[${role}] ICE connection state:`, pc.iceConnectionState);
  };

  pc.onconnectionstatechange = () => {
    console.log(`[${role}] connection state:`, pc.connectionState);
  };

  return pc;
}
