import WebSocket from "ws";
import { createPeerConnection } from "../../core/peer.js";
import { getSignalUrl } from "../../core/config.js";

export async function runJoin(roomCode: string, requestedRole: string, options: { verbose?: boolean } = {}) {
  const logVerbose = (...args: any[]) => {
    if (options.verbose) {
      console.log(...args);
    }
  };

  const signalUrl = getSignalUrl();
  const ws = new WebSocket(signalUrl);

  function restoreTerminalAndExit(code = 0) {
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } catch { }
    }
    process.exit(code);
  }

  process.on("SIGINT", () => restoreTerminalAndExit(0));
  process.on("SIGTERM", () => restoreTerminalAndExit(0));

  ws.on("error", () => {
    console.error(`\n❌ Error: Cannot connect to the MYNA signaling server at ${signalUrl}`);
    console.error("Please check your internet connection or try again later.\n");
    restoreTerminalAndExit(1);
  });

  ws.on("open", () => {
    logVerbose(`[myna] Connected to signaling server. Requesting to join room ${roomCode}...`);
    ws.send(JSON.stringify({ type: "join-room", code: roomCode, requestedRole }));
  });

  let pc: RTCPeerConnection | null = null;
  let dc: RTCDataChannel | null = null;
  let controlDc: RTCDataChannel | null = null;
  let pendingCandidates: any[] = [];

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (key: string) => {
      if (key === "\x03") { // Ctrl+C
        restoreTerminalAndExit(0);
      }
      if (dc && dc.readyState === "open" && requestedRole === "control") {
        try {
          dc.send(JSON.stringify({ type: "input", data: key }));
        } catch { }
      }
    });
  }

  process.stdout.on("resize", () => {
    const cols = process.stdout.columns;
    const rows = process.stdout.rows;
    if (cols && rows && controlDc && controlDc.readyState === "open" && requestedRole === "control") {
      try {
        controlDc.send(JSON.stringify({ type: "resize", cols, rows }));
      } catch { }
    }
  });

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "error") {
        console.error(`\n❌ Error from server: ${msg.message}`);
        restoreTerminalAndExit(1);
      }

      if (msg.type === "join-pending") {
        console.log("\n[myna] Waiting for the host to approve your request...");
      }

      if (msg.type === "join-denied") {
        console.log("\n❌ The host denied your request to join.");
        restoreTerminalAndExit(0);
      }

      if (msg.type === "peer-revoked") {
        console.log("\n❌ The host revoked your access to the session.");
        restoreTerminalAndExit(0);
      }

      if (msg.type === "join-approved") {
        logVerbose(`[myna] Host approved join request as ${msg.role}. Establishing P2P connection...`);
        requestedRole = msg.role;
        pc = createPeerConnection("guest", msg.iceServers);

        pc.oniceconnectionstatechange = () => {
          logVerbose(`[myna] Connection state: ${pc?.iceConnectionState}`);
          if (pc?.iceConnectionState === "failed" || pc?.iceConnectionState === "disconnected") {
            console.error("\n❌ Connection lost to the host. The session has ended.");
            restoreTerminalAndExit(1);
          }
        };

        pc.ondatachannel = (event) => {
          const channel = event.channel;

          if (channel.label === "terminal") {
            dc = channel;
            dc.onopen = () => {
              logVerbose("[myna] Terminal data channel open.");
            };
            dc.onmessage = (e) => {
              process.stdout.write(e.data.toString());
            };
            dc.onclose = () => {
              console.log("\n[myna] Host closed the session.");
              restoreTerminalAndExit(0);
            };
          } else if (channel.label === "control") {
            controlDc = channel;
            controlDc.onopen = () => {
              logVerbose("[myna] Control data channel open.");
              const cols = process.stdout.columns;
              const rows = process.stdout.rows;
              if (cols && rows && requestedRole === "control") {
                try {
                  controlDc?.send(JSON.stringify({ type: "resize", cols, rows }));
                } catch { }
              }
            };
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            ws.send(JSON.stringify({ type: "ice-candidate", candidate: event.candidate }));
          }
        };
      }

      if (msg.type === "sdp-offer") {
        if (!pc) return;
        
        await pc.setRemoteDescription(msg.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: "sdp-answer", sdp: answer }));

        for (const candidate of pendingCandidates) {
          try {
            await pc.addIceCandidate(candidate);
          } catch (err) {
            logVerbose("[myna] Error adding buffered ICE candidate:", err);
          }
        }
        pendingCandidates = [];
      }

      if (msg.type === "ice-candidate") {
        if (!pc) return;
        
        if (!pc.remoteDescription || !pc.remoteDescription.type) {
          pendingCandidates.push(msg.candidate);
        } else {
          try {
            await pc.addIceCandidate(msg.candidate);
          } catch (err) {
            logVerbose("[myna] Error adding ICE candidate:", err);
          }
        }
      }
    } catch (err) {
      logVerbose("[myna] Error parsing signaling message:", (err as Error).message);
    }
  });
}