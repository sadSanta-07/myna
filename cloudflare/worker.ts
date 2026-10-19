/// <reference types="@cloudflare/workers-types" />
export interface Env {
  MYNA_ROOMS: DurableObjectNamespace;
  ROOM_SECRET: string;
  METERED_DOMAIN?: string;
  METERED_API_KEY?: string;
  CORS_ALLOWED_ORIGINS?: string;
  ASSETS: Fetcher;
}

const ipRateLimit = new Map<string, { hits: number; expire: number }>();

async function signCode(code: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(code));
  const hashHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${code}.${hashHex.substring(0, 16)}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ip = request.headers.get("cf-connecting-ip") || "unknown-ip";
    const now = Date.now();
    let rl = ipRateLimit.get(ip);
    if (!rl || now > rl.expire) rl = { hits: 0, expire: now + 60000 };
    rl.hits++;
    ipRateLimit.set(ip, rl);

    if (rl.hits > 30) {
      return new Response("Too many requests", { status: 429 });
    }
    const url = new URL(request.url);

    const secret = env.ROOM_SECRET;
    if (!secret) {
      return new Response("Fatal Error: ROOM_SECRET is not configured. Failing closed.", { status: 500 });
    }

    if (url.pathname === "/health") {
      return new Response("OK", { headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    if (url.pathname === "/new" && request.method === "POST") {
      const rawCode = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

      const signedCode = await signCode(rawCode, secret);

      const origin = request.headers.get("Origin");
      const allowedOrigins = (env.CORS_ALLOWED_ORIGINS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (origin && !allowedOrigins.includes(origin)) {
        return new Response("Origin is not allowed", { status: 403 });
      }

      const headers = new Headers({ "Content-Type": "application/json" });
      headers.set("Vary", "Origin");
      if (origin && allowedOrigins.includes(origin)) {
        headers.set("Access-Control-Allow-Origin", origin);
      }

      return new Response(JSON.stringify({ code: signedCode }), { headers });
    }

    const roomMatch = url.pathname.match(/^\/room\/([a-f0-9]{8})\.([a-f0-9]{16})$/);
    if (roomMatch && request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      const rawCode = roomMatch[1];
      const providedSig = roomMatch[2];

      const expectedSignedCode = await signCode(rawCode, secret);
      const expectedSig = expectedSignedCode.split(".")[1];

      if (providedSig !== expectedSig) {
        return new Response("Forbidden: Invalid or forged room code", { status: 403 });
      }

      const id = env.MYNA_ROOMS.idFromName(rawCode);
      return env.MYNA_ROOMS.get(id).fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};

interface SocketData {
  role: "host" | "guest" | "closed";
  code?: string;
  peerId?: string;
  status?: "pending" | "approved";
}

interface SignalMessage {
  type?: string;
  code?: string;
  peerId?: string;
  requestedRole?: string;
  role?: string;
  [key: string]: unknown;
}

export class MynaRooms {
  private roomIceServers: RTCIceServer[] | null = null;

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env
  ) { }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected a WebSocket upgrade", { status: 426 });
    }

    const url = new URL(request.url);
    const roomCode = url.pathname.split("/").pop();

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role: "guest", code: roomCode } satisfies SocketData);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let msg: SignalMessage;
    try {
      const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
      msg = JSON.parse(text) as SignalMessage;
      if (!msg || typeof msg !== "object") return;
    } catch {
      return;
    }

    const own = this.data(socket);
    if (!own || own.role === "closed" || !own.code) return;

    const code = own.code;
    const roomSockets = this.ctx.getWebSockets();
    const host = roomSockets.find((candidate) => this.data(candidate)?.role === "host");

    if (msg.type === "create-room") {
      if (host || own.role === "host") return;

      socket.serializeAttachment({ role: "host", code } satisfies SocketData);
      socket.send(JSON.stringify({ type: "room-created", code }));

      if (!this.roomIceServers) {
        this.fetchDynamicTurn().then(servers => {
          this.roomIceServers = servers;
        }).catch((err) => { console.error("[myna] Failed to initialize TURN servers; STUN fallback remains active.", err); });
      }
      return;
    }

    if (msg.type === "join-room") {
      if (own.role === "host" || own.peerId) return;
      if (!host) {
        socket.send(JSON.stringify({ type: "error", message: "Room not found or expired." }));
        return;
      }

      if (roomSockets.length >= 6) {
        socket.send(JSON.stringify({ type: "error", message: "Room is full." }));
        return;
      }

      const peerId = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      socket.serializeAttachment({ role: "guest", code, peerId, status: "pending" } satisfies SocketData);
      socket.send(JSON.stringify({ type: "join-pending", code }));
      host.send(JSON.stringify({
        type: "join-request",
        code,
        peerId,
        requestedRole: msg.requestedRole === "control" ? "control" : "view",
      }));
      return;
    }

    const isHost = own.role === "host";

    if (["approve-peer", "deny-peer", "revoke-peer"].includes(String(msg.type))) {
      if (!isHost) return;

      const targetId = typeof msg.peerId === "string" ? msg.peerId : "";
      const target = roomSockets.find((candidate) => this.data(candidate)?.peerId === targetId);
      const targetData = target ? this.data(target) : undefined;
      if (!target || !targetData) return;

      if (msg.type === "approve-peer" && targetData.status === "pending") {
        const role = msg.role === "control" ? "control" : "view";
        target.serializeAttachment({ ...targetData, status: "approved" } satisfies SocketData);

        if (!this.roomIceServers) {
          this.roomIceServers = await this.fetchDynamicTurn();
        }

        target.send(JSON.stringify({ type: "joined", code, role, iceServers: this.roomIceServers }));
        socket.send(JSON.stringify({ type: "peer-joined", code, peerId: targetId, role, iceServers: this.roomIceServers }));
      } else if (msg.type === "deny-peer" && targetData.status === "pending") {
        target.send(JSON.stringify({ type: "join-denied", code }));
        target.serializeAttachment({ role: "closed" } satisfies SocketData);
        target.close(4000, "Denied");
      } else if (msg.type === "revoke-peer" && targetData.status === "approved") {
        target.send(JSON.stringify({ type: "revoked" }));
        target.serializeAttachment({ role: "closed" } satisfies SocketData);
        target.close(4000, "Revoked");
      }
      return;
    }

    if (["sdp-offer", "sdp-answer", "ice-candidate"].includes(String(msg.type))) {
      if (isHost) {
        const targetId = typeof msg.peerId === "string" ? msg.peerId : "";
        const target = roomSockets.find((candidate) => {
          const data = this.data(candidate);
          return data?.peerId === targetId && data.status === "approved";
        });
        if (target) target.send(JSON.stringify(msg));
      } else if (own.peerId && own.status === "approved") {
        if (host) host.send(JSON.stringify({ ...msg, peerId: own.peerId }));
      }
    }
  }

  webSocketClose(socket: WebSocket): void {
    const own = this.data(socket);
    if (!own?.code) return;

    const roomSockets = this.ctx.getWebSockets();

    if (own.role === "host") {
      for (const peer of roomSockets) {
        if (peer === socket) continue;
        try { peer.send(JSON.stringify({ type: "host-left", code: own.code })); } catch (err) { console.warn("[myna] Could not notify peer that host left; the socket may already be closed.", err); }
        peer.serializeAttachment({ role: "closed" } satisfies SocketData);
      }
      return;
    }

    if (own.peerId) {
      const host = roomSockets.find((candidate: WebSocket) => this.data(candidate)?.role === "host");
      if (host) {
        host.send(JSON.stringify({
          type: own.status === "approved" ? "peer-left" : "join-request-cancelled",
          code: own.code,
          peerId: own.peerId,
        }));
      }
    }
  }

  webSocketError(socket: WebSocket): void {
    this.webSocketClose(socket);
  }

  private data(socket: WebSocket): SocketData | undefined {
    try { return socket.deserializeAttachment() as SocketData | undefined; } catch { return undefined; }
  }

  private async fetchDynamicTurn(): Promise<RTCIceServer[]> {
    const defaultServers: RTCIceServer[] = [{ urls: "stun:stun.metered.live:80" }];

    if (this.env.METERED_DOMAIN && this.env.METERED_API_KEY) {
      try {
        const res = await fetch(`https://${this.env.METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${this.env.METERED_API_KEY}`);
        if (res.ok) {
          const servers: unknown = await res.json();
          if (
            Array.isArray(servers) &&
            servers.every(
              (server): server is RTCIceServer =>
                typeof server === "object" &&
                server !== null &&
                "urls" in server &&
                (typeof server.urls === "string" ||
                  (Array.isArray(server.urls) &&
                    server.urls.every((url) => typeof url === "string"))),
            )
          ) {
            return servers;
          }
          console.error("[myna] Dynamic TURN service returned an invalid ICE server response; falling back to STUN.");
        } else {
          console.error("[myna] Dynamic TURN service returned an unsuccessful response; falling back to STUN.", {
            status: res.status,
          });
        }
      } catch (err) {
        console.error("[myna] Dynamic TURN fetch failed, falling back to STUN.", err);
      }
    }
    return defaultServers;
  }}