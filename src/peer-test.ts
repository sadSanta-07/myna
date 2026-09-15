import WebSocket from "ws";
import { createPeerConnection } from "./peer.js";

const roomCode = process.argv[2];
if (!roomCode) {
  console.error("usage: tsx src/peer-test.ts <room-code>");
  process.exit(1);
}

const ws = new WebSocket("ws://localhost:8080");
const pc = createPeerConnection();

ws.on("open", () => {
  console.log("[peer] connected to signaling server");
  ws.send(JSON.stringify({ type: "join-room", code: roomCode }));
});

ws.on("message", async (raw) => {
  const msg = JSON.parse(raw.toString());
  console.log("[peer] received:", msg.type);

  if (msg.type === "sdp-offer") {
    await pc.setRemoteDescription(msg.sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.send(JSON.stringify({ type: "sdp-answer", sdp: answer }));
    console.log("[peer] sent answer");
  }
});