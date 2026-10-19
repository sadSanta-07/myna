import WebSocket from "ws";
import * as path from "path";
import * as fs from "fs";
import * as net from "net";
import * as os from "os";
import { createPeerConnection } from "../../core/peer.js";
import { Session } from "../../core/types.js";
import { getSignalUrl, getShareDomain } from "../../core/config.js";
import { logGuestInput } from "../../core/audit.js";
import { isDangerousCommand } from "../../core/guardrail.js";
import { printSessionPanel } from "../ui/panel.js";

interface GuardrailRequest {
  cmd: string;
  res: {
    writeHead: (statusCode: number, headers?: Record<string, string>) => void;
    end: (data: string) => void;
  };
}

let pendingGuardrail: GuardrailRequest | null = null;
let isFrozen = false;
let guardrailTimeout: NodeJS.Timeout | null = null;

export async function runUp(session: Session, options: { noReplay?: boolean; verbose?: boolean } = {}) {
  const logVerbose = (...args: unknown[]) => {
    if (options.verbose) {
      console.log(...args);
    }
  };

  const signalWsUrl = getSignalUrl();
  const signalHttpUrl = signalWsUrl.replace(/^ws/, "http");

  let roomCode = "";
  try {
    const res = await fetch(`${signalHttpUrl}/new`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to provision room");
    const data = await (res.json() as Promise<{ code: string }>);
    roomCode = data.code;
  } catch (err) {
    console.error(`\nError: Cannot provision room from MYNA signaling server at ${signalHttpUrl}`, err);
    console.error("Please check your internet connection or try again later.\n");
    process.exit(1);
  }

  const ws = new WebSocket(`${signalWsUrl}/room/${roomCode}`);

  const sessionId = Math.random().toString(36).substring(2, 10);
  const pipePath = process.platform === "win32"
    ? `\\\\.\\pipe\\myna-gate-${sessionId}`
    : path.join(os.tmpdir(), `myna-gate-${sessionId}.sock`);

  if (process.platform !== "win32" && fs.existsSync(pipePath)) {
    try { fs.unlinkSync(pipePath); } catch (err) { if ((err as NodeJS.ErrnoException).code !== "ENOENT") console.warn("[myna] Could not remove stale guard pipe.", { pipePath, err }); }
  }

  process.env.MYNA_GATE_PIPE = pipePath;

  const gateServer = net.createServer((socket) => {
    socket.on("data", (data) => {
      try {
        const { cmd } = JSON.parse(data.toString());
        if (isDangerousCommand(cmd)) {
          isFrozen = true;
          guardrailTimeout = setTimeout(() => {
            if (pendingGuardrail) {
              process.stdout.write(`\r\n\n[myna] Guardrail timeout reached (30s). Auto-denying to protect host.\r\n`);
              try { pendingGuardrail.res.writeHead(200, { "Content-Type": "application/json" }); } catch (err) { logVerbose("[myna] Could not set guardrail timeout response headers:", err); }
              try { pendingGuardrail.res.end(JSON.stringify({ allowed: false })); } catch (err) { logVerbose("[myna] Failed to return guardrail timeout denial:", err); }
              isFrozen = false;
              pendingGuardrail = null;
            }
          }, 30000);

          pendingGuardrail = {
            cmd,
            res: {
              writeHead: () => { },
              end: (responseStr: string) => {
                socket.write(responseStr);
                socket.end();
              }
            }
          };
          process.stdout.write(
            `\r\n\n[myna] GUARDRAIL: Guest is attempting to run:\r\n` +
            `   > ${cmd}\r\n` +
            `   Press [Ctrl+] then Y] to Allow | [Ctrl+] then N] to Block: `
          );
        } else {
          socket.write(JSON.stringify({ allowed: true }));
          socket.end();
        }
      } catch {
        socket.end();
      }
    });
  });

  gateServer.listen(pipePath, () => {
    if (process.platform !== "win32") {
      try { fs.chmodSync(pipePath, 0o600); } catch (err) { console.error("[myna] Failed to restrict guard pipe permissions; stopping session startup.", { pipePath, err }); gateServer.close(() => { session.kill(); process.exit(1); }); }
    }
  });

  setTimeout(() => {
    if (session.backend === "native") {
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
    }
  }, 300);

  function restoreTerminalAndExit(code = 0) {
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } catch (err) { logVerbose("[myna] Failed to restore terminal mode:", err); }
    }
    try { gateServer.close(); } catch (err) { logVerbose("[myna] Failed to close guard server:", err); }
    try { session.kill(); } catch (err) { logVerbose("[myna] Failed to stop terminal session:", err); }
    process.exit(code);
  }

  process.on("SIGINT", () => restoreTerminalAndExit(0));
  process.on("SIGTERM", () => restoreTerminalAndExit(0));
  process.on("uncaughtException", (err) => {
    console.error("\n[myna] Uncaught exception:", err.message);
    restoreTerminalAndExit(1);
  });

  ws.on("error", () => {
    console.error(`\nError: Cannot connect to the MYNA signaling server at ${signalWsUrl}`);
    console.error("Please check your internet connection or try again later.\n");
    restoreTerminalAndExit(1);
  });

  ws.on("close", () => {
    logVerbose("\n[myna] Signaling connection closed");
  });

  interface PeerSession {
    pc: RTCPeerConnection;
    dc: RTCDataChannel;
    controlDc?: RTCDataChannel;
    role: "view" | "control";
    channelOpen: boolean;
    remoteDescSet: boolean;
    pendingCandidates: RTCIceCandidateInit[];
    outboundQueue: string[];
  }

  const activePeers = new Map<string, PeerSession>();
  let outputHistory = "";
  const MAX_HISTORY = 20000;

  function attemptSend(peer: PeerSession, chunk?: string) {
    if (chunk) peer.outboundQueue.push(chunk);

    while (peer.outboundQueue.length > 0 && peer.dc.bufferedAmount < 65536) {
      const data = peer.outboundQueue.shift();
      if (data) {
        try {
          peer.dc.send(data);
        } catch (err) {
          peer.outboundQueue.unshift(data);
          break;
        }
      }
    }
    if (peer.outboundQueue.length > 500) {
      peer.outboundQueue.splice(0, peer.outboundQueue.length - 500);
    }
  }

  interface JoinRequest { peerId: string; requestedRole: string; }
  const joinQueue: JoinRequest[] = [];
  let currentRequest: JoinRequest | null = null;

  function cleanupPeer(peerId: string) {
    const peer = activePeers.get(peerId);
    if (!peer) return;
    try { peer.dc.close(); } catch (err) { logVerbose("[myna] Failed to close peer terminal channel:", err); }
    if (peer.controlDc) try { peer.controlDc.close(); } catch (err) { logVerbose("[myna] Failed to close peer control channel:", err); }
    try { peer.pc.close(); } catch (err) { logVerbose("[myna] Failed to close peer connection:", err); }
    activePeers.delete(peerId);
  }

  function processNextJoinRequest() {
    if (currentRequest || joinQueue.length === 0) return;
    currentRequest = joinQueue.shift()!;
    process.stdout.write(
      `\n[myna] Peer (${currentRequest.peerId.slice(0, 4)}) wants to join as ${currentRequest.requestedRole}.\n` +
      `       Press [Ctrl+] then C] Control | [Ctrl+] then V] View | [Ctrl+] then D] Deny: `
    );
  }

  let leaderActive = false;
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (key: string) => {
      if (key === "\x1d") {
        leaderActive = true;
        return;
      }

      if (leaderActive) {
        leaderActive = false;
        const cmd = key.toLowerCase();

        if (pendingGuardrail) {
          if (guardrailTimeout) clearTimeout(guardrailTimeout);
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
          } else if (cmd === "d") {
            ws.send(JSON.stringify({ type: "deny-peer", peerId }));
            console.log(`\n[myna] Denied ${peerId.slice(0, 4)}`);
          }
          currentRequest = null;
          processNextJoinRequest();
          return;
        }

        if (cmd === "f") {
          isFrozen = !isFrozen;
          console.log(`\n[myna] Session ${isFrozen ? "FROZEN" : "UNFROZEN"}`);
          return;
        }

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

    if (outputHistory.length < MAX_HISTORY) {
      outputHistory += data;
    }
    for (const peer of activePeers.values()) {
      if (peer.channelOpen && peer.dc.readyState === "open") {
        attemptSend(peer, data);
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
      try { session.resize(cols, rows); } catch (err) { logVerbose("[myna] Failed to resize local terminal:", err); }

      for (const peer of activePeers.values()) {
        if (peer.controlDc && peer.controlDc.readyState === "open") {
          try { peer.controlDc.send(JSON.stringify({ type: "resize", cols, rows })); } catch (err) { logVerbose("[myna] Failed to send peer terminal resize:", err); }
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
        printSessionPanel({
          roomCode: msg.code,
          shareLink: `${domain}/#${msg.code}`,
        });
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
          outboundQueue: [],
        };
        activePeers.set(peerId, peerSession);

        dc.bufferedAmountLowThreshold = 32768;
        dc.onbufferedamountlow = () => {
          const p = activePeers.get(peerId);
          if (p) attemptSend(p);
        };

        controlDc.onopen = () => {
          const cols = process.stdout.columns;
          const rows = process.stdout.rows;
          if (cols && rows) {
            try { controlDc.send(JSON.stringify({ type: "resize", cols, rows })); } catch (err) { logVerbose("[myna] Failed to send initial terminal resize:", err); }
          }
        };

        dc.onopen = () => {
          logVerbose(`\n[myna] data channel open for ${peerId.slice(0, 4)}`);
          peerSession.channelOpen = true;
          try {
            dc.send("\r\n\x1b[33m[myna] Notice: Your input in this session is being audited and logged by the host.\x1b[0m\r\n");
          } catch (err) { logVerbose("[myna] Could not send session audit notice:", err); }

          if (outputHistory && !options.noReplay) {
            try { dc.send(outputHistory); } catch (err) { logVerbose("[myna] Could not replay terminal history to peer:", err); }
          }
        };

        let guestLineBuffer = "";

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

              for (const char of m.data) {
                if (char === "\r" || char === "\n") {
                  const cmd = guestLineBuffer.trim();
                  guestLineBuffer = "";

                  if (cmd && isDangerousCommand(cmd)) {
                    isFrozen = true;
                    guardrailTimeout = setTimeout(() => {
                      if (pendingGuardrail) {
                        process.stdout.write(`\r\n\n[myna] Guardrail timeout reached (30s). Auto-denying to protect host.\r\n`);
                        try { pendingGuardrail.res.end(JSON.stringify({ allowed: false })); } catch (err) { logVerbose("[myna] Failed to return guardrail timeout denial:", err); }
                        isFrozen = false;
                        pendingGuardrail = null;
                      }
                    }, 30000);

                    process.stdout.write(
                      `\r\n\n[myna] GUARDRAIL: Guest attempted dangerous command:\r\n` +
                      `   Press [Ctrl+] then Y] to Allow | [Ctrl+] then N] to Block: `
                    );
                    pendingGuardrail = {
                      cmd,
                      res: {
                        writeHead: () => { },
                        end: (responseStr: string) => {
                          const allowed = JSON.parse(responseStr).allowed;
                          if (allowed) {
                            session.write(m.data);
                          } else {
                            console.log(`\r\n[myna] Command blocked.`);
                          }
                        }
                      }
                    };
                    return;
                  }
                } else if (char === "\b" || char === "\x7f") {
                  guestLineBuffer = guestLineBuffer.slice(0, -1);
                } else if (char.charCodeAt(0) >= 32) {
                  guestLineBuffer += char;
                }
              }

              return session.write(m.data);
            }
          } catch (err) { logVerbose("[myna] Failed to process guest terminal input:", err); }
        };

        pc.oniceconnectionstatechange = async () => {
          logVerbose(`[myna] ICE state for ${peerId.slice(0, 4)}: ${pc.iceConnectionState}`);

          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            logVerbose(`[myna] Connection blip detected for ${peerId.slice(0, 4)}. Attempting ICE restart...`);
            try {
              const offer = await pc.createOffer({ iceRestart: true });
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: "sdp-offer", peerId, sdp: offer }));
            } catch (err) {
              logVerbose(`[myna] ICE restart failed for ${peerId.slice(0, 4)}:`, err);
            }
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