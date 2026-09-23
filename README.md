# MYNA

`envshare up` takes a shell you're running locally, and lets someone else get a live, interactive terminal inside that *exact same running session* — over a direct WebRTC connection, with no server in the middle holding the actual terminal data.

Think of it as screen sharing, but for a terminal: the peer gets real keystroke-level access to a shell, reached over a connection that punches through NAT the way a video call does, not the way SSH does.

## Status: Phase 1 (proof of concept)

The core sharing loop is built and verified:

- A real PTY-backed shell, spawned locally (`node-pty`)
- A signaling server for room-code-based pairing between host and peer (`ws`)
- A full WebRTC handshake — SDP offer/answer, ICE candidate exchange — establishing a direct `RTCDataChannel` between host and peer
- Real PTY output streamed to the peer, rendered as an actual terminal (not logged/escaped)
- Real keystrokes from the peer sent back and executed on the host's shell
- Terminal resize synced across the connection
- **Verified across genuinely separate networks** — tested between a home network and a cloud VM, including the symmetric-NAT case where direct/STUN-only connectivity fails and a TURN relay is required. TURN is configured as a fallback in `iceServers`, not the primary path.

### Important: no sandbox yet

Right now, sharing your terminal means giving the connected peer **direct command execution on your actual host machine** — there is no container or sandbox isolating the session. This is fine for testing between two trusted parties on a private room code, but this is **not yet safe** to expose broadly or treat as a general-purpose sharing tool. Containerized sessions (Docker-backed PTYs) are planned for Phase 2 — see `ROADMAP.md`.

## Running it today

There's no unified CLI yet (that's Phase 1's remaining polish / early Phase 2 work) — you run three scripts by hand, in three terminals.

**1. Start the signaling server:**

```
npm run signal
```

**2. Start the host** (this spawns the local shell being shared):

```
npx tsx src/host-test.ts
```

It will print a room code, e.g. `[host] received: room-created ...`.

**3. On the peer side, join with that code:**

```
npx tsx src/peer-test.ts <room-code>
```

Once both sides log `data channel open`, the peer's terminal becomes a live view into the host's shell — type normally, resize the window normally, it behaves like a real terminal session running on the host's machine.

### Cross-network testing

By default, the signaling server only listens on `localhost`. To test across two separate networks (not just two processes on the same machine), tunnel it with a tool like `ngrok`:

```
ngrok http 8080
```

and point `peer-test.ts`'s WebSocket URL at the resulting public `wss://` address instead of `ws://localhost:8080`.

### TURN credentials

Cross-network connectivity relies on a TURN server as a fallback for NAT configurations that STUN alone can't traverse. Copy `.env.example` to `.env` and fill in your own TURN credentials (e.g. from [Metered](https://www.metered.ca)) — `.env` is gitignored and never committed.

## What's next

See `ROADMAP.md` for the full phase breakdown — containerization (the security-critical next step), reproducible build hashing, a multi-peer permission model, and a browser-based peer client so joining doesn't require installing anything.
