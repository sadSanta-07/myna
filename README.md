# MYNA

MYNA lets you share a live, isolated terminal with a teammate through a link. Your teammate opens it in a browser. No install, no account. The terminal data travels peer to peer, and the shell runs in a disposable Docker container on your machine, not on your host.

## Status: Phase 5 complete (browser guests)

What is built and tested:

- **Join from a link.** A guest opens a URL in a browser (an `xterm.js` terminal), picks `view` or `control`, and waits for the host to approve. Nothing to install and no account.
- **Peer-to-peer transport.** Terminal I/O and resize events travel over a WebRTC DataChannel. A small signaling server only brokers the handshake and never sees terminal data.
- **Works across real networks.** Verified between separate networks, including the symmetric-NAT case where STUN alone fails and a TURN relay is required. TURN credentials are held on the signaling server as environment variables and given to a client only after the host approves.
- **Container isolation.** The shared shell runs in a disposable Docker container (`dockerode`). Nothing from your machine is mounted into it, so a guest cannot read your files.
- **Reproducible environments.** The image's filesystem layers are content-hashed and checked against a committed `myna.lock`. CI fails if a build drifts. Verified identical on a laptop, a cloud VM and GitHub Actions' clean runners.
- **Host-controlled access.** Every join request must be approved by the host, who chooses `control` (full input) or `view` (read-only). Roles are enforced on the host. The signaling server accepts approvals only from the host's connection and relays handshake messages only for approved peers.
- **Multiple guests.** One host can serve several guests at once, each with its own connection and role. The host can revoke connected guests mid-session (currently all at once) without stopping the container. Late joiners get recent output replayed.
- **A written protocol.** [`PROTOCOL.md`](./PROTOCOL.md) documents the signaling and DataChannel messages.

### Limitations (read before using)

- **Not yet hardened.** Containers have no CPU or memory limits and no network restrictions yet. Only share with people you trust until the security phase lands (Phase 7 in `ROADMAP.md`).
- **The shared environment is a bare Ubuntu image,** not your project's own environment yet. Building from your Dockerfile and mounting your project is Phase 6.
- **The host side still runs from this repo.** There is no npm package or `myna up` command yet. The host needs Node.js 22 or newer and a running Docker daemon.
- **Guests need nothing but a browser.** That limitation applies only to the host.

## Running it today

### Host

Docker must be running.

```
npm install
npx tsx src/host-test.ts
```

The host script builds and starts a container, registers a room with the signaling server and prints a room code and a join link. When a guest asks to join, choose `(c)ontrol`, `(v)iew`, or `(n)o`.

### Guest

Open the link in a browser:

```
https://<signaling-server-host>/#<room-code>
```

Choose a role and wait for approval. The role you ask for is a request. The host decides what you get.

### Running your own signaling server

A public signaling server is hosted for convenience, but you don't have to use it:

```
npm run signal
```

Set your TURN credentials as environment variables on the signaling server (see `.env.example`), and never commit them. Cross-network connections that STUN can't traverse need a TURN relay, for example from [Metered](https://www.metered.ca).

### Controls

| Key | Where | Effect |
| --- | --- | --- |
| `Ctrl+X` | host | revoke all connected guests (per-guest revoke is planned) |
| `exit` | inside the shell | ends the shell, which ends the whole session |

### Reproducibility check

```
npx tsx src/lock-test.ts write    # pin the current build's hash into myna.lock
npx tsx src/lock-test.ts verify   # compare a build against the pinned hash
```

CI runs `verify` on every push to `main`.

## Where this is going

The goal is one workflow done well: from "I found a bug" to "my teammate is in the same environment, can see the code, and we reproduced it together" in about a minute, with nothing installed on their side and no accounts.

Planned, in order (details and done criteria in [`ROADMAP.md`](./ROADMAP.md)):

1. A real `myna up` / `myna join` CLI on npm, sharing your project's own environment.
2. Security hardening before any public announcement.
3. Testing with real developers, so that what gets built next is what people ask for.
4. Small, session-scoped debugging aids: a context card, ephemeral session chat, file and diff sharing, a read-only code viewer, and GitHub issue to session.

Not planned: team chat, accounts, video calls or a browser IDE. `ROADMAP.md` explains why.
