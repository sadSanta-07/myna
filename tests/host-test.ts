import WebSocket from "ws";
import { createPeerConnection } from "../src/core/peer.js";
import { createDockerSession } from "../src/core/docker.js";

const session = await createDockerSession("myna-test:latest");
const ws = new WebSocket(process.env.SIGNAL_URL || "ws://localhost:8080");

interface PeerSession {
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  role: "view" | "control";
  channelOpen: boolean;
  remoteDescSet: boolean;
  pendingCandidates: RTCIceCandidateInit[];
}

const activePeers = new Map<string, PeerSession>();

let outputHistory = "";
const MAX_HISTORY = 100000;

// Join Request Queue
interface JoinRequest { peerId: string; requestedRole: string; }
const joinQueue: JoinRequest[] = [];
let currentRequest: JoinRequest | null = null;

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", (key: string) => {
    if (key === "\x03") return process.emit("SIGINT"); // Ctrl+C

    if (currentRequest) {
      const a = key.toLowerCase();
      if (a === "c" || a === "v" || a === "n") {
        process.stdout.write(a + "\n");
        const peerId = currentRequest.peerId;
        if (a === "c" || a === "v") {
          const role = a === "c" ? "control" : "view";
          ws.send(JSON.stringify({ type: "approve-peer", peerId, role }));
        } else {
          ws.send(JSON.stringify({ type: "deny-peer", peerId }));
        }
        currentRequest = null;
        processNextJoinRequest();
      }
      return;
    }

    if (key === "\x18") { // Ctrl+X
      console.log("\n[host] revoking all active peers...");
      for (const [peerId, peer] of activePeers.entries()) {
        ws.send(JSON.stringify({ type: "revoke-peer", peerId }));
        cleanupPeer(peerId);
      }
    }
  });
}

function processNextJoinRequest() {
  if (currentRequest || joinQueue.length === 0) return;
  currentRequest = joinQueue.shift()!;
  process.stdout.write(`\n[host] peer (${currentRequest.peerId.slice(0, 4)}) wants to join as ${currentRequest.requestedRole}. (c)ontrol / (v)iew / (n)o? `);
}


function cleanupPeer(peerId: string) {
  const peer = activePeers.get(peerId);
  if (!peer) return;
  try { peer.dc.close(); } catch (err) { console.warn("[host-test] Could not close peer data channel during cleanup:", err); }
  try { peer.pc.close(); } catch (err) { console.warn("[host-test] Could not close peer connection during cleanup:", err); }
  activePeers.delete(peerId);
}

session.onData((data: string) => {
  outputHistory += data;
  if (outputHistory.length > MAX_HISTORY) {
    outputHistory = outputHistory.slice(-MAX_HISTORY);
  }
  for (const peer of activePeers.values()) {
    if (peer.channelOpen && peer.dc.readyState === "open") {
      peer.dc.send(data);
    }
  }
});

process.on("SIGINT", async () => {
  for (const peerId of activePeers.keys()) cleanupPeer(peerId);
  await session.kill();
  process.exit(0);
});

session.onExit(async () => {
  console.log("[host] shell exited, closing session");
  for (const peerId of activePeers.keys()) cleanupPeer(peerId);
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

  if (msg.type === "join-request") {
    joinQueue.push({ peerId: msg.peerId, requestedRole: msg.requestedRole });
    processNextJoinRequest();
  }

  if (msg.type === "join-request-cancelled") {
    if (currentRequest && currentRequest.peerId === msg.peerId) {
      console.log(`\n[host] peer ${msg.peerId.slice(0, 4)} disconnected. Cancelled prompt.`);
      currentRequest = null;
      processNextJoinRequest();
    } else {
      const idx = joinQueue.findIndex(r => r.peerId === msg.peerId);
      if (idx !== -1) joinQueue.splice(idx, 1);
    }
  }

  if (msg.type === "room-created") {
    console.log(`\n======================================`);
    console.log(` ROOM CODE : ${msg.code}`);
    console.log(` SHARE LINK: https://myna-ag89.onrender.com/#${msg.code}`);
    console.log(`======================================\n`);
    console.log(`Waiting for peers to join...`);
  }

  if (msg.type === "peer-joined") {
    const peerId = msg.peerId;
    const pc = createPeerConnection("host");
    const dc = pc.createDataChannel("terminal");

    const peerSession: PeerSession = {
      pc, dc, role: msg.role, channelOpen: false, remoteDescSet: false, pendingCandidates: []
    };
    activePeers.set(peerId, peerSession);

    dc.onopen = () => {
      console.log(`[host] data channel open for ${peerId.slice(0, 4)}`);
      peerSession.channelOpen = true;
      if (outputHistory) dc.send(outputHistory);
    };

    dc.onmessage = (event) => {
      if (peerSession.role !== "control") return;
      try {
        const m = JSON.parse(event.data.toString());
        if (m.type === "resize") {
          return session.resize(m.cols, m.rows);
        }
        if (m.type === "input" && typeof m.data === "string") {
          return session.write(m.data);
        }
      } catch (err) {
        console.warn("[host-test] Ignoring invalid terminal control message:", err);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(JSON.stringify({ type: "ice-candidate", peerId, candidate: event.candidate }));
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: "sdp-offer", peerId, sdp: offer }));
  }

  if (msg.type === "peer-left") {
    cleanupPeer(msg.peerId);
    console.log(`\n[host] peer ${msg.peerId.slice(0, 4)} disconnected`);
  }

  if (msg.type === "sdp-answer") {
    const peer = activePeers.get(msg.peerId);
    if (!peer) return;
    await peer.pc.setRemoteDescription(msg.sdp);
    peer.remoteDescSet = true;
    for (const candidate of peer.pendingCandidates) {
      await peer.pc.addIceCandidate(candidate);
    }
    peer.pendingCandidates.length = 0;
  }

  if (msg.type === "ice-candidate") {
    const peer = activePeers.get(msg.peerId);
    if (!peer) return;
    if (peer.remoteDescSet) {
      await peer.pc.addIceCandidate(msg.candidate);
    } else {
      peer.pendingCandidates.push(msg.candidate);
    }
  }
});