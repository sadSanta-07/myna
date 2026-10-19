// Protocol adapter for the MYNA security tests.
//
// This is the ONLY file that knows how the signaling server is addressed and
// which message names it uses. It was written from the Worker as read on
// 2026-10-14 (join-room / join-request / approve-peer / joined / peer-joined /
// sdp-* / ice-candidate) plus the per-room routes reported afterwards
// (POST /new, WebSocket /room/<code>). The per-room handshake for the host is
// an ASSUMPTION: it sends {type:"create-room", code}. If your Worker differs,
// change connectHost()/connectGuest()/newRoom() and nothing else.
import WebSocket from "ws";

export const TARGET = {
  http: process.env.SIGNAL_HTTP ?? "http://127.0.0.1:8787", // `wrangler dev` default
  ws: process.env.SIGNAL_WS ?? "ws://127.0.0.1:8787",
};

/** Only attack infrastructure you own. Non-local targets need an explicit opt-in. */
export function assertSafeTarget(): void {
  const host = new URL(TARGET.http).hostname;
  const local = ["127.0.0.1", "localhost", "::1"].includes(host);
  if (!local && process.env.ALLOW_REMOTE !== "1") {
    console.error(
      `Refusing to run against ${host}. These tests send abusive traffic (rapid room creation, ` +
        `random code guesses). Run them against \`wrangler dev\` or a deployment you own, ` +
        `then set ALLOW_REMOTE=1 to confirm.`,
    );
    process.exit(2);
  }
}

export type Msg = { type?: string; [k: string]: unknown };

export class Client {
  inbox: Msg[] = [];
  closed = false;
  closeCode?: number;
  private handlers: ((m: Msg) => void)[] = [];
  private waiters: { match: (m: Msg) => boolean; resolve: (m: Msg | null) => void }[] = [];

  constructor(public ws: WebSocket) {
    ws.on("message", (raw) => {
      let m: Msg;
      try {
        m = JSON.parse(raw.toString());
      } catch (err) {
        console.warn("[myna test] Ignoring malformed signaling JSON:", err);
        return;
      }
      this.inbox.push(m);
      for (const h of this.handlers) h(m);
      this.waiters = this.waiters.filter((w) => {
        if (w.match(m)) {
          w.resolve(m);
          return false;
        }
        return true;
      });
    });
    ws.on("close", (code) => {
      this.closed = true;
      this.closeCode = code;
    });
    ws.on("error", (err) => { console.warn("[myna test] Signaling socket error:", err.message); });
  }

  /** Open a socket. Returns the client, or the HTTP status if the upgrade was refused. */
  static open(url: string): Promise<Client | { refused: true; status: number }> {
    return new Promise((resolve) => {
      const ws = new WebSocket(url);
      ws.once("open", () => resolve(new Client(ws)));
      ws.once("unexpected-response", (_req, res) => {
        res.resume();
        resolve({ refused: true, status: res.statusCode ?? 0 });
      });
      ws.once("error", () => resolve({ refused: true, status: 0 }));
    });
  }

  send(obj: unknown): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(typeof obj === "string" ? obj : JSON.stringify(obj));
  }

  on(fn: (m: Msg) => void): void {
    this.handlers.push(fn);
  }

  /** Wait for a message of a given type (or matching predicate); null on timeout. */
  waitFor(match: string | ((m: Msg) => boolean), ms = 1500): Promise<Msg | null> {
    const test = typeof match === "string" ? (m: Msg) => m.type === match : match;
    const already = this.inbox.find(test);
    if (already) return Promise.resolve(already);
    return new Promise((resolve) => {
      const w = { match: test, resolve };
      this.waiters.push(w);
      setTimeout(() => {
        const i = this.waiters.indexOf(w);
        if (i >= 0) {
          this.waiters.splice(i, 1);
          resolve(null);
        }
      }, ms);
    });
  }

  waitClosed(ms = 1500): Promise<boolean> {
    if (this.closed) return Promise.resolve(true);
    return new Promise((resolve) => {
      const t = setInterval(() => {
        if (this.closed) {
          clearInterval(t);
          clearTimeout(to);
          resolve(true);
        }
      }, 25);
      const to = setTimeout(() => {
        clearInterval(t);
        resolve(this.closed);
      }, ms);
    });
  }

  close(): void {
    try {
      this.ws.close();
    } catch (err) {
      console.warn("[myna test] Failed to close signaling socket during cleanup:", err);
    }
  }
}

export const roomUrl = (code: string) => `${TARGET.ws}/room/${code}`;

export async function newRoom(): Promise<{ status: number; code?: string }> {
  let res: Response;
  try {
    res = await fetch(`${TARGET.http}/new`, { method: "POST" });
  } catch (err) {
    console.warn("[myna test] Could not create test room:", err);
    return { status: 0 };
  }
  const text = await res.text();
  let code: string | undefined;
  try {
    const j = JSON.parse(text);
    code = j.code ?? j.roomCode ?? j.room;
  } catch (err) {
    if (/^[A-Za-z0-9_-]{4,64}$/.test(text.trim())) code = text.trim();
    else console.warn("[myna test] Room endpoint returned an invalid payload:", err);
  }
  return { status: res.status, code: res.ok ? code : undefined };
}

export async function connectHost(code: string): Promise<Client | null> {
  const c = await Client.open(roomUrl(code));
  if ("refused" in c) return null;
  c.send({ type: "create-room", code });
  await c.waitFor("room-created", 800); // tolerate servers that don't reply
  return c;
}

export async function connectGuest(code: string, requestedRole: "view" | "control" = "view"): Promise<Client | null> {
  const c = await Client.open(roomUrl(code));
  if ("refused" in c) return null;
  c.send({ type: "join-room", code, requestedRole });
  return c;
}

export const randomHex = (bytes: number) =>
  Array.from({ length: bytes }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
