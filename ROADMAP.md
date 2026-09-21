# MYNA Roadmap

MYNA lets someone get a live, interactive terminal inside a container you're running locally — over a direct peer-to-peer connection, with no server in the middle holding the actual terminal data.

This roadmap tracks what's built and verified, what's in progress, and what's planned. Status reflects real test results, not intentions.

---

## Phase 1 — Core PTY + WebRTC Sharing Loop

**Goal:** two people, one sharing a live local shell with the other over a direct WebRTC connection, no cloud relay carrying the actual terminal data (TURN relay as a fallback path only, when direct/STUN connectivity isn't possible).

### Week 1 — PTY basics ✅ Done
- Spawn a local shell inside a PTY (`node-pty`)
- Wire stdin into the PTY in raw mode
- Handle terminal resize (`SIGWINCH` → `pty.resize()`)
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
- **Verified across genuinely separate networks** (home laptop ↔ GitHub Codespaces VM, via an ngrok-tunneled signaling server): confirmed the connection depends on TURN relay in the presence of symmetric NAT — plain STUN alone was tested and confirmed insufficient in this real-world case, not just a theoretical caveat. TURN credentials (Metered.ca) added as a fallback in `iceServers`, alongside STUN.
- TURN credentials are handled via environment variables (`.env`, gitignored), not committed to source

### Week 4 — Wire it together (Phase 1 completion) 🔧 In progress
- [ ] Replace hardcoded test messages with real PTY output streamed over the DataChannel
- [ ] Peer's incoming DataChannel messages rendered into their local terminal
- [ ] Peer's keystrokes sent back over the channel to the host's PTY
- [ ] Terminal resize propagated across the connection
- [ ] Demo recording + Phase 1 README section

**Honest scope note for Phase 1:** once Week 4 is complete, "sharing your terminal" means giving the connected peer direct command execution on the *host's actual machine* — there is no sandbox yet. This is fine for controlled testing between two trusted parties, but it is not safe to present as a general-purpose sharing tool until Phase 2 lands.

---

## Phase 2 — Containerization
- Spawn the PTY inside a Docker container instead of the host shell (`dockerode`)
- This is a security requirement, not an optional feature — it's what makes sharing defensible beyond "test with a trusted friend"
- `envshare up` builds/reuses an image from a Dockerfile or docker-compose.yml in the project directory

## Phase 3 — Reproducibility hashing + CI
- Content-hash built image layers
- Pin base image digests instead of mutable tags
- CI does a clean-room rebuild on every push and fails loudly if the hash drifts from what's pinned
- This is the project's actual differentiated engineering — not "we used Docker," but verifying that a build is reproducible byte-for-byte

## Phase 4 — Multi-peer / permission model
- Host approves join requests rather than anyone with the room code getting a shell automatically
- Revoke access mid-session
- Viewer-only vs full-control peer roles

## Phase 5 — Browser-based peer client
- `xterm.js`-rendered client so a peer can join via a link, no CLI install required
- Native browser WebRTC support sidesteps the native-binary platform issues Node-side bindings can hit (e.g. the `@roamhq/wrtc` Android/Termux gap found during testing)
- High priority for adoption — removes the single biggest friction point for anyone trying MYNA

## Phase 6 — Session recording/replay
- Asciinema-style capture of the PTY stream for later playback
- Real differentiator, not urgent — sequenced after the core sharing/security/adoption phases

## Phase 7 — Project health
- Architecture diagram in the README
- CONTRIBUTING.md, issue templates
- This roadmap kept current as phases complete
- Semantic versioning
- Explicit security section stating which phase adds the sandbox, so nobody mistakes an early build for something safe to expose broadly

---

## Sequencing notes

Phases 4–7 are intentionally *planned*, not built, until Phases 1–3 are solid. Scope creep across phases before the core loop and the security sandbox are done is the most likely way this stalls — sequence, don't parallelize.
