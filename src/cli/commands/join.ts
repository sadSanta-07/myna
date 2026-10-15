import WebSocket from "ws";
import { createPeerConnection } from "../../core/peer.js";
import { getSignalUrl } from "../../core/config.js";
import chalk from "chalk";

export async function runJoin(code: string, requestedRole: string) {
  const signalUrl = getSignalUrl();
  const ws = new WebSocket(signalUrl);

  function restoreTerminalAndExit(exitCode = 0) {
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } catch { }
    }
    process.exit(exitCode);
  }

  process.on("SIGINT", () => restoreTerminalAndExit(0));
  process.on("SIGTERM", () => restoreTerminalAndExit(0));
  process.on("uncaughtException", (err) => {
    console.error("\n[myna] Uncaught exception:", err.message);
    restoreTerminalAndExit(1);
  });

  ws.on("error", () => {
    console.error(`\n❌ Error: Cannot connect to the MYNA signaling server at ${signalUrl}`);
    restoreTerminalAndExit(1);
  });

  ws.on("close", () => {
    restoreTerminalAndExit(0);
  });

  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "join-room", code, requestedRole }));
  });

  let pc: RTCPeerConnection | null = null;
  let dc: RTCDataChannel | null = null;
  
  let pendingCandidates: any[] = [];

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "error") {
        console.error(chalk.red(`\n[myna] error: ${msg.message}`));
        restoreTerminalAndExit(1);
      }

      if (msg.type === "join-pending") {
        console.log(chalk.yellow("[myna] Waiting for host approval..."));
      }

      if (msg.type === "join-denied") {
        console.error(chalk.red("[myna] Host denied your join request."));
        restoreTerminalAndExit(1);
      }

      if (msg.type === "revoked") {
        console.error(chalk.red("\n[myna] Host revoked your access."));
        restoreTerminalAndExit(0);
      }

      if (msg.type === "host-left") {
        console.log(chalk.yellow("\n[myna] Host closed the session."));
        restoreTerminalAndExit(0);
      }

      if (msg.type === "joined") {
        console.log(chalk.green(`[myna] Joined as ${msg.role}. Establishing P2P connection...`));

        pc = createPeerConnection("guest", msg.iceServers);

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            ws.send(JSON.stringify({ type: "ice-candidate", candidate: event.candidate }));
          }
        };

        pc.ondatachannel = (event) => {
          dc = event.channel;
          dc.onopen = () => {
            console.log(chalk.greenBright("[myna] Terminal stream connected! (Ctrl+] to detach)\n"));
            if (process.stdin.isTTY) {
              process.stdin.setRawMode(true);
              process.stdin.resume();
              process.stdin.setEncoding("utf8");
            }
          };

          dc.onmessage = (e) => process.stdout.write(e.data);

          process.stdin.on("data", (data: string) => {
            if (data.includes("\x1d")) { // Ctrl+]
              console.log(chalk.yellow("\n[myna] Detached."));
              restoreTerminalAndExit(0);
            }
            if (dc && dc.readyState === "open") {
              dc.send(JSON.stringify({ type: "input", data }));
            }
          });

          process.stdout.on("resize", () => {
            const cols = process.stdout.columns;
            const rows = process.stdout.rows;
            if (cols && rows && dc && dc.readyState === "open") {
              dc.send(JSON.stringify({ type: "resize", cols, rows }));
            }
          });
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
            console.error("[myna] Error adding buffered ICE candidate:", err);
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
            console.error("[myna] Error adding ICE candidate:", err);
          }
        }
      }

    } catch (err) {
      console.error("\n[myna] Error parsing signaling message:", (err as Error).message);
    }
  });
}