import WebSocket from "ws";
import { createPeerConnection } from "./peer.js";

const ws = new WebSocket("ws://localhost:8080");
const pc = createPeerConnection("host");
const dc = pc.createDataChannel("terminal");

dc.onopen = () => {
  console.log("[host] data channel open");
  dc.send("hello from host");
  console.log("[host] sent: hello from host");
};
dc.onmessage = (event) => console.log("[host] data channel message:", event.data);

let remoteDescSet = false;
const pendingCandidates: any[] = [];

pc.onicecandidate = (event) => {
  if (event.candidate) {
    ws.send(JSON.stringify({ type: "ice-candidate", candidate: event.candidate }));
  }
};

ws.on("open", () => {
  console.log("[host] connected to signaling server");
  ws.send(JSON.stringify({ type: "create-room" }));
});

ws.on("message", async (raw) => {
  const msg = JSON.parse(raw.toString());
  console.log("[host] received:", msg.type);

  if (msg.type === "peer-joined") {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: "sdp-offer", sdp: offer }));
    console.log("[host] sent offer");
  }

  if (msg.type === "sdp-answer") {
    await pc.setRemoteDescription(msg.sdp);
    remoteDescSet = true;
    console.log("[host] set remote description (answer)");

    for (const candidate of pendingCandidates) {
      await pc.addIceCandidate(candidate);
    }
    pendingCandidates.length = 0;
  }

  if (msg.type === "ice-candidate") {
    if (remoteDescSet) {
      await pc.addIceCandidate(msg.candidate);
    } else {
      pendingCandidates.push(msg.candidate);
    }
  }
});