import WebSocket from "ws";
import { createPeerConnection } from "../../core/peer.js";
import chalk from "chalk";

export async function runJoin(code: string, requestedRole: string) {
  const signalUrl = process.env.SIGNAL_URL || "wss://myna-ag89.onrender.com";
  const ws = new WebSocket(signalUrl);

  ws.on("error", () => {
    console.error(`\n❌ Error: Cannot connect to the MYNA signaling server at ${signalUrl}`);
    process.exit(1);
  });
  
  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "join-room", code, requestedRole }));
  });

  ws.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString());

    if (msg.type === "error") {
      console.error(chalk.red(`\n[myna] error: ${msg.message}`));
      process.exit(1);
    }

    if (msg.type === "join-pending") {
      console.log(chalk.yellow("[myna] Waiting for host approval..."));
    }
    
    if (msg.type === "join-denied") {
      console.error(chalk.red("[myna] Host denied your join request."));
      process.exit(1);
    }
    
    if (msg.type === "revoked") {
      console.error(chalk.red("\n[myna] Host revoked your access."));
      process.exit(0);
    }
    
    if (msg.type === "host-left") {
      console.log(chalk.yellow("\n[myna] Host closed the session."));
      process.exit(0);
    }

    if (msg.type === "joined") {
      console.log(chalk.green(`[myna] Joined as ${msg.role}. Establishing P2P connection...`));
      
      const iceServers = msg.iceServers || [{ urls: "stun:stun.l.google.com:19302" }];
      const pc = createPeerConnection("peer", iceServers);
      let dc: RTCDataChannel;

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
            process.exit(0);
          }
          if (dc.readyState === "open") {
            dc.send(JSON.stringify({ type: "input", data }));
          }
        });

        process.stdout.on("resize", () => {
          const cols = process.stdout.columns;
          const rows = process.stdout.rows;
          if (cols && rows && dc.readyState === "open") {
            dc.send(JSON.stringify({ type: "resize", cols, rows }));
          }
        });
      };

      ws.on("message", async (innerRaw) => {
        const innerMsg = JSON.parse(innerRaw.toString());
        if (innerMsg.type === "sdp-offer") {
          await pc.setRemoteDescription(innerMsg.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: "sdp-answer", sdp: answer }));
        }
        if (innerMsg.type === "ice-candidate") {
          await pc.addIceCandidate(innerMsg.candidate);
        }
      });
    }
  });
}