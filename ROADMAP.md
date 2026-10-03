# MYNA Roadmap

MYNA lets someone get a live, interactive terminal inside a container you're running locally — over a direct peer-to-peer connection, with no server in the middle holding the actual terminal data.

This roadmap tracks what's built and verified, what's in progress, and what's planned. Status reflects real test results, not intentions.

---

## Phase 1 — Core PTY + WebRTC Sharing Loop ✅ Done

**Goal:** two people, one sharing a live local shell with the other over a direct WebRTC connection, no cloud relay carrying the actual terminal data (TURN relay as a fallback path only, when direct/STUN connectivity isn't possible).

### Week 1 — PTY basics ✅ Done
- Spawn a local shell inside a PTY (`node-pty`)
- Wire stdin into the PTY in raw mode
- Handle terminal resize (`SIGWINCH` -> `pty.resize()`)
- Graceful teardown — clean shell exit *and* forced kill (`SIGTERM`)
- Integration tests (`node:test`) covering spawn, write/read round-trip, resize, kill
- **Known platform note:** required `useConpty: false` to work around a ConPTY/Node v24 compatibility issue on Windows. Revisit if Node or node-pty versions change.

### Week 2 — Signaling server ✅ Done
- Bare `ws` WebSocket server
- Room creation with short codes
- Peer pairing by room code, with "room not found" / "room already full" guards
- Generic message relay between paired peers (server never inspects payload contents — SDP/ICE/app data all pass through as opaque JSON)
- Disconnect cleanup: host leaving closes the room and notifies the peer; peer leaving notifies the host and leaves the room open for a new peer

### Week 3 — WebRTC handshake ✅ Done
- `RTCPeerConnection` scaffolding on both sides (`@roamhq/wrtc`, Node-only for Phase 1)
- SDP offer/answer exchange through the signaling server
- ICE candidate exchange (with early-candidate queueing to handle race conditions against `setRemoteDescription`)
- DataChannel opened, real application data sent and received across it
- **Verified across genuinely separate networks** (home laptop <-> GitHub Codespaces VM, via an ngrok-tunneled signaling server): confirmed the connection depends on TURN relay in the presence of symmetric NAT — plain STUN alone was tested and confirmed insufficient in this real-world case, not just a theoretical caveat. TURN credentials (Metered.ca) added as a fallback in `iceServers`, alongside STUN.
- TURN credentials are handled via environment variables (`.env`, gitignored), not committed to source

### Week 4 — Wire it together ✅ Done
- Real PTY output streamed over the DataChannel (with buffering for output produced before the channel opens)
- Peer's incoming DataChannel messages rendered raw into their local terminal
- Peer's keystrokes sent back over the channel and executed on the host's PTY
- Terminal resize propagated across the connection, keeping both sides in sync
- **Verified end to end, cross-network:** a peer in a separate environment typing real commands (`dir`, `whoami`, `ls`) that executed on the host's actual machine and rendered correctly, including formatted output

**Historical note:** at the end of Phase 1, before Phase 2 landed, sharing a terminal meant giving the connected peer direct command execution on the *host's actual machine* — confirmed in testing (`whoami` returned the host's real Windows identity). This was flagged plainly rather than glossed over, and is what Phase 2 exists to fix.

---

## Phase 2 — Containerization ✅ Done

**Goal:** the shared shell runs inside an isolated Docker container instead of directly on the host — the security requirement that makes this safe to use beyond a fully trusted pair.

- `dockerode` wired up to the local Docker daemon
- Image build flow: detects a `Dockerfile` in the project directory, builds (or reuses a cached build)
- PTY-equivalent shell spawned *inside* a running container via Docker's attach API, with the same raw-mode stdin/stdout piping pattern as the local PTY path
- A shared `Session` interface (`onData`, `write`, `resize`, `kill`, `onExit`) that both the local PTY session and the containerized session implement identically — everything above this layer (signaling, WebRTC, DataChannel piping) doesn't know or care which one it's talking to
- Container resize wired to Docker's real `container.resize()` API (not simulated)
- **Verified end to end, cross-network, containerized:** re-ran the exact same host<->peer test as Phase 1's Week 4, this time backed by a container. `whoami` now correctly returns `root` (the container's identity) and `ls`/`pwd` show the container's bare filesystem — not the host's real project directory. Same test, deliberately different and now-correct result.

