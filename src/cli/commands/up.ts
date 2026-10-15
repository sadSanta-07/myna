import WebSocket from "ws";
import * as http from "http";
import { createPeerConnection } from "../../core/peer.js";
import { Session } from "../../core/types.js";
import { getSignalUrl, getShareDomain } from "../../core/config.js";
import { logGuestInput } from "../../core/audit.js";
import { isDangerousCommand } from "../../core/guardrail.js";
import * as path from "path";
import * as fs from "fs";

interface GuardrailRequest { cmd: string; res: http.ServerResponse; }
let pendingGuardrail: GuardrailRequest | null = null;
let isFrozen = false;

export async function runUp(session: Session, options: { noReplay?: boolean } = {}) {
  const signalWsUrl = getSignalUrl();
  const signalHttpUrl = signalWsUrl.replace(/^ws/, "http");

  let roomCode = "";
  try {
    const res = await fetch(`${signalHttpUrl}/new`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to provision room");
    const data = await (res.json() as Promise<{ code: string }>);
    roomCode = data.code;
  } catch (err) {
    console.error(`\n❌ Error: Cannot provision room from MYNA signaling server at ${signalHttpUrl}`);
    console.error("Please check your internet connection or try again later.\n");
    process.exit(1);
  }

  const ws = new WebSocket(`${signalWsUrl}/room/${roomCode}`);

  const gateServer = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/check") {
      let body = "";
      req.on("data", chunk => body += chunk.toString());
      req.on("end", () => {
        try {
          const { cmd } = JSON.parse(body);
          if (isDangerousCommand(cmd)) {
            isFrozen = true;
            pendingGuardrail = { cmd, res };
            process.stdout.write(
              `\r\n\n⚠️  [myna] GUARDRAIL: Guest is attempting to run:\r\n` +
              `   > ${cmd}\r\n` +
              `   Press [Ctrl+A then Y] to Allow | [Ctrl+A then N] to Block: `
            );
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ allowed: true }));
          }
        } catch {
          res.writeHead(400).end();
        }
      });
    } else {
      res.writeHead(404).end();
    }
  });
  gateServer.listen(41234, "127.0.0.1");

  setTimeout(() => {
    if (process.platform === "win32") {
      const hookPath = path.resolve(process.cwd(), "myna-hook.ps1");
      if (fs.existsSync(hookPath)) {
        session.write(`. "${hookPath}"\r`);
      }
    } else {
      const hookPath = path.resolve(process.cwd(), "myna-hook.sh");
      if (fs.existsSync(hookPath)) {
        session.write(`source "${hookPath}"\n`);
      }
    }
  }, 300);

  function restoreTerminalAndExit(code = 0) {
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } catch { }
    }
    try { gateServer.close(); } catch { }
    try { session.kill(); } catch { }
    process.exit(code);
  }

  process.on("SIGINT", () => restoreTerminalAndExit(0));
  process.on("SIGTERM", () => restoreTerminalAndExit(0));
  process.on("uncaughtException", (err) => {
    console.error("\n[myna] Uncaught exception:", err.message);
    restoreTerminalAndExit(1);
  });

  ws.on("error", () => {
    console.error(`\n❌ Error: Cannot connect to the MYNA signaling server at ${signalWsUrl}`);
    console.error("Please check your internet connection or try again later.\n");
    restoreTerminalAndExit(1);
  });

  ws.on("close", () => {
    console.log("\n[myna] Signaling connection closed");
  });

  interface PeerSession {
    pc: RTCPeerConnection;
    dc: RTCDataChannel;
    controlDc?: RTCDataChannel;
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
    if (peer.controlDc) try { peer.controlDc.close(); } catch { }
    try { peer.pc.close(); } catch { }
    activePeers.delete(peerId);
  }

  function processNextJoinRequest() {
    if (currentRequest || joinQueue.length === 0) return;
    currentRequest = joinQueue.shift()!;
    process.stdout.write(
      `\n[myna] Peer (${currentRequest.peerId.slice(0, 4)}) wants to join as ${currentRequest.requestedRole}.\n` +
      `       Press [Ctrl+A then C] Control | [Ctrl+A then V] View | [Ctrl+A then N] Deny: `
    );
  }

  let leaderActive = false;
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (key: string) => {
      // Leader Key Trigger
      if (key === "\x01") {
        leaderActive = true;
        return;
      }

      if (leaderActive) {
        leaderActive = false;
        const cmd = key.toLowerCase();

        if (pendingGuardrail) {
          if (cmd === "y") {
            console.log(`\r\n[myna] Allowed: ${pendingGuardrail.cmd}`);
            pendingGuardrail.res.writeHead(200, { "Content-Type": "application/json" });
            pendingGuardrail.res.end(JSON.stringify({ allowed: true }));
            isFrozen = false;
            pendingGuardrail = null;
          } else if (cmd === "n") {
            console.log(`\r\n[myna] Blocked: ${pendingGuardrail.cmd}`);
            pendingGuardrail.res.writeHead(200, { "Content-Type": "application/json" });
            pendingGuardrail.res.end(JSON.stringify({ allowed: false }));
            isFrozen = false;
            pendingGuardrail = null;
          }
          return;
        }

        if (currentRequest) {
          const peerId = currentRequest.peerId;
          if (cmd === "c" || cmd === "v") {
            const role = cmd === "c" ? "control" : "view";
            ws.send(JSON.stringify({ type: "approve-peer", peerId, role }));
            console.log(`\n[myna] Approved ${peerId.slice(0, 4)} as ${role}`);
          } else if (cmd === "n") {
            ws.send(JSON.stringify({ type: "deny-peer", peerId }));
            console.log(`\n[myna] Denied ${peerId.slice(0, 4)}`);
          }
          currentRequest = null;
          processNextJoinRequest();
          return;
        }

        // Freeze Toggle
        if (cmd === "f") {
          isFrozen = !isFrozen;
          console.log(`\n[myna] Session ${isFrozen ? "FROZEN (guest input paused)" : "UNFROZEN (guest input active)"}`);
          return;
        }

        // Revoke All
        if (cmd === "x") {
          console.log("\n[myna] Revoking all active peers...");
          for (const [peerId, peer] of activePeers.entries()) {
            ws.send(JSON.stringify({ type: "revoke-peer", peerId }));
            cleanupPeer(peerId);
          }
          return;
        }
      }

      session.write(key);
    });
  }

  session.onData((data: string) => {
    process.stdout.write(data);

    outputHistory += data;
    if (outputHistory.length > MAX_HISTORY) outputHistory = outputHistory.slice(-MAX_HISTORY);

    for (const peer of activePeers.values()) {
      if (peer.channelOpen && peer.dc.readyState === "open") {
        try { peer.dc.send(data); } catch { }
      }
    }
  });

  session.onExit(async () => {
    console.log("\n[myna] shell exited, closing session");
    for (const peerId of activePeers.keys()) cleanupPeer(peerId);
    ws.close();
    restoreTerminalAndExit(0);
  });

  process.stdout.on("resize", () => {
    const cols = process.stdout.columns;
    const rows = process.stdout.rows;
    if (cols && rows) {
      try { session.resize(cols, rows); } catch { }

      for (const peer of activePeers.values()) {
        if (peer.controlDc && peer.controlDc.readyState === "open") {
          try { peer.controlDc.send(JSON.stringify({ type: "resize", cols, rows })); } catch { }
        }
      }
    }
  });

  ws.on("open", () => ws.send(JSON.stringify({ type: "create-room" })));

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "room-created") {
        const domain = getShareDomain();
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
        const pc = createPeerConnection("host", msg.iceServers);
        const dc = pc.createDataChannel("terminal");
        const controlDc = pc.createDataChannel("control");

        const peerSession: PeerSession = {
          pc,
          dc,
          controlDc,
          role: msg.role,
          channelOpen: false,
          remoteDescSet: false,
          pendingCandidates: [],
        };
        activePeers.set(peerId, peerSession);

        controlDc.onopen = () => {
          const cols = process.stdout.columns;
          const rows = process.stdout.rows;
          if (cols && rows) {
            try { controlDc.send(JSON.stringify({ type: "resize", cols, rows })); } catch { }
          }
        };

        dc.onopen = () => {
          console.log(`\n[myna] data channel open for ${peerId.slice(0, 4)}`);
          peerSession.channelOpen = true;
          try {
            dc.send("\r\n\x1b[33m⚠️  [myna] Notice: Your input in this session is being audited and logged by the host.\x1b[0m\r\n");
          } catch { }

          if (outputHistory && !options.noReplay) {
            try { dc.send(outputHistory); } catch { }
          }
        };

        dc.onmessage = (event) => {
          if (peerSession.role !== "control") return;
          if (isFrozen) return;

          try {
            const m = JSON.parse(event.data.toString());
            if (m.type === "resize") {
              if (session.backend === "docker") {
                session.resize(m.cols, m.rows);
              }
              return;
            }
            if (m.type === "input" && typeof m.data === "string") {
              logGuestInput(peerId, m.data);
              return session.write(m.data);
            }
          } catch { }
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
        console.log(`\n[myna] peer ${msg.peerId.slice(0, 4)} disconnected`);
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
    } catch (err) {
      console.error("\n[myna] Error parsing signaling message:", (err as Error).message);
    }
  });
}