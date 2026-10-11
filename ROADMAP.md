# MYNA Roadmap

MYNA lets someone get a live, interactive terminal inside a container on your machine, over a direct peer-to-peer connection. This file separates what is built and verified from what is planned. Phases 1 to 4 are summarized. Phases 5 to 10 are written as working instructions: what to build, why, how to check it is done, and what can go wrong.

---

## Completed

### Phase 1: P2P core ✅

PTY streaming over a WebRTC DataChannel with a room-code signaling server. SDP/ICE exchange, bidirectional input, resize sync. Verified across separate networks, including the symmetric-NAT case that needs TURN.

### Phase 2: Container sandbox ✅

The shared shell runs in a disposable Docker container behind a shared `Session` interface. Verified: `whoami` returns `root` in the container and the host's files are not visible.

### Phase 3: Reproducible builds + CI ✅

Base image pinned by digest. Reproducibility is checked by hashing `RootFS.Layers` (the top-level image ID was found non-deterministic because of Buildx attestation metadata). `myna.lock` plus GitHub Actions, with a deliberately failing run in the history as proof.

### Phase 4: Multi-peer and permissions ✅

Host approval prompt, `view`/`control` roles enforced on the host, mid-session revoke, multiple simultaneous peers with a connection each, replay buffer for late joiners, JSON message framing, and a fix for the garbled attach output.

**Verified:**

- Server trust boundary: the room is found through `socketToRoom` (not a code in the message), and approvals are accepted only from the host's socket. Pending peers cannot approve themselves or relay handshake messages.
- Multi-peer: two peers connected to one host at the same time, and the host revoked them with the container left running.

**Known limitation:** `Ctrl+X` revokes all active peers at once. Revoking a single peer while the others stay connected has not been tested. It is tracked in Phase 8.

---

## Phase 5: Browser client (no install for the guest)

**Goal:** a guest opens a link, waits for approval, and gets a terminal in the browser. No Node, no repo, no `npm install`. This is what fixes the "joining needs setup" problem.

**Scope note:** this removes friction for the *guest*. The host still needs Node and Docker. Say so in the docs.

### 5.1 Host the signaling server publicly

- Deploy `server.ts` to a small host (Fly.io, Render, Railway, or a VPS). It must be reachable over `wss://` with a real TLS certificate. Browsers refuse insecure WebSockets from an HTTPS page.
- Read `PORT` and config from environment variables.
- Add a `/health` endpoint and a WebSocket ping/pong so dead connections are dropped.
- Serve the browser page from the same server so you avoid CORS entirely.
- Free tiers can sleep when idle, so a first join may be slow. Check the platform's behavior before relying on it.

### 5.2 Per-session TURN credentials

