import WebSocket from "ws";
import { createPeerConnection } from "../../core/peer.js";
import { Session } from "../../core/types.js";

export async function runUp(session: Session) {
  const signalUrl = process.env.SIGNAL_URL || "wss://myna-ag89.onrender.com";
  const ws = new WebSocket(signalUrl);

  ws.on("error", () => {
    console.error(`\n❌ Error: Cannot connect to the MYNA signaling server at ${signalUrl}`);
    console.error("Please check your internet connection or try again later.\n");
    process.exit(1);
  });

  interface PeerSession {
    pc: RTCPeerConnection;
    dc: RTCDataChannel;
    role: "view" | "control";
    channelOpen: boolean;
    remoteDescSet: boolean;
    pendingCandidates: any[];
  }

  const activePeers = new Map<string, PeerSession>();
  let outputHistory = "";
  const MAX_HISTORY = 100000;

  interface JoinRequest { peerId: string; requestedRole: string; }
  const joinQueue: JoinRequest[] = [];
  let currentRequest: JoinRequest | null = null;

  function cleanupPeer(peerId: string) {
    const peer = activePeers.get(peerId);
    if (!peer) return;
    try { peer.dc.close(); } catch { }
    try { peer.pc.close(); } catch { }
    activePeers.delete(peerId);
  }

  function processNextJoinRequest() {
    if (currentRequest || joinQueue.length === 0) return;
    currentRequest = joinQueue.shift()!;
    process.stdout.write(`\n[myna] peer (${currentRequest.peerId.slice(0, 4)}) wants to join as ${currentRequest.requestedRole}. (c)ontrol / (v)iew / (n)o? `);
  }

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (key: string) => {
      if (key === "\x03") { // Ctrl+C
        for (const peerId of activePeers.keys()) cleanupPeer(peerId);
        ws.close();
        process.exit(0);
      }

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
        console.log("\n[myna] revoking all active peers...");
        for (const [peerId, peer] of activePeers.entries()) {
          ws.send(JSON.stringify({ type: "revoke-peer", peerId }));
          cleanupPeer(peerId);
        }
        return;
      }

      session.write(key);
    });
  }

  session.onData((data: string) => {
    process.stdout.write(data);

    outputHistory += data;
    if (outputHistory.length > MAX_HISTORY) outputHistory = outputHistory.slice(-MAX_HISTORY);

    for (const peer of activePeers.values()) {
      if (peer.channelOpen && peer.dc.readyState === "open") peer.dc.send(data);
    }
  });

  session.onExit(async () => {
    console.log("\n[myna] shell exited, closing session");
    for (const peerId of activePeers.keys()) cleanupPeer(peerId);
    ws.close();
    process.exit(0);
  });

  process.stdout.on("resize", () => {
    const cols = process.stdout.columns;
    const rows = process.stdout.rows;
    if (cols && rows) {
      try { session.resize(cols, rows); } catch { }
    }
  });

  ws.on("open", () => ws.send(JSON.stringify({ type: "create-room" })));

  ws.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString());

    if (msg.type === "room-created") {
      const domain = process.env.SIGNAL_URL
        ? process.env.SIGNAL_URL.replace('wss://', 'https://').replace('ws://', 'http://')
        : "https://myna-ag89.onrender.com";
      console.log(`\n======================================`);
      console.log(` ROOM CODE : ${msg.code}`);
      console.log(` SHARE LINK: ${domain}/#${msg.code}`);
      console.log(`======================================\n`);
    }

    if (msg.type === "join-request") {
      joinQueue.push({ peerId: msg.peerId, requestedRole: msg.requestedRole });
      processNextJoinRequest();
    }

    if (msg.type === "join-request-cancelled") {
      if (currentRequest && currentRequest.peerId === msg.peerId) {
        console.log(`\n[myna] peer ${msg.peerId.slice(0, 4)} disconnected. Cancelled prompt.`);
        currentRequest = null;
        processNextJoinRequest();
      } else {
        const idx = joinQueue.findIndex(r => r.peerId === msg.peerId);
        if (idx !== -1) joinQueue.splice(idx, 1);
      }
    }

    if (msg.type === "peer-joined") {
      const peerId = msg.peerId;
      const pc = createPeerConnection("host");
      const dc = pc.createDataChannel("terminal");

      const peerSession: PeerSession = { pc, dc, role: msg.role, channelOpen: false, remoteDescSet: false, pendingCandidates: [] };
      activePeers.set(peerId, peerSession);

      dc.onopen = () => {
        console.log(`\n[myna] data channel open for ${peerId.slice(0, 4)}`);
        peerSession.channelOpen = true;
        if (outputHistory) dc.send(outputHistory);
      };

      dc.onmessage = (event) => {
        if (peerSession.role !== "control") return;
        try {
          const m = JSON.parse(event.data.toString());
          if (m.type === "resize") return session.resize(m.cols, m.rows);
          if (m.type === "input" && typeof m.data === "string") return session.write(m.data);
        } catch { }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) ws.send(JSON.stringify({ type: "ice-candidate", peerId, candidate: event.candidate }));
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: "sdp-offer", peerId, sdp: offer }));
    }

    if (msg.type === "peer-left") {
      cleanupPeer(msg.peerId);
      console.log(`\n[myna] peer ${msg.peerId.slice(0, 4)} disconnected`);
    }

    if (msg.type === "sdp-answer") {
      const peer = activePeers.get(msg.peerId);
      if (!peer) return;
      await peer.pc.setRemoteDescription(msg.sdp);
      peer.remoteDescSet = true;
      for (const candidate of peer.pendingCandidates) await peer.pc.addIceCandidate(candidate);
      peer.pendingCandidates.length = 0;
    }

    if (msg.type === "ice-candidate") {
      const peer = activePeers.get(msg.peerId);
      if (!peer) return;
      if (peer.remoteDescSet) await peer.pc.addIceCandidate(msg.candidate);
      else peer.pendingCandidates.push(msg.candidate);
    }
  });
}