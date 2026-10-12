# MYNA Roadmap

MYNA lets a developer share a live, isolated, reproducible terminal session with a teammate through a link. The guest needs no install and no account. The terminal data travels peer to peer.

This file separates what is built from what is planned. Phases 1 to 5 are summarized. Phases 6 onward are written as working instructions: what to build, why, how to know it's done, and what is deliberately left out.

## Direction

The goal is to solve one workflow noticeably better than the alternatives:

> "I found a bug" to "my teammate is in the same environment, can see the code, and we reproduced it together," in about a minute, with nothing installed on the teammate's side and no accounts.

Generic terminal sharing already exists (tmate, upterm) and is a thin market on its own. The differentiators MYNA already has are the browser-only guest, the isolated reproducible container, the host-controlled permissions, and the lack of any account. New features are justified only if they shorten that workflow. A feature that doesn't is out of scope, however attractive it sounds.

**Weight is a feature.** MYNA should stay light: a small package, a stateless signaling server with no database, a small browser bundle, and a single resource-limited container per session. See "Weight budgets" at the bottom.

---

## Completed

### Phase 1: P2P core ✅
PTY streaming over a WebRTC DataChannel with a room-code signaling server. SDP/ICE exchange, bidirectional input, resize sync. Verified across separate networks, including the symmetric-NAT case that needs a TURN relay.

### Phase 2: Container sandbox ✅
The shared shell runs in a disposable Docker container behind a shared `Session` interface. Verified: `whoami` returns `root` in the container and no host files are visible.

### Phase 3: Reproducible builds and CI ✅
Base image pinned by digest. Reproducibility is checked by hashing `RootFS.Layers` (the top-level image ID was found to change on every build because of Buildx attestation metadata). `myna.lock` plus GitHub Actions, with a deliberately failing run in the history as proof.

### Phase 4: Multi-peer and permissions ✅
Host approval gate, `view` and `control` roles enforced on the host, multiple simultaneous peers with a connection each, replay buffer for late joiners, JSON message framing, and a revoke command. The server accepts approvals only from the host's socket and relays handshake messages only for approved peers.

**Known limitation:** `Ctrl+X` revokes all active peers at once. Revoking one peer while the others stay connected has not been tested. It is tracked in Phase 10.

### Phase 5: Browser client ✅
An `xterm.js` web terminal that reads the room code from the URL fragment, lets the guest request `view` or `control`, and opens a direct DataChannel to the host. Public signaling server on Render over `wss://`. TURN credentials are held server-side as environment variables and handed to a client only after the host approves. `PROTOCOL.md` documents the signaling and DataChannel messages.

Phase 5 was reported complete and tested. The criteria it was written against were:
- a phone on mobile data joins a host on another network through a link, using relay candidates
- `view` is blocked and `control` works from the browser
- revoke disconnects the browser with a visible message

---

## Round 0: ask real developers now (runs alongside Phase 6)

Nobody, including the author, knows yet what developers will use this for. Find out cheaply before building more.

- Give the current build to 3 to 5 developers you trust. Ask each to do one real task with it, such as "show me a bug in your own project."
- Watch without helping. Note every place they hesitate.
- Afterward ask three questions: What did you use it for? What did you wish it did? Would you use it again this month, and for what?
- Trusted friends only. The build is not hardened (Phase 7), so don't announce it publicly.

The answers decide how much of Phase 9 gets built and in what order.

---

## Phase 6: Make it a real product (CLI and npm)

**Goal:** `npx <package> up` on a machine with Node and Docker prints a link in under two minutes, and the shell it shares is the user's own project environment.

### 6.1 Real commands
- `myna up [--dockerfile <path>] [--image <name>] [--mount none|ro|rw] [--max-peers N]`
- `myna join <code-or-link> [--role view|control]` for CLI guests
- `myna lock` and `myna verify` (replace `lock-test.ts`)
- `myna cleanup` to remove leftover containers
- Move code out of `host-test.ts` and `peer-test.ts` into `src/cli/`. Print the shareable link and code on startup.