**Current scope note:** `host-test.ts` currently runs the containerized path by default, requiring Docker Desktop to be running locally. The local (non-containerized) session path still exists in the codebase (`createLocalSession` in `session.ts`) but isn't currently wired into the CLI test scripts — worth revisiting whether both modes should be user-selectable once a real CLI exists.

---

## Phase 3 — Reproducibility hashing + CI ✅ Done

**Goal:** verify that a build of the project's Dockerfile produces the same image content on different machines and at different times — not just "we used Docker," but a real, checkable guarantee.

- Base image pinned by digest (`ubuntu:22.04@sha256:...`), not a mutable tag
- **Real finding, not assumed:** the top-level Docker image ID was tested and found genuinely non-deterministic across rebuilds, even with an identical, cached `FROM` layer. Root cause traced to Buildx's default attestation/SBOM metadata (build timestamps, provenance info) being embedded in the image identity.
- Fixed by hashing the image's actual filesystem content (`RootFS.Layers`) instead of the top-level image ID — which inherently excludes build-time metadata noise and reflects real content, not build-run artifacts
- **Verified reproducible across three independent environments:** local laptop, a separate GitHub Codespaces VM, and GitHub Actions' own clean-room runners (fresh VM every run, no shared cache) — all three produced the identical layer hash for the same Dockerfile
- A `myna.lock` file pins the expected hash (same pattern as `package-lock.json`/`Cargo.lock`), checked in to the repo, updated deliberately when the Dockerfile changes on purpose
- `verifyAgainstLockFile()` detects drift: tested by deliberately modifying the Dockerfile without updating the lock, confirming a real mismatch is reported (not just a pass/fail flag, but the actual differing layer list)
- Wired into GitHub Actions CI (`.github/workflows/reproducibility.yml`), running on every push to `main`
- **The fail path was deliberately triggered in real CI, not just locally:** a drift-introducing commit produced a genuine red ✗ run, and reverting it produced a genuine green ✓ run — both visible in the repo's Actions history as real evidence, not a simulated test

---

## Phase 4 — Multi-peer / permission model
- Host approves join requests rather than anyone with the room code getting a shell automatically
- Revoke access mid-session
- Viewer-only vs full-control peer roles

## Phase 5 — Browser-based peer client
- `xterm.js`-rendered client so a peer can join via a link, no CLI install required
- Native browser WebRTC support sidesteps the native-binary platform issues Node-side bindings can hit (e.g. the `@roamhq/wrtc` Android/Termux gap found during testing)
- This is the actual fix for the project's original "no setup needed to connect" goal — Phases 1-3 solved what happens *after* two people are connected (a real, isolated, reproducible environment); Phase 5 solves *how connecting itself* happens without requiring the peer to install Node, clone the repo, and run `npm install` first
- High priority for adoption — removes the single biggest friction point for anyone trying MYNA

## Phase 6 — Compiled CLI (evaluate after Phase 5)
- A single downloadable binary (e.g. via `pkg` or `bun build --compile`) for `envshare up`/`envshare join`, instead of requiring a full Node project checkout
- Deliberately sequenced after Phase 5: once the browser client exists, re-evaluate whether a compiled CLI is still needed for the primary use case, or whether it's a secondary convenience for host-side usage only

## Phase 7 — Session recording/replay
- Asciinema-style capture of the PTY stream for later playback
- Real differentiator, not urgent — sequenced after the core sharing/security/adoption phases

## Phase 8 — Project health
- Architecture diagram in the README
- CONTRIBUTING.md, issue templates
- This roadmap kept current as phases complete
- Semantic versioning
- Explicit security section stating which phase adds the sandbox and which adds reproducibility guarantees, so nobody mistakes an early build for something safe to expose broadly

---

## Sequencing notes

Phases 4 onward are intentionally *planned*, not built. The core loop, the security sandbox, and build reproducibility are all now done and verified — scope creep before that foundation was solid would have been the most likely way this stalled; now that it's solid, the next highest-leverage work is removing setup friction (Phase 5), not adding more features on an still-hard-to-reach core.