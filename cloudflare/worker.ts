export interface Env {
  MYNA_ROOMS: DurableObjectNamespace;
  ASSETS: Fetcher;
  TURN_USERNAME?: string;
  TURN_CREDENTIAL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("OK", { headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      const id = env.MYNA_ROOMS.idFromName("myna-global-signaling");
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
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected a WebSocket upgrade", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role: "guest" } satisfies SocketData);

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): void {
    let msg: SignalMessage;
    try {
      const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
      msg = JSON.parse(text) as SignalMessage;
    } catch {
      return;
    }

    const own = this.data(socket);
    if (!own || own.role === "closed") return;

    if (msg.type === "create-room") {
      let code = "";
      do {
        code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
      } while (this.roomSockets(code).some((candidate) => this.data(candidate)?.role === "host"));

      socket.serializeAttachment({ role: "host", code } satisfies SocketData);
      socket.send(JSON.stringify({ type: "room-created", code }));
      return;
    }

    if (msg.type === "join-room") {
      const code = typeof msg.code === "string" ? msg.code : "";
      const host = this.roomSockets(code).find((candidate) => this.data(candidate)?.role === "host");
      if (!host) {
        socket.send(JSON.stringify({ type: "error", message: "room not found" }));
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

    const code = own.code;
    if (!code) return;
    const isHost = own.role === "host";
    const room = this.roomSockets(code);

    if (["approve-peer", "deny-peer", "revoke-peer"].includes(String(msg.type))) {
      if (!isHost) return;

      const targetId = typeof msg.peerId === "string" ? msg.peerId : "";
      const target = room.find((candidate) => this.data(candidate)?.peerId === targetId);
      const targetData = target ? this.data(target) : undefined;
      if (!target || !targetData) return;

      if (msg.type === "approve-peer" && targetData.status === "pending") {
        const role = msg.role === "control" ? "control" : "view";
        target.serializeAttachment({ ...targetData, status: "approved" } satisfies SocketData);
        const iceServers = this.getIceServers();
        target.send(JSON.stringify({ type: "joined", code, role, iceServers }));
        socket.send(JSON.stringify({ type: "peer-joined", code, peerId: targetId, role, iceServers }));
      } else if (msg.type === "deny-peer" && targetData.status === "pending") {
        target.send(JSON.stringify({ type: "join-denied", code }));
        target.serializeAttachment({ role: "closed" } satisfies SocketData);
      } else if (msg.type === "revoke-peer" && targetData.status === "approved") {
        target.send(JSON.stringify({ type: "revoked" }));
        target.serializeAttachment({ role: "closed" } satisfies SocketData);
      }
      return;
    }

    if (["sdp-offer", "sdp-answer", "ice-candidate"].includes(String(msg.type))) {
      if (isHost) {
        const targetId = typeof msg.peerId === "string" ? msg.peerId : "";
        const target = room.find((candidate) => {
          const data = this.data(candidate);
          return data?.peerId === targetId && data.status === "approved";
        });
        if (target) target.send(JSON.stringify(msg));
      } else if (own.peerId && own.status === "approved") {
        const host = room.find((candidate) => this.data(candidate)?.role === "host");
        if (host) host.send(JSON.stringify({ ...msg, peerId: own.peerId }));
      }
    }
  }

  webSocketClose(socket: WebSocket): void {
    const own = this.data(socket);
    if (!own?.code) return;

    const room = this.roomSockets(own.code);
    if (own.role === "host") {
      for (const peer of room) {
        if (peer === socket) continue;
        try { peer.send(JSON.stringify({ type: "host-left", code: own.code })); } catch {}
        peer.serializeAttachment({ role: "closed" } satisfies SocketData);
      }
      return;
    }

    if (own.peerId) {
      const host = room.find((candidate) => this.data(candidate)?.role === "host");
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

  private roomSockets(code: string): WebSocket[] {
    return this.ctx.getWebSockets().filter((socket) => this.data(socket)?.code === code);
  }

  private getIceServers(): RTCIceServer[] {
    const servers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
    if (this.env.TURN_USERNAME && this.env.TURN_CREDENTIAL) {
      servers.push({
        urls: [
          "turn:global.relay.metered.ca:80",
          "turn:global.relay.metered.ca:443",
          "turn:global.relay.metered.ca:443?transport=tcp",
        ],
        username: this.env.TURN_USERNAME,
        credential: this.env.TURN_CREDENTIAL,
      });
    }
    return servers;
  }
}