### 6.2 Share the user's environment, not bare Ubuntu
- Detect a `Dockerfile` in the working directory and build it. Fall back to a small default image if there isn't one. Compose files can come later.
- Mount the project directory at `/workspace` and start the shell there. This is what makes "reproduce the bug together" true.
- **Tradeoff:** a mount reopens filesystem access. Default to `ro`. With `rw`, a control guest can modify the host's files in that directory, so require an explicit flag and print a warning.

### 6.3 Wire in the reproducibility check
- `myna up` verifies the built image against `myna.lock` and warns on drift, so the Phase 3 work becomes visible to users.

### 6.4 Build and package
- Compile with `tsc` to `dist/`. Add a `bin` entry with a shebang so `npx` doesn't need `tsx`.
- Set `engines` honestly. The CI run showed `chalk@6` requires Node 22 and `commander@15` requires 22.12, so either require `>=22.12` or pin older versions.
- Use a `files` whitelist so only `dist/`, the README and the LICENSE are published. Run `npm pack --dry-run` and read the list. Make sure `.env` and anything personal are not in it.

### 6.5 Tame native dependencies
- `@roamhq/wrtc` ships prebuilt binaries for desktop platforms. The Android/Termux test showed it fails where no prebuild exists.
- `node-pty` is not used by the Docker path. Make it an optional dependency for a `--local` mode, so a failed native build doesn't break installation.
- Test `npm install -g` on clean Windows, macOS and Linux machines.

### 6.6 Preflight checks
- Before starting, check that the Docker daemon is reachable and print a plain message if not. The raw error today is `connect ENOENT //./pipe/docker_engine`.
- Also handle build failures, an unreachable signaling server, and missing TURN configuration.

### 6.7 Self-hostable signaling
- Provide `myna serve` and a small Docker image for the signaling server, so users aren't forced to depend on yours. It also caps your hosting costs and abuse exposure.

### 6.8 Publishing
- Check the name with `npm view <name>`. If taken, use a scoped name (`@you/myna`). Check for collisions with existing projects before committing.
- Add a LICENSE (Apache-2.0 or MIT), package metadata (`repository`, `keywords`, `bugs`, `homepage`), a CHANGELOG, and semver.
- Publish from GitHub Actions with npm provenance and 2FA on the account. First release as `0.1.0` under a `next` tag, promoted once real users have tried it.

**Done when:** on a clean machine with only Node and Docker, `npx <package> up` in a folder with a Dockerfile prints a link, a guest joins from the browser, and the guest's shell is in the project environment.

---

## Phase 7: Security hardening (before any public announcement)

**Goal:** state exactly what a malicious guest with `control` can and cannot do, backed by tests.

### 7.1 Container hardening
- Resource limits (`Memory`, `NanoCpus`, `PidsLimit`) so a fork bomb or memory hog can't take down the host.
- Drop all Linux capabilities and add back only what's needed. Set `no-new-privileges`. Run as a non-root user.
- Decide the network policy deliberately. With default networking the container reaches the internet, and on Docker Desktop it can reach services on your machine through `host.docker.internal`. Offer `--network none` and document the default.
- Never mount the Docker socket.

### 7.2 Abuse resistance on the signaling server
- Room codes are 32 bits today. Put a long random token in the link, and keep any short code for display only.
- Rate-limit join attempts per IP, cap pending requests per room, give rooms a TTL and a maximum age, and set `maxPayload` on the WebSocket server.
- Idle and maximum session durations on the host side.

### 7.3 TURN credentials
- Static credentials handed to approved clients can be copied and reused to spend your relay quota. Move to short-lived credentials if your TURN provider supports them, and monitor usage.

### 7.4 Authenticating the handshake (optional, advanced)
- SDP, including DTLS fingerprints, passes through the signaling server. A compromised server could in principle swap them and sit in the middle.
- Mitigation: derive a short code from the fingerprints, show it on both screens, and have the host confirm it out loud.

### 7.5 Housekeeping
- `SECURITY.md` with a reporting contact. `docs/THREAT_MODEL.md` listing assets, attackers, assumptions and non-goals (a control guest has a full shell inside the container, and the host trusts the container runtime).
- Dependabot, `npm audit` in CI, and GitHub Actions pinned by commit SHA.
- A local audit log of joins, approvals, denials and revocations.

