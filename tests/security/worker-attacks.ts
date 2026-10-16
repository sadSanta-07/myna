// Worker-level attack checks for MYNA (verification sprint checks 2, 3, 4, 5, plus S1 and S2).
//
//   npx tsx tests/security/worker-attacks.ts                 # run all automated checks
//   npx tsx tests/security/worker-attacks.ts 2 4             # run only checks 2 and 4
//   (checks 4 and 3 trip rate limits on purpose: run them last, and wait a minute before re-running other checks)
//   HOST_CODE=<code> npx tsx tests/security/worker-attacks.ts 5   # check 5 needs a real running host
//
// Environment:
//   SIGNAL_HTTP / SIGNAL_WS   target (default http://127.0.0.1:8787, i.e. `wrangler dev`)
//   ALLOW_REMOTE=1            required for any non-local target. Only test infrastructure you own.
//   RATE_PROBES=40            rapid POST /new requests in check 3
//   GUESS_PROBES=60           random room codes tried in check 4
//
// Exit code: 0 if nothing FAILED or ERRORED, 1 otherwise.
import * as readline from "node:readline/promises";
import {
  assertSafeTarget,
  connectGuest,
  connectHost,
  newRoom,
  randomHex,
  roomUrl,
  Client,
  type Msg,
} from "./protocol.js";

type Status = "PASS" | "WARN" | "FAIL" | "MANUAL" | "ERROR";
interface Result {
  id: string;
  name: string;
  status: Status;
  detail: string;
}

