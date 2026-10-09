import WebSocket from "ws";
import { createPeerConnection } from "./peer.js";

const roomCode = process.argv[2];
if (!roomCode) {
  console.error("usage: tsx src/peer-test.ts <room-code> [control|view]");
  process.exit(1);
}
const requestedRole = process.argv[3] || "control";

// override for cross-network tests: SIGNAL_URL=wss://xxxx.ngrok-free.app
const ws = new WebSocket(process.env.SIGNAL_URL || "ws://localhost:8080");
const pc = createPeerConnection("peer");

function leave(reason: string) {
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  console.error(`\n[peer] ${reason}`);
  try { pc.close(); } catch { }
  try { ws.close(); } catch { }
  process.exit(0);
}

pc.ondatachannel = (event) => {
  const dc = event.channel;

  dc.onopen = () => {
    console.error("[peer] data channel open (Ctrl+] to detach)");

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (data: string) => {
      if (data.includes("\x1d")) {
        return leave("detached (Ctrl+])");
      }

      if (dc.readyState === "open") {
        dc.send(data);
      }
    });

    process.stdout.on("resize", () => {
      const cols = process.stdout.columns;
      const rows = process.stdout.rows;
      if (!cols || !rows) return;
      dc.send(JSON.stringify({ type: "resize", cols, rows }));
    });
  };

  dc.onmessage = (message) => process.stdout.write(message.data);
  dc.onclose = () => leave("connection closed by host");
};

let remoteDescSet = false;
const pendingCandidates: any[] = [];

pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log(`[local] candidate type: ${event.candidate.type}`);
    signal({
      type: "ice-candidate",
      candidate: event.candidate
    });
  }
};

ws.on("open", () => {
  console.log("[peer] connected to signaling server");

  signal({ type: "join-room", code: roomCode, requestedRole });
});

ws.on("error", (error) => {
  console.error("[peer] signaling error:", error.message);
});

ws.on("close", () => {
  console.error("[peer] signaling connection closed");
});

function signal(message: object) {
  if (ws.readyState !== WebSocket.OPEN) {
    console.error("[peer] signaling socket is not open");
    return;
  }

  ws.send(JSON.stringify(message));
}

ws.on("message", async (raw) => {
  const msg = JSON.parse(raw.toString());
  console.log("[peer] received:", msg.type);

  if (msg.type === "joined") console.error(`[peer] joined with role: ${msg.role}`);
  if (msg.type === "host-left") return leave("host left");
  if (msg.type === "join-denied") return leave("host denied your request");
  if (msg.type === "error") return leave(`server error: ${msg.message}`);

  if (msg.type === "sdp-offer") {
    await pc.setRemoteDescription(msg.sdp);
    remoteDescSet = true;
    for (const candidate of pendingCandidates) await pc.addIceCandidate(candidate);
    pendingCandidates.length = 0;

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    signal({ type: "sdp-answer", sdp: answer });
    console.log("[peer] sent answer");
  }

  if (msg.type === "ice-candidate") {
    if (remoteDescSet) await pc.addIceCandidate(msg.candidate);
    else pendingCandidates.push(msg.candidate);
  }
});