import * as http from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as crypto from "crypto";

const ROOM_SECRET = process.env.ROOM_SECRET || "myna-dev-fallback-secret-2026";

function signCode(code: string): string {
  const hmac = crypto.createHmac("sha256", ROOM_SECRET);
  hmac.update(code);
  const sig = hmac.digest("hex").substring(0, 16);
  return `${code}.${sig}`;
}

interface SocketData {
  role: "host" | "guest" | "closed";
  code?: string;
  peerId?: string;
  status?: "pending" | "approved";
  socket: WebSocket;
}

export function startServer(port = 8080) {
  const rooms = new Map<string, Set<SocketData>>();

  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end("OK");
    }

    if (req.url === "/new" && req.method === "POST") {
      const rawCode = crypto.randomBytes(4).toString("hex");
      const signedCode = signCode(rawCode);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ code: signedCode }));
    }

    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    
    // Validate Signature BEFORE upgrading the WebSocket
    const roomMatch = url.pathname.match(/^\/room\/([a-f0-9]{8})\.([a-f0-9]{16})$/);
    if (!roomMatch) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    const rawCode = roomMatch[1];
    const providedSig = roomMatch[2];
    const expectedSig = signCode(rawCode).split(".")[1];

    if (providedSig !== expectedSig) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    const signedCode = `${rawCode}.${providedSig}`;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, signedCode);
    });
  });

  wss.on("connection", (ws: WebSocket, req: http.IncomingMessage, roomCode: string) => {
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, new Set());
    }
    const room = rooms.get(roomCode)!;
    
    const clientData: SocketData = { role: "guest", code: roomCode, socket: ws };
    room.add(clientData);

    ws.on("message", (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch { return; }

      const host = Array.from(room).find(c => c.role === "host");

      if (msg.type === "create-room") {
        if (host) return;
        clientData.role = "host";
        ws.send(JSON.stringify({ type: "room-created", code: roomCode }));
        return;
      }

      if (msg.type === "join-room") {
        if (clientData.role === "host") return;
        if (!host) {
          return ws.send(JSON.stringify({ type: "error", message: "Room not found or expired." }));
        }
        if (room.size > 6) {
          return ws.send(JSON.stringify({ type: "error", message: "Room is full." }));
        }

        const peerId = crypto.randomBytes(4).toString("hex");
        clientData.peerId = peerId;
        clientData.status = "pending";
        
        ws.send(JSON.stringify({ type: "join-pending", code: roomCode }));
        host.socket.send(JSON.stringify({
          type: "join-request",
          code: roomCode,
          peerId,
          requestedRole: msg.requestedRole === "control" ? "control" : "view",
        }));
        return;
      }

      const isHost = clientData.role === "host";

      if (["approve-peer", "deny-peer", "revoke-peer"].includes(String(msg.type))) {
        if (!isHost) return;
        const target = Array.from(room).find(c => c.peerId === msg.peerId);
        if (!target) return;

        if (msg.type === "approve-peer" && target.status === "pending") {
          const role = msg.role === "control" ? "control" : "view";
          target.status = "approved";
          
          // Provide static ICE servers for local dev (dynamic TURN requires Metered API key)
          const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
          
          target.socket.send(JSON.stringify({ type: "joined", code: roomCode, role, iceServers }));
          ws.send(JSON.stringify({ type: "peer-joined", code: roomCode, peerId: target.peerId, role, iceServers }));
        } else if (msg.type === "deny-peer" && target.status === "pending") {
          target.socket.send(JSON.stringify({ type: "join-denied", code: roomCode }));
        } else if (msg.type === "revoke-peer" && target.status === "approved") {
          target.socket.send(JSON.stringify({ type: "revoked" }));
        }
        return;
      }

      if (["sdp-offer", "sdp-answer", "ice-candidate"].includes(String(msg.type))) {
        if (isHost) {
          const target = Array.from(room).find(c => c.peerId === msg.peerId && c.status === "approved");
          if (target) target.socket.send(JSON.stringify(msg));
        } else if (clientData.peerId && clientData.status === "approved") {
          if (host) host.socket.send(JSON.stringify({ ...msg, peerId: clientData.peerId }));
        }
      }
    });

    ws.on("close", () => {
      room.delete(clientData);
      
      if (clientData.role === "host") {
        for (const peer of room) {
          if (peer.socket.readyState === WebSocket.OPEN) {
            peer.socket.send(JSON.stringify({ type: "host-left", code: roomCode }));
          }
        }
        rooms.delete(roomCode);
      } else if (clientData.peerId) {
        const host = Array.from(room).find(c => c.role === "host");
        if (host && host.socket.readyState === WebSocket.OPEN) {
          host.socket.send(JSON.stringify({
            type: clientData.status === "approved" ? "peer-left" : "join-request-cancelled",
            code: roomCode,
            peerId: clientData.peerId,
          }));
        }
      }
      
      if (room.size === 0) rooms.delete(roomCode);
    });
  });

  server.listen(port, () => {
    console.log(`\n[myna] Local Node signaling server running on port ${port}`);
    console.log(`[myna] To use this, set SIGNAL_URL=ws://localhost:${port} in your .env`);
  });
}