const results: Result[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const record = (id: string, name: string, status: Status, detail: string) => results.push({ id, name, status, detail });

/** A host and one pending guest in a fresh room. Returns the pieces the checks need. */
async function pendingGuest(role: "view" | "control" = "control") {
  const room = await newRoom();
  if (!room.code) {
    const hint = room.status === 429 ? " The server is rate-limiting you (a previous check may have used up the allowance): wait a minute and re-run." : " Check protocol.ts.";
    throw new Error(`POST /new did not return a code (HTTP ${room.status}).${hint}`);
  }
  const host = await connectHost(room.code);
  if (!host) throw new Error("host WebSocket was refused. Check protocol.ts.");
  const guest = await connectGuest(room.code, role);
  if (!guest) throw new Error("guest WebSocket was refused. Check protocol.ts.");
  const req = await host.waitFor("join-request", 2000);
  if (!req) throw new Error("host never received join-request. Check protocol.ts.");
  return { code: room.code, host, guest, peerId: req.peerId as string };
}

function turnCreds(iceServers: any): { username: string; credential: string }[] {
  if (!Array.isArray(iceServers)) return [];
  return iceServers
    .filter((s) => s && s.username && s.credential)
    .map((s) => ({ username: String(s.username), credential: String(s.credential) }));
}

// ---------------------------------------------------------------------------
// Check 2: a pending guest tries to approve itself
async function check2() {
  const name = "Pending guest cannot approve itself";
  const { host, guest, peerId } = await pendingGuest("control");

  guest.send({ type: "approve-peer", peerId, role: "control" }); // even with the real peerId
  guest.send({ type: "approve-peer", role: "control" });
  guest.send({ type: "approve-peer", peerId: "*", role: "control" });
  guest.send({ type: "revoke-peer", peerId });

  const selfJoined = await guest.waitFor("joined", 1200);
  const hostNotified = await host.waitFor("peer-joined", 300);
  if (selfJoined || hostNotified) {
    record("2", name, "FAIL", "a non-host socket was able to approve a join request");
  } else {
    // Control: a legitimate approval must still work, otherwise this PASS proves nothing.
    host.send({ type: "approve-peer", peerId, role: "view" });
    const ok = await guest.waitFor("joined", 1500);
    if (ok) record("2", name, "PASS", "self-approval ignored; host approval still works");
    else record("2", name, "ERROR", "legitimate approval did not work, so the test is not valid (check protocol.ts)");
  }
  host.close();
  guest.close();
}

// ---------------------------------------------------------------------------
// Check 3: TURN credential harvesting and room-creation rate limit
async function check3() {
  const name = "TURN credentials are short-lived; room creation is rate-limited";
  const seen: { username: string; credential: string }[][] = [];
  for (let i = 0; i < 2; i++) {
    const { host, guest, peerId } = await pendingGuest("view");
    host.send({ type: "approve-peer", peerId, role: "view" }); // the attacker approves its own guest
    const joined = await guest.waitFor("joined", 2000);
    seen.push(turnCreds(joined?.iceServers));
    host.close();
    guest.close();
  }

  const notes: string[] = [];
  let status: Status = "PASS";

  if (seen[0].length === 0) {
    notes.push("no TURN credentials were issued (STUN only): nothing to harvest, but relay connections will not work");
    status = "WARN";
  } else {
    const same = seen[0][0].credential === seen[1][0]?.credential && seen[0][0].username === seen[1][0]?.username;
    if (same) {
      status = "FAIL";
      notes.push("the same TURN username/credential was issued for two different rooms (static, long-lived)");
    } else {
      notes.push("credentials differ per room");
    }
    const timeLimited = /^\d{9,}/.test(seen[0][0].username);
    notes.push(
      timeLimited
        ? "username looks like a timestamp (likely time-limited)"
        : "cannot tell expiry from the username: confirm in the TURN provider dashboard",
    );
    if (!timeLimited && status === "PASS") status = "WARN";
  }

  const probes = Number(process.env.RATE_PROBES ?? 40);
  let limited = 0;
  const codes = new Map<number, number>();
  for (let i = 0; i < probes; i++) {
    const r = await newRoom();
    codes.set(r.status, (codes.get(r.status) ?? 0) + 1);
    if (r.status === 429 || r.status === 403) limited++;
  }
  const dist = [...codes.entries()].map(([s, n]) => `${s}x${n}`).join(", ");
  if (limited === 0) {
    status = "FAIL";
    notes.push(`no rate limiting after ${probes} rapid POST /new (${dist})`);
  } else {
    notes.push(`POST /new was limited after some of ${probes} rapid requests (${dist})`);
  }
  record("3", name, status, notes.join("; "));
}

// ---------------------------------------------------------------------------
// Check 4: guessing room codes
async function check4() {
  const name = "Wrong room codes are rejected cheaply and rate-limited";
  const probes = Number(process.env.GUESS_PROBES ?? 60);
  let accepted = 0;
  let limited = 0;
  let refused = 0;
  for (let i = 0; i < probes; i++) {
    const c = await Client.open(roomUrl(randomHex(4)));
    if ("refused" in c) {
      refused++;
      if (c.status === 429) limited++;
    } else {
      accepted++;
      c.close();
    }
  }
  if (accepted > 0) {
    record(
      "4",
      name,
      "FAIL",
      `${accepted} of ${probes} random codes were accepted at the WebSocket upgrade, so each can reach (and create) a Durable Object. ` +
        `Check the Cloudflare dashboard's object count. Fix: self-validating signed codes (Phase 10).`,
    );
  } else if (limited === 0) {
    record("4", name, "WARN", `all ${probes} guesses were refused, but none were rate-limited (no 429 seen)`);
  } else {
    record("4", name, "PASS", `${refused} of ${probes} refused, ${limited} rate-limited; confirm no new Durable Objects in the dashboard`);
  }
}

// ---------------------------------------------------------------------------
// Check 5: a view guest sends malformed handshake data to a REAL running host
async function check5() {
  const name = "Malformed SDP/ICE from a view guest does not crash the host";
  const code = process.env.HOST_CODE;
  if (!code) {
    record("5", name, "MANUAL", "start `myna up`, then run with HOST_CODE=<its room code> and approve the guest as view");
    return;
  }
  const guest = await connectGuest(code, "view");
  if (!guest) {
    record("5", name, "ERROR", "could not connect to that room");
    return;
  }
  console.log("  Approve the guest as VIEW in the host terminal now (waiting up to 60 s)...");
  const joined = await guest.waitFor("joined", 60_000);
  if (!joined) {
    record("5", name, "ERROR", "the guest was never approved");
    guest.close();
    return;
  }
  await sleep(500);
  const bad: Msg[] = [
    { type: "sdp-answer", sdp: "not-an-object" },
    { type: "sdp-answer", sdp: { type: "answer", sdp: "garbage" } },
    { type: "sdp-answer" },
    { type: "sdp-offer", sdp: { type: "offer", sdp: "garbage" } },
    { type: "ice-candidate", candidate: 12345 },
    { type: "ice-candidate", candidate: { candidate: "x".repeat(200_000) } },
    { type: "ice-candidate" },
  ];
  for (const m of bad) {
    guest.send(m);
    await sleep(100);
  }
  guest.send("this is not json");
  await sleep(1500);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question("  Is `myna up` still running and responsive (can you type in it)? [y/n] ")).trim().toLowerCase();
  rl.close();
  guest.close();
  record("5", name, ans === "y" ? "PASS" : "FAIL", ans === "y" ? "host survived 8 malformed messages" : "host died or hung");
}

