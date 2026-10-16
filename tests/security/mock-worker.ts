// A small stand-in for the signaling Worker, used ONLY to check that the attack scripts
// can tell a safe server from an unsafe one. It is not your Worker.
//
//   MODE=secure     npx tsx tests/security/selftest/mock-worker.ts
//   MODE=vulnerable npx tsx tests/security/selftest/mock-worker.ts
//
// The vulnerable mode deliberately reproduces the flaws found in review: non-host approval,
// static TURN credentials, no rate limits, unknown codes accepted, no state guards, sockets
// left open after deny/revoke.
import http from "node:http";
import { randomBytes } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";

const MODE = process.env.MODE ?? "secure";
const PORT = Number(process.env.PORT ?? 8787);
const secure = MODE === "secure";

interface Guest {
  ws: WebSocket;
  peerId: string;
  status: "pending" | "approved";
}
interface Room {
  host: WebSocket | null;
  guests: Map<string, Guest>;
}
const rooms = new Map<string, Room>();
const role = new WeakMap<WebSocket, { kind: "host" | "guest"; code: string; peerId?: string }>();
const newHits: number[] = [];
const badUpgrades: number[] = [];
const recent = (arr: number[], windowMs: number) => arr.filter((t) => Date.now() - t < windowMs).length;

const staticCred = { username: "static-user", credential: "static-pass" };
const iceFor = () =>
  secure
    ? [{ urls: "turn:example.invalid:3478", username: `${Math.floor(Date.now() / 1000) + 600}:${randomBytes(3).toString("hex")}`, credential: randomBytes(8).toString("hex") }]
    : [{ urls: "turn:example.invalid:3478", ...staticCred }];

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/new") {
    newHits.push(Date.now());
    if (secure && recent(newHits, 60_000) > 20) {
      res.writeHead(429).end("slow down");
      return;
    }
    const code = randomBytes(4).toString("hex");
    rooms.set(code, { host: null, guests: new Map() });
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ code }));
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => {
  const m = /^\/room\/([A-Za-z0-9_-]+)$/.exec(req.url ?? "");
  const code = m?.[1];
  if (secure && (!code || !rooms.has(code))) {
    badUpgrades.push(Date.now());
    const status = recent(badUpgrades, 60_000) > 30 ? "429 Too Many Requests" : "404 Not Found";
    socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    if (code && !rooms.has(code)) rooms.set(code, { host: null, guests: new Map() }); // vulnerable: lazily creates
    wss.emit("connection", ws, code);
  });
});

wss.on("connection", (ws: WebSocket, code: string) => {
  const send = (to: WebSocket | null | undefined, o: unknown) => to?.readyState === WebSocket.OPEN && to.send(JSON.stringify(o));

  ws.on("message", (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const room = rooms.get(code);
    if (!room) return;
    const own = role.get(ws);

    if (msg.type === "create-room") {
      if (secure && (own || room.host)) return; // state guard
      room.host = ws;
      role.set(ws, { kind: "host", code });
      send(ws, { type: "room-created", code });
      return;
    }

    if (msg.type === "join-room") {
      if (secure && own) return; // state guard
      if (!room.host) return send(ws, { type: "error", message: "room not found" });
      const peerId = randomBytes(4).toString("hex");
      room.guests.set(peerId, { ws, peerId, status: "pending" });
      role.set(ws, { kind: "guest", code, peerId });
      send(ws, { type: "join-pending", code });
      send(room.host, { type: "join-request", code, peerId, requestedRole: msg.requestedRole === "control" ? "control" : "view" });
      return;
    }

    if (["approve-peer", "deny-peer", "revoke-peer"].includes(msg.type)) {
      if (secure && own?.kind !== "host") return; // only the host may decide
      const target = room.guests.get(String(msg.peerId));
      if (!target) return;
      const r = msg.role === "control" ? "control" : "view";
      if (msg.type === "approve-peer" && target.status === "pending") {
        target.status = "approved";
        send(target.ws, { type: "joined", code, role: r, iceServers: iceFor() });
        send(room.host, { type: "peer-joined", code, peerId: target.peerId, role: r, iceServers: iceFor() });
      } else if (msg.type === "deny-peer") {
        send(target.ws, { type: "join-denied", code });
        if (secure) target.ws.close(1000, "denied");
      } else if (msg.type === "revoke-peer") {
        send(target.ws, { type: "revoked" });
        if (secure) target.ws.close(1000, "revoked");
      }
      return;
    }

    if (["sdp-offer", "sdp-answer", "ice-candidate"].includes(msg.type)) {
      if (own?.kind === "host") {
        const t = room.guests.get(String(msg.peerId));
        if (t?.status === "approved") send(t.ws, msg);
      } else if (own?.kind === "guest") {
        const g = room.guests.get(own.peerId!);
        if (g?.status === "approved" || !secure) send(room.host, { ...msg, peerId: own.peerId });
      }
    }
  });

  ws.on("close", () => {
    const own = role.get(ws);
    const room = rooms.get(code);
    if (own?.kind === "guest" && room) {
      const g = room.guests.get(own.peerId!);
      if (g) send(room.host, { type: g.status === "approved" ? "peer-left" : "join-request-cancelled", peerId: own.peerId });
    }
  });
});

server.listen(PORT, "127.0.0.1", () => console.log(`[mock-worker] ${MODE} mode on http://127.0.0.1:${PORT}`));
