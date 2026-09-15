import WebSocket from "ws";
import { createPeerConnection } from "./peer.js";

const ws = new WebSocket("ws://localhost:8080");
const pc = createPeerConnection();

ws.on("open", () => {
  console.log("[host] connected to signaling server");
  ws.send(JSON.stringify({ type: "create-room" }));
});

ws.on("message", async (raw) => {
  const msg = JSON.parse(raw.toString());
  console.log("[host] received:", msg);

  if (msg.type === "peer-joined") {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: "sdp-offer", sdp: offer }));
    console.log("[host] sent offer");
  }

  if (msg.type === "sdp-answer") {
    await pc.setRemoteDescription(msg.sdp);
    console.log("[host] set remote description (answer)");
  }
});