// ---------------------------------------------------------------------------
// S1 (extra): an approved guest must not be able to change its own role in the room
async function checkS1() {
  const name = "[extra] Role-state guards: approved guest cannot re-create or re-join";
  const { host, guest, peerId } = await pendingGuest("view");
  host.send({ type: "approve-peer", peerId, role: "view" });
  await guest.waitFor("joined", 1500);

  guest.send({ type: "create-room", code: randomHex(4) });
  guest.send({ type: "join-room", code: randomHex(4), requestedRole: "control" });
  await sleep(300);
  const marker = { type: "ice-candidate", candidate: { candidate: "marker-" + randomHex(4) } };
  guest.send(marker);
  const got = await host.waitFor((m) => m.type === "ice-candidate" && m.candidate?.candidate === marker.candidate.candidate, 1500);
  const hostLeft = host.inbox.some((m) => m.type === "peer-left");
  if (got && !hostLeft) record("S1", name, "PASS", "guest still relays as a guest after the attempts");
  else record("S1", name, "FAIL", "guest's session state was changed by repeated create-room/join-room");
  host.close();
  guest.close();
}

// S2 (extra): deny and revoke should close the guest's socket
async function checkS2() {
  const name = "[extra] Deny and revoke close the guest's socket";
  const a = await pendingGuest("view");
  a.host.send({ type: "deny-peer", peerId: a.peerId });
  const denied = await a.guest.waitFor("join-denied", 1500);
  const deniedClosed = await a.guest.waitClosed(1500);

  const b = await pendingGuest("view");
  b.host.send({ type: "approve-peer", peerId: b.peerId, role: "view" });
  await b.guest.waitFor("joined", 1500);
  b.host.send({ type: "revoke-peer", peerId: b.peerId });
  const revoked = await b.guest.waitFor("revoked", 1500);
  const revokedClosed = await b.guest.waitClosed(1500);

  const ok = deniedClosed && revokedClosed;
  record(
    "S2",
    name,
    ok ? "PASS" : "FAIL",
    `deny: notice=${!!denied} closed=${deniedClosed}; revoke: notice=${!!revoked} closed=${revokedClosed}`,
  );
  for (const c of [a.host, a.guest, b.host, b.guest]) c.close();
}

// ---------------------------------------------------------------------------
// Order matters: checks 4 and 3 deliberately trip the server's rate limits, so they run last.
const ORDER = ["2", "S1", "S2", "5", "4", "3"];
const all: Record<string, () => Promise<void>> = {
  "2": check2,
  S1: checkS1,
  S2: checkS2,
  "5": check5,
  "4": check4,
  "3": check3,
};

async function main() {
  assertSafeTarget();
  const wanted = process.argv.slice(2).length ? process.argv.slice(2) : ORDER;
  for (const id of wanted) {
    const fn = all[id];
    if (!fn) {
      console.error(`unknown check: ${id}`);
      continue;
    }
    console.log(`running check ${id}...`);
    try {
      await fn();
    } catch (e: any) {
      record(id, "(setup)", "ERROR", e?.message ?? String(e));
    }
  }

  console.log("\n=== results ===");
  for (const r of results) console.log(`${r.status.padEnd(6)} #${r.id.padEnd(3)} ${r.name}\n         ${r.detail}`);
  const bad = results.some((r) => r.status === "FAIL" || r.status === "ERROR");
  console.log(bad ? "\nSOME CHECKS FAILED" : "\nno failures");
  process.exit(bad ? 1 : 0);
}

main();
