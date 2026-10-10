import WebSocket from "ws";
import { createPeerConnection } from "./peer.js";
import { createDockerSession } from "./docker.js";
import * as readline from "readline";

const session = await createDockerSession("myna-test:latest");
const ws = new WebSocket("ws://localhost:8080");

let activePrompt: readline.Interface | null = null;
let peerRole: "view" | "control" = "view";

let pc: RTCPeerConnection | null = null;
let dc: RTCDataChannel | null = null;
let channelOpen = false;
let remoteDescSet = false;
let pendingCandidates: any[] = [];
const outputBuffer: string[] = [];

function enableHostInput() {
  if (!process.stdin.isTTY) return;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  process.stdin.removeAllListeners("data");

  process.stdin.on("data", (key: string) => {
    if (key === "\x03") { // Ctrl+C
      process.emit("SIGINT");
    }
    if (key === "\x18") { // Ctrl+X
      console.log("\n[host] revoking peer access...");
      ws.send(JSON.stringify({ type: "revoke-peer" }));
      cleanupPeer();
    }
  });
}

function disableHostInput() {
  if (!process.stdin.isTTY) return;
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdin.removeAllListeners("data");
}

function cleanupPeer() {
  channelOpen = false;
  remoteDescSet = false;
  pendingCandidates = [];
  try { dc?.close(); } catch { }
  try { pc?.close(); } catch { }
  pc = null;
  dc = null;
}

enableHostInput();

session.onData((data: string) => {
  if (channelOpen && dc?.readyState === "open") {
    dc.send(data);
  } else {
    outputBuffer.push(data);
  }
});

process.on("SIGINT", async () => {
  await session.kill();
  process.exit(0);
});

session.onExit(async () => {
  console.log("[host] shell exited, closing session");
  cleanupPeer();
  ws.close();
  await session.kill();
  process.exit(0);
});

ws.on("open", () => {
  console.log("[host] connected to signaling server");
  ws.send(JSON.stringify({ type: "create-room" }));
});

ws.on("message", async (raw) => {
  const msg = JSON.parse(raw.toString());
  console.log("[host] received:", msg.type);

  if (msg.type === "peer-joined") {
    cleanupPeer();

    pc = createPeerConnection("host");
    dc = pc.createDataChannel("terminal");

    dc.onopen = () => {
      console.log("[host] data channel open");
      channelOpen = true;
      for (const chunk of outputBuffer) {
        dc.send(chunk);
      }
      outputBuffer.length = 0;
    };

    dc.onmessage = (event) => {
      if (peerRole !== "control") return;
      const data = event.data;
      if (typeof data === "string" && data.startsWith("{")) {
        try {
          const m = JSON.parse(data);
          if (m.type === "resize") {
            session.resize(m.cols, m.rows);
            return;
          }
        } catch { }
      }
      session.write(data);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(JSON.stringify({ type: "ice-candidate", candidate: event.candidate }));
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: "sdp-offer", sdp: offer }));
    console.log("[host] sent offer");
  }

  if (msg.type === "join-request") {
    disableHostInput();
    activePrompt = readline.createInterface({ input: process.stdin, output: process.stdout });
    activePrompt.question(
      `[host] peer wants to join (requested: ${msg.requestedRole}). (c)ontrol / (v)iew / (n)o? `,
      (answer) => {
        activePrompt?.close();
        activePrompt = null;
        enableHostInput();

        const a = answer.trim().toLowerCase();
        if (a === "c" || a === "v") {
          peerRole = a === "c" ? "control" : "view";
          ws.send(JSON.stringify({ type: "approve-peer", code: msg.code, role: peerRole }));
        } else {
          ws.send(JSON.stringify({ type: "deny-peer", code: msg.code }));
        }
      }
    );
  }

  if (msg.type === "join-request-cancelled") {
    if (activePrompt) {
      activePrompt.close();
      activePrompt = null;
      enableHostInput();
      console.log("\n[host] peer disconnected before approval. Waiting for new requests...");
    }
  }

  if (msg.type === "peer-left") {
    cleanupPeer();
  }

  if (msg.type === "sdp-answer") {
    if (!pc) return;
    await pc.setRemoteDescription(msg.sdp);
    remoteDescSet = true;
    for (const candidate of pendingCandidates) {
      await pc.addIceCandidate(candidate);
    }
    pendingCandidates.length = 0;
  }

  if (msg.type === "ice-candidate") {
    if (!pc) return;
    if (remoteDescSet) {
      await pc.addIceCandidate(msg.candidate);
    } else {
      pendingCandidates.push(msg.candidate);
    }
  }
});