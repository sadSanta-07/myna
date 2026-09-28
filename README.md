# MYNA

`envshare up` takes a shell you're running locally, and lets someone else get a live, interactive terminal inside that *exact same running session* — over a direct WebRTC connection, with no server in the middle holding the actual terminal data.

Think of it as screen sharing, but for a terminal: the peer gets real keystroke-level access to a shell, reached over a connection that punches through NAT the way a video call does, not the way SSH does.

## Status: Phase 2 (containerized sharing)

The core sharing loop is built and verified, now backed by an isolated container rather than the host shell directly:

- A real PTY-equivalent shell, spawned **inside a Docker container** (via `dockerode`), not on the host machine
- A shared `Session` interface so the same signaling/WebRTC/DataChannel code works identically whether the session is local or containerized
- A signaling server for room-code-based pairing between host and peer (`ws`)
- A full WebRTC handshake — SDP offer/answer, ICE candidate exchange — establishing a direct `RTCDataChannel` between host and peer
- Real PTY output streamed to the peer, rendered as an actual terminal (not logged/escaped)
- Real keystrokes from the peer sent back and executed inside the host's container
- Terminal resize synced across the connection, using Docker's real container resize API
- **Verified across genuinely separate networks** — tested between a home network and a cloud VM, including the symmetric-NAT case where direct/STUN-only connectivity fails and a TURN relay is required. TURN is configured as a fallback in `iceServers`, not the primary path.
- **Verified isolated:** running `whoami`/`ls` from the peer's side returns the container's identity (`root`) and the container's bare filesystem — not the host machine's real user or project directory.

### Scope note

There's no unified CLI yet — the containerized session is what `host-test.ts` runs by default, but there's no host-approval flow, no viewer-vs-control distinction, and no multi-peer support yet (one host, one peer, full access once connected). See `ROADMAP.md` for what's planned next.

## Running it today

You run three scripts by hand, in three terminals. **Docker Desktop must be running** — the host script builds and starts a container as part of setup.

**1. Start the signaling server:**
```
npm run signal
```

**2. Start the host** (this builds/starts a container and shares the shell inside it):
```
npx tsx src/host-test.ts
```
It will print a room code, e.g. `[host] received: room-created ...`.

**3. On the peer side, join with that code:**
```
npx tsx src/peer-test.ts <room-code>
```

Once both sides log `data channel open`, the peer's terminal becomes a live view into the host's containerized shell — type normally, resize the window normally, it behaves like a real terminal session, isolated from the host machine.

### Cross-network testing

By default, the signaling server only listens on `localhost`. To test across two separate networks (not just two processes on the same machine), tunnel it with a tool like `ngrok`:
```
ngrok http 8080
```
and point `peer-test.ts`'s WebSocket URL at the resulting public `wss://` address instead of `ws://localhost:8080`.

### TURN credentials

Cross-network connectivity relies on a TURN server as a fallback for NAT configurations that STUN alone can't traverse. Copy `.env.example` to `.env` and fill in your own TURN credentials (e.g. from [Metered](https://www.metered.ca)) — `.env` is gitignored and never committed.

## What's next

See `ROADMAP.md` for the full phase breakdown — reproducible build hashing, a multi-peer permission model, and a browser-based peer client so joining doesn't require installing anything.