**Done when:** automated tests show a fork bomb is contained, a host path that isn't mounted can't be read, a forged signaling message is ignored, and a viewer can't affect the shared terminal.

---

## Phase 8: Validation gate

**Goal:** decide with evidence what to build next. Do not start Phase 9 until this is done.

- Run a structured round with 8 to 10 developers who match the target user: people who debug with teammates. Include some you don't know.
- Give each a real task and measure:
  - time from `myna up` to the guest at a prompt (target: under 60 seconds)
  - how many guests connect without help
  - how many hosts start a second session within two weeks, unprompted
  - what they asked for, in their own words
- **Decision rule (starting guesses, adjust them):**
  - If about half of the hosts come back unprompted, proceed to Phase 9 and build what they asked for first.
  - If they use it once and stop, interview them about why before building anything. The problem may be the use case, not the feature set.
  - If a feature is requested by several people independently, it moves up. If only the author wants it, it moves down.
- Write the results down in `docs/validation.md`. This is also the evidence for any future funding, mentorship or job application.

---

## Phase 9: Debug handoff (the differentiator)

These features all serve the workflow in the Direction section. They are small, ephemeral and session-scoped. Nothing is stored on the server and there are no accounts. Build them in the order users ask for them, not necessarily the order below.

### 9.1 Session context card
- `myna up --title "login returns 500" --link <issue-or-pr-url>`
- The guest's browser shows a small panel with the title and link. The data is sent over the DataChannel after the host approves, and stored nowhere.
- Cost: very small. This is the cheapest way to turn "a shell" into "a debugging session about something."

### 9.2 Session chat (not team chat)
- A single ephemeral text channel inside the session, next to the terminal. No history, no accounts, no channels, no DMs.
- Message size cap and rate limit. The host can mute a guest. View guests may chat, since that's the point of being a viewer.
- **Security:** chat text is untrusted input rendered in the browser. Use `textContent`, never `innerHTML`, and don't auto-link anything except plain `http(s)` URLs.
- Don't copy terminal output into chat automatically. Terminal output can contain secrets, so sharing a snippet must be an explicit action.

### 9.3 Send files, logs and patches
- `myna send <path>` from the host. The guest gets a download button. Guest-to-host upload requires a control role and an explicit host prompt for each transfer.
- Send over a separate DataChannel in chunks. Verify a SHA-256 of the whole file on arrival. Default size limit of about 10 MB, configurable.
- **Security:** sanitize filenames (no path separators, no `..`), write received files only into a dedicated inbox directory, and never execute them.
- Default exclusions in a `.mynaignore`: `.env*`, `*.pem`, `id_rsa*`, `.git/config`, `node_modules/`, and build output. Honor the same file everywhere something leaves the host.
- Directory and project snapshots are not in this phase. The mounted workspace plus the code viewer already cover most of that need.

### 9.4 Read-only code viewer and diff
- A file tree and file view in the browser for the mounted workspace, fetched on demand over a DataChannel, respecting `.mynaignore` and a size cap.
- `myna diff` sends the host's current `git diff` to the guest as colored unified-diff text.
- Start with plain text. Add syntax highlighting only if users ask and the bundle-size cost is acceptable.

### 9.5 Issue to session
- `myna up --issue <github-issue-url>`: using the `gh` CLI, check out the referenced branch or commit into a temporary directory, build the environment, start the session, and print the join link.
- Posting the link into the issue is opt-in (`--comment`) and warns first. A join link on a public issue is a public invitation to request access. Host approval still protects the session, but the link shouldn't be broadcast by default.
- No GitHub App and no server-side GitHub integration. The `gh` CLI on the host does the work.

**Done when:** one fixed scenario (a sample repository with a seeded bug) is reproduced by two developers using MYNA, measured against doing the same thing with screen sharing and chat. Record both times.

---

## Phase 10: Reliability and polish

