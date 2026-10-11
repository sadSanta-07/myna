# MYNA

`myna` lets someone get a live, interactive terminal inside a container running on your machine, over a direct peer-to-peer WebRTC connection. No server in the middle carries the terminal data.

Think of it as screen sharing for a terminal. The guest gets real keystroke-level access to a shell, but the shell lives in a disposable container, and you decide who gets in and what they can do.

## Status: Phase 4 complete (multi-peer, permissions)

What is built and tested:

- **Peer-to-peer terminal streaming.** PTY-equivalent shell I/O and resize events travel over a WebRTC DataChannel. A small signaling server only brokers the handshake (SDP/ICE) and never sees terminal data.
- **Works across real networks.** Verified between a home network and a cloud VM, including the symmetric-NAT case where STUN alone fails and a TURN relay is required.
- **Container isolation.** The shared shell runs in a disposable Docker container (`dockerode`). Nothing from your machine is mounted into it, so a guest cannot read your files.
- **Reproducible environments.** The image's filesystem layers are content-hashed and checked against a committed `myna.lock`. CI fails if a build drifts. Verified identical on a laptop, a cloud VM and GitHub Actions' clean runners.
- **Host-controlled access.** Every join request must be approved by the host, who chooses `control` (full input) or `view` (read-only). Roles are enforced on the host, not trusted from the guest. The signaling server accepts approvals only from the host's own connection and relays handshake messages only for approved peers, so a waiting guest cannot approve itself or forge messages to the host.
- **Multiple guests.** One host can serve several peers at once, each with its own connection and role. The host can revoke connected peers mid-session (currently all at once) without stopping the container. Late joiners get recent output replayed.

### Limitations (read before using)

- **Not yet hardened.** Containers have no CPU/memory limits and no network restrictions. Only share with people you trust until the security phase lands (see `ROADMAP.md`, Phase 7).
- **The shared environment is a bare Ubuntu image,** not your project's own environment yet. Building from your Dockerfile and mounting your project is Phase 6.
- **Joining still needs Node.js** and this repo. A browser-based client that joins from a link (Phase 5) is next.
- **No npm package yet.** You run the scripts below by hand.
- **Requires Docker Desktop (or a Docker daemon) running on the host machine, and Node.js 22 or newer.**

## Running it today

Use three or more terminals. Docker must be running.

**1. Signaling server**

```
npm run signal
```

**2. Host** (builds and starts the container, prints a room code)

```
npx tsx src/host-test.ts
```

When a peer asks to join, the host chooses: `(c)ontrol`, `(v)iew`, or `(n)o`.

**3. Guest** (one terminal per guest)

```
npx tsx src/peer-test.ts <room-code> [control|view]
```

The role you ask for is a request. The host decides what you actually get.

### Controls

| Key | Where | Effect |
| --- | --- | --- |
| `Ctrl+]` | guest | detach from the session |
| `Ctrl+X` | host | revoke all connected peers (per-peer revoke is planned) |
| `exit` | inside the shell | ends the shell, which ends the whole session |

### Testing across networks

The signaling server listens on `localhost` only. To connect a guest on another network, tunnel it (for example `ngrok http 8080`) and point the guest at the public address:

```
SIGNAL_URL=wss://<your-tunnel-address> npx tsx src/peer-test.ts <room-code>
```

### TURN credentials

Connections that STUN cannot traverse need a TURN relay. Copy `.env.example` to `.env` and set `TURN_USERNAME` and `TURN_CREDENTIAL` (for example from [Metered](https://www.metered.ca)). `.env` is gitignored. Never commit it.

### Reproducibility check

```
npx tsx src/lock-test.ts write    # pin the current build's hash into myna.lock
npx tsx src/lock-test.ts verify   # compare a build against the pinned hash
```

CI runs `verify` on every push to `main`.

## What's next

See [`ROADMAP.md`](./ROADMAP.md): a browser client, a real `myna up` / `myna join` CLI published to npm, security hardening, and a public launch.