- Do **not** put your Metered credentials in client code. Anyone could read them and drain your quota.
- Have the signaling server fetch short-lived credentials (Metered's REST API with the key kept server-side, or a self-hosted coturn with time-limited credentials) and send an `iceServers` list to each client when it connects.
- The host CLI should use the same mechanism, so no TURN secret has to ship in the npm package.
- Terminal traffic is small, so the free quota is workable for testing. Watch it anyway.

### 5.3 The browser app

- A static page using `xterm.js` and its fit addon.
- The room code travels in the URL fragment (`https://host/#<code>`). Fragments are not sent to the server.
- Flow: open the WebSocket, send `join-room` with the requested role, show "waiting for host approval". On `joined`, create an `RTCPeerConnection` and answer the host's offer. When the DataChannel opens, wire xterm's input to the channel and the fit addon's size to resize messages.
- Show clear states: waiting, denied, connected as view or control, revoked, host left, connection lost.
- Phones can't type well into a terminal. Treat read-only viewing on mobile as good enough for v1.

### 5.4 Write the protocol down

- Create `docs/PROTOCOL.md` describing every signaling message and DataChannel message type, with a version field. The CLI and the browser must stay compatible, and contributors need a spec.

### Done when

- A phone on mobile data joins a host on your laptop through a link, with no installs, and the connection uses relay candidates.
- `view` is blocked and `control` works from the browser.
- Revoke disconnects the browser cleanly with a visible message.

### Risks

- Mixed-content errors if anything is served over plain `ws://`.
- Browser WebRTC behaves differently from `@roamhq/wrtc` in small ways, so test Chrome, Firefox and Safari.

---

## Phase 6: Make it a real product (CLI and npm)

**Goal:** `npx <package> up` on a machine with Node and Docker works in under two minutes, and the shell it shares is the user's own project environment.

### 6.1 Real commands

- `myna up [--dockerfile <path>] [--image <name>] [--mount none|ro|rw] [--max-peers N]`
- `myna join <code-or-link> [--role view|control]`
- `myna lock` and `myna verify` (replace `lock-test.ts`)
- `myna cleanup` (remove leftover containers, see Phase 8)
- Move code out of `host-test.ts` and `peer-test.ts` into `src/cli/`. Print the shareable link and the code when a room is created.

### 6.2 Share the user's environment, not bare Ubuntu

- Detect a `Dockerfile` in the working directory and build it. Fall back to a sensible default image if there isn't one. Compose files can come later.
- Mount the project directory at `/workspace` and start the shell there.
- **Tradeoff:** a mount reopens filesystem access. Default to `ro`. With `rw`, a control peer can modify the host's files in that directory, so require an explicit flag and print a warning.

### 6.3 Wire in the reproducibility check

- `myna up` verifies the built image against `myna.lock` and warns on drift. This turns the Phase 3 work into something users see.

### 6.4 Build and package

- Compile with `tsc` to `dist/`. Add a `bin` entry with a shebang so `npx` doesn't need `tsx`.
- Set `engines` honestly. Your CI run showed `chalk@6` requires Node 22 and `commander@15` requires 22.12, so either require `>=22.12` or pin older versions.
- Use a `files` whitelist so you publish only `dist/`, the README and the LICENSE. Run `npm pack --dry-run` and read the list. Make sure `.env` and anything personal are not in it.

### 6.5 Tame native dependencies

- `@roamhq/wrtc` ships prebuilt binaries for desktop platforms. The Android/Termux test showed it fails where there is no prebuild.
- `node-pty` is not used by the Docker path. Make it an optional dependency for a `--local` mode, so a failed native build doesn't break installation.
- Test `npm install -g` on clean Windows, macOS and Linux machines (virtual machines or friends' laptops).

### 6.6 Preflight checks

- Before starting, check that the Docker daemon is reachable and print a plain message if not. You already saw the raw error: `connect ENOENT //./pipe/docker_engine`.
- Also handle build failures, an unreachable signaling server, and missing TURN configuration.

### 6.7 Self-hostable signaling

- Provide `myna serve` and a Docker image for the signaling server, so users aren't forced to depend on yours. It also caps your hosting costs and abuse exposure.

### 6.8 Publishing

- Check the name with `npm view <name>`. If it's taken, use a scoped name (`@you/myna`). Check for collisions with existing projects before committing, as the Dragonfly case showed.
- Add a LICENSE (Apache-2.0 or MIT; Apache-2.0 is the usual choice for CNCF-adjacent projects), package metadata (`repository`, `keywords`, `bugs`, `homepage`), a CHANGELOG, and semver.
- Publish from GitHub Actions with npm provenance and 2FA on your account. First release as `0.1.0` under a `next` tag, then promote it once real users have tried it.

### Done when

- On a clean machine with only Node and Docker, `npx <package> up` in a folder with a Dockerfile prints a link, a guest joins from the browser, and it works.

---

## Phase 7: Security hardening (before any public announcement)

**Goal:** be able to state exactly what a malicious guest with `control` can and cannot do, and have tests that prove it.

### 7.1 Container hardening

- Set resource limits (`Memory`, `NanoCpus`, `PidsLimit`) so a fork bomb or memory hog can't take down the host.
- Drop all Linux capabilities and add back only what's needed. Set `no-new-privileges`. Run as a non-root user.
- Decide the network policy deliberately. With default networking the container can reach the internet, and on Docker Desktop it can reach services on your machine through `host.docker.internal`. Offer `--network none` and document the default.
- Never mount the Docker socket.

### 7.2 Abuse resistance on the signaling server

- Room codes are 32 bits today. Use a long random token in the link, and keep any short human-typed code for display only.
- Rate-limit join attempts per IP, cap pending requests per room, give rooms a TTL and a maximum age, and set `maxPayload` on the WebSocket server.
- Idle and maximum session durations on the host side.

### 7.3 Authenticating the handshake (optional, advanced)

- SDP, including DTLS fingerprints, passes through the signaling server. A malicious or compromised server could in principle swap them and sit in the middle.
- Mitigation: derive a short code from the fingerprints, show it on both screens, and have the host confirm it out loud. Worth doing once the basics are solid.

### 7.4 Housekeeping

- `SECURITY.md` with a reporting contact. `docs/THREAT_MODEL.md` listing assets, attackers, assumptions and explicit non-goals (for example, a control peer has a full shell inside the container, and the host trusts the container runtime).
- Dependabot, `npm audit` in CI, and GitHub Actions pinned by commit SHA.
- A local audit log of joins, approvals, denials and revocations.

### Done when

- Automated tests show: a fork bomb is contained, a host path that isn't mounted can't be read, a forged signaling message is ignored, and a viewer can't affect the shared terminal.

---

## Phase 8: Reliability and polish

- **Backpressure.** Watch `dc.bufferedAmount` and use `bufferedAmountLowThreshold`. Without this, `cat` on a large file can stall the host or exhaust memory.
- **Reconnect.** A guest's network blip should recover through an ICE restart, not force a new join.
- **No orphan containers.** Label every container (`myna=true`), remove on exit, handle crashes, and offer `myna cleanup`.
- **Test suite.** Unit tests for framing and the role gate. An in-process integration test (host, guest and signaling server together). A Docker smoke test in CI on Linux. Windows runners generally can't run Linux containers, so test the non-Docker parts there.
- **Quiet by default.** Replace the debug `console.log` lines (candidate types, state changes) with a `--verbose` flag.
- **Recording.** `myna up --record session.cast` in asciinema format. Warn the user that recordings capture anything typed, including secrets.
- Restore the broken `session.test.ts` and keep the whole suite green.
- **Per-peer revoke and role changes.** Pick one peer to remove, or change a peer between `view` and `control` mid-session, without disturbing the others. Test it with a mixed view/control pair.

---

## Phase 9: Docs and community

- **README:** a one-paragraph pitch, a 30-second demo GIF, a three-command quickstart, an architecture diagram, and a short security-model summary.
- **Comparison.** Be accurate about tmate and upterm (terminal sharing through relay servers), VS Code Live Share and Codespaces. Check each project's current features before publishing the comparison. Your honest differentiators: a reproducible containerized environment, peer-to-peer transport, a host-controlled permission model, and a guest who only needs a browser.
- **Contributor setup:** `CONTRIBUTING.md`, a "run everything locally" guide, issue and PR templates, a code of conduct, and a handful of labeled `good first issue` tickets.
- Badges for CI, npm version and license.

---

## Phase 10: Launch

1. **Pre-launch:** Phases 5 to 9 meet their done criteria. Watch three to five people try it with no help from you, and fix what confuses them. You'll learn more from this than from any test.
2. **Write up the engineering story.** The failed ICE run that needed TURN, and the Docker image ID that changed on every build because of attestation metadata, are real and specific. Technical posts like that travel further than feature lists.
3. **Post** a Show HN, plus r/commandline and r/selfhosted, with the demo GIF.
4. **After launch:** answer issues quickly, ship small releases, and watch your hosting costs. Track whether people return to use it again, not only stars and downloads.

A user base isn't guaranteed. The things you control are a first run that works in two minutes, a clear reason to choose this over tmate or upterm, and honest security claims.

---

## Order and rules

Do the phases in order. Phase 7 comes before the launch in Phase 10 even though the product works without it, because publishing an unhardened shell-sharing tool is the one mistake that is hard to take back. Don't start a phase until the previous one's done criteria are met with evidence (logs, a CI run, a recording), not just "it seemed to work."
