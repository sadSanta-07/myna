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
import {
  printSessionPanel,
  printJoinRequest,
  printGuardrailPrompt,
  printNotice,
} from "../ui/panel.js";
import { printMynaHelp } from "../ui/help.js";
import { printStats } from "../ui/stats.js";
import { printDiagnostics } from "../ui/diagnostics.js";
import { printStatus, printPeers } from "../ui/status.js";

interface GuardrailRequest {
  cmd: string;
  res: {
    writeHead: (statusCode: number, headers?: any) => void;
    end: (data: string) => void;
  };
}

let pendingGuardrail: GuardrailRequest | null = null;
let isFrozen = false;
let guardrailTimeout: NodeJS.Timeout | null = null;

export async function runUp(session: Session, options: { noReplay?: boolean; verbose?: boolean } = {}) {
  const logVerbose = (...args: any[]) => {
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
    console.error(`\n❌ Error: Cannot provision room from MYNA signaling server at ${signalHttpUrl}`);
    console.error("Please check your internet connection or try again later.\n");
    process.exit(1);
  }

  const ws = new WebSocket(`${signalWsUrl}/room/${roomCode}`);
  const sessionStartedAt = Date.now();


  const sessionId = Math.random().toString(36).substring(2, 10);
  const pipePath = process.platform === "win32"
    ? `\\\\.\\pipe\\myna-gate-${sessionId}`
    : path.join(os.tmpdir(), `myna-gate-${sessionId}.sock`);

  if (process.platform !== "win32" && fs.existsSync(pipePath)) {
    try { fs.unlinkSync(pipePath); } catch { }
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
              printGuardrailPrompt(cmd);
              try { pendingGuardrail.res.writeHead(200, { "Content-Type": "application/json" }); } catch { }
              try { pendingGuardrail.res.end(JSON.stringify({ allowed: false })); } catch { }
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
            `\r\n\n⚠️  [myna] GUARDRAIL: Guest is attempting to run:\r\n` +
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
      try {
        fs.chmodSync(pipePath, 0o600);
      } catch {
        // Preserve the existing socket permissions if chmod is unavailable.
      }
    }

    if (session.backend !== "native") return;

    const hookPath = process.platform === "win32"
      ? path.resolve(process.cwd(), "myna-hook.ps1")
      : path.resolve(process.cwd(), "myna-hook.sh");

    if (!fs.existsSync(hookPath)) return;

    if (process.platform === "win32") {
      const escapedPipe = pipePath.replace(/'/g, "''");
      const escapedHook = hookPath.replace(/'/g, "''");

      session.write(
        `$env:MYNA_GATE_PIPE = '${escapedPipe}'; . '${escapedHook}'\r`,
      );
    } else {
      const escapedPipe = pipePath.replace(/'/g, "'\\''");
      const escapedHook = hookPath.replace(/'/g, "'\\''");

      session.write(
        `export MYNA_GATE_PIPE='${escapedPipe}'; source '${escapedHook}'\n`,
      );
    }
  });

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

  ws.on("error", (err: Error) => {
    console.error(
      `\n[MYNA] Signaling connection failed: ${err.message}`,
    );
    console.error(`Endpoint: ${signalWsUrl}`);
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
    pendingCandidates: any[];
    outboundQueue: string[];
  }

  const activePeers = new Map<string, PeerSession>();

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
    try { peer.dc.close(); } catch { }
    if (peer.controlDc) try { peer.controlDc.close(); } catch { }
    try { peer.pc.close(); } catch { }
    activePeers.delete(peerId);
  }

  function processNextJoinRequest() {
    if (currentRequest || joinQueue.length === 0) return;

    currentRequest = joinQueue.shift()!;

    printJoinRequest(
      currentRequest.peerId,
      currentRequest.requestedRole,
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
            printNotice(
              `Approved peer ${peerId.slice(0, 4)} with ${role} access.`,
              "success",
            );
          } else if (cmd === "d") {
            ws.send(JSON.stringify({ type: "deny-peer", peerId }));
            printNotice(
              `Denied peer ${peerId.slice(0, 4)}.`,
              "warning",
            );
          }
          currentRequest = null;
          processNextJoinRequest();
          return;
        }

        if (cmd === "h") {
          printMynaHelp();
          return;
        }

        if (cmd === "s") {
          printStatus({
            roomCode,
            backend: session.backend,
            peerIds: [...activePeers.keys()],
            startedAt: sessionStartedAt,
          });
          return;
        }

        if (cmd === "t") {
          void printStats().catch((err: unknown) => {
            console.error(
              "\n[myna] Could not collect resource statistics:",
              err instanceof Error ? err.message : String(err),
            );
          });
          return;
        }

        if (cmd === "p") {
          printPeers([...activePeers.keys()]);
          return;
        }

        if (cmd === "l") {
          printDiagnostics({
            backend: session.backend,
            signalingUrl: signalWsUrl,
          });
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
          printNotice(
            `Peer ${msg.peerId.slice(0, 4)} disconnected. Join request cancelled.`,
            "warning",
          );
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
            try { controlDc.send(JSON.stringify({ type: "resize", cols, rows })); } catch { }
          }
        };

        dc.onopen = () => {
          logVerbose(`\n[myna] data channel open for ${peerId.slice(0, 4)}`);
          peerSession.channelOpen = true;
          try {
            dc.send("\r\n\x1b[33m⚠️  [myna] Notice: Your input in this session is being audited and logged by the host.\x1b[0m\r\n");
          } catch { }
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

              if (pendingGuardrail || isFrozen) {
                return;
              }

              for (const char of m.data) {
                if (char === "\r" || char === "\n") {
                  const cmd = guestLineBuffer.trim();
                  guestLineBuffer = "";

                  if (cmd && isDangerousCommand(cmd)) {
                    isFrozen = true;

                    guardrailTimeout = setTimeout(() => {
                      if (pendingGuardrail) {
                        process.stdout.write(
                          "\r\n[myna] Guardrail timeout reached (30s). Auto-denying to protect host.\r\n"
                        );
                        try {
                          pendingGuardrail.res.end(JSON.stringify({ allowed: false }));
                        } catch { }
                        isFrozen = false;
                        pendingGuardrail = null;
                      }
                    }, 30000);

                    printGuardrailPrompt(cmd);

                    pendingGuardrail = {
                      cmd,
                      res: {
                        writeHead: () => { },
                        end: (responseStr: string) => {
                          const allowed = JSON.parse(responseStr).allowed;

                          if (allowed) {
                            session.write(`${cmd}\r`);
                          } else {
                            process.stdout.write("\r\n[myna] Command blocked.\r\n");
                          }
                        },
                      },
                    };

                    return;
                  }
                } else if (char === "\b" || char === "\x7f") {
                  guestLineBuffer = guestLineBuffer.slice(0, -1);
                } else if (char.charCodeAt(0) >= 32) {
                  guestLineBuffer += char;
                }
              }

              session.write(m.data);
              return;
            }

          } catch { }
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