- **Backpressure.** Watch `dc.bufferedAmount` and use `bufferedAmountLowThreshold`. Without it, `cat` on a large file can stall the host or exhaust memory.
- **Reconnect.** A guest's network blip should recover through an ICE restart instead of forcing a new join.
- **No orphan containers.** Label every container (`myna=true`), remove on exit, handle crashes, and support `myna cleanup`.
- **Test suite.** Unit tests for framing and the role gate. An in-process integration test (host, guest and signaling server together). A Docker smoke test on Linux in CI. Windows runners generally can't run Linux containers, so test the non-Docker parts there.
- **Quiet by default.** Replace the debug `console.log` lines (candidate types, state changes) with a `--verbose` flag.
- **Recording.** `myna up --record session.cast` in asciinema format, with a warning that recordings capture anything typed, including secrets.
- **Per-peer revoke and role changes.** Remove one peer, or switch a peer between `view` and `control` mid-session, without disturbing the others. Test with a mixed pair.
- Restore the broken `session.test.ts` and keep the whole suite green.

---

## Phase 11: Docs, community and launch

- **README:** a one-paragraph pitch, a 30-second demo GIF showing the bug-to-reproduction workflow, a three-command quickstart, an architecture diagram, and a short security-model summary.
- **Comparison:** be accurate about tmate and upterm (terminal sharing through relay servers), VS Code Live Share and Codespaces. Check each project's current features before publishing the comparison.
- **Contributors:** `CONTRIBUTING.md`, a "run everything locally" guide, issue and PR templates, a code of conduct, and a handful of labeled `good first issue` tickets.
- **Launch order:** (1) Phase 7 and the Phase 8 gate are done. (2) Write up the engineering story: the ICE failure that needed TURN, and the Docker image ID that changed on every build because of attestation metadata. (3) Post a Show HN, plus r/commandline and r/selfhosted, with the demo GIF. (4) Answer issues quickly and ship small releases.
- A user base isn't guaranteed. What you control is a first run that works in two minutes, a clear reason to choose this over tmate or upterm, and honest security claims.

---

## Explicitly not building (for now)

| Idea | Why not now |
| --- | --- |
| Team chat, DMs, channels, presence | Competes with Slack and Discord, where the conversation already lives. Needs accounts, storage, moderation and retention, and would undo the no-account, lightweight advantage. |
| User accounts and project workspaces | Adds a database, authentication and a privacy surface. Revisit only if Phase 8 shows people want persistent rooms. |
| Video or voice calls | A separate product. Teammates already have a call open. |
| Browser IDE or collaborative editor | Very large scope. The read-only viewer covers "inspect the code." |
| Replacing GitHub | Not the goal. Integrate through the `gh` CLI instead. |
| Persistent session history in the cloud | Terminal output can contain secrets, and storing it makes MYNA a custody problem. |

**What would change this:** several Phase 8 users independently asking for the same item, and the cost of building it staying within the weight budgets.

---

## Weight budgets

Measure these and record them in the repo. Don't claim "lightweight" until the numbers exist.

- **npm package:** record install size (`npm pack` plus a clean install). Prefer few dependencies. Keep native modules optional.
- **Browser bundle:** record the gzipped size. `xterm.js` is the main cost. Use plain TypeScript with no UI framework unless a feature truly needs one.
- **Signaling server:** stateless, rooms in memory, no database. Record memory use at a realistic number of rooms.
- **Host machine:** one container per session with CPU, memory and pid limits (Phase 7), stopped as soon as the session ends. Use a small default image. Alpine is much smaller than the current 119 MB Ubuntu image but uses musl and BusyBox, so check it against real projects before making it the default. Record container memory use with `docker stats`.
- **The honest exception:** Docker Desktop itself is heavy on Windows and macOS, and MYNA requires a Docker daemon. Document that. Later, check compatibility with lighter runtimes (Docker Engine on Linux, Colima, Podman).

---

## Order and rules

Do the phases in order, with Round 0 running alongside Phase 6. Phase 7 comes before any public announcement, because publishing an unhardened shell-sharing tool is the one mistake that is hard to take back. Phase 8 comes before Phase 9 so that new features are pulled by users, not pushed by guesses. A phase is done when its done criteria are met with evidence (logs, a CI run, a recording), not when it seemed to work.
