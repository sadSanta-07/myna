# MYNA Roadmap (native-first architecture)

MYNA shares your real terminal with a teammate through a link. The guest can use a browser or the CLI. Terminal data travels peer to peer over WebRTC. This version of the roadmap reflects the pivot from "Docker by default" to "your own shell by default, Docker optional."

This file separates what is built from what is planned. Phases 1 to 5 are summarized. Phases 6 onward are working instructions: what to build, why, how to know it's done, and what is left out.

## Direction and honest positioning

**Pitch:** private peer-to-peer terminal sharing for teammates you trust. You share the shell you already use, with your own tools, and nothing needs to be set up.

**What is true today:**

- Terminal data is encrypted between the two peers (DTLS), including when it is relayed through a TURN server.
- No central server relays terminal data in the direct case.

**What not to claim yet:**

- "Completely private." The signaling server sees room codes and the IP addresses inside ICE candidates, and until Phase 10 a compromised signaling server could in principle sit in the middle of the handshake.
- Specific latency numbers. Latency depends on the network path, and a TURN relay adds a round trip. Measure before quoting anything.
- That nobody else does peer-to-peer terminal sharing. **termishare** (WebRTC, a prebuilt Go binary, TURN fallback) and **shwim** (end-to-end encrypted through Magic Wormhole's PAKE, with a read-only option) appear to. Read both READMEs and update the comparison before claiming a differentiator.

### Three ways to use it

| Mode | Command | For | Protection |
| --- | --- | --- | --- |
| View (default role) | `myna up` | anyone | The guest cannot send input. |
| Control on your real shell | `myna up` | teammates you trust | Host approval, freeze key, guardrails, audit log. |
| Control in a sandbox | `myna up --sandbox` | strangers, teaching | Container isolation. |

**Principle:** a guardrail is accident prevention, not a security boundary. A command filter can't stop a determined guest, because there are endless ways to run the same thing (`r""m -rf`, `find -delete`, a saved script, `curl ... | sh`). Real protection against a hostile guest is the sandbox, or not granting control.

### Architecture

```
guest (CLI or browser)
   |  WebRTC DataChannel
   v
[ framing -> role check -> freeze -> audit -> guardrail ]   <- the Input Gate
   |
   v
Session backend:  native (default) | docker (--sandbox) | bwrap (later, Linux)
   ^
host keyboard ---- origin = host, never gated
```

### Architecture rules

These come from problems the native pivot creates. Follow them from the start.

1. **Every input chunk carries its origin** (host or a specific guest). Only guest input passes through the gate. The host's own typing is never filtered.
2. **In native mode the PTY size follows the host's real terminal.** The old behavior, applying a guest's resize to the PTY, would corrupt the host's screen. Ignore guest resize messages in native mode. Guests render at the host's dimensions.
3. **Host hotkeys use a leader key.** In native mode your keyboard goes into the shell, so bare chords like Ctrl+X or Ctrl+F collide with readline, vim, less and tmux. Use a rarely used leader (configurable), then a letter.
4. **Drop, never queue.** Frozen, denied or revoked input is discarded. Queued input would execute the moment you unfreeze.
5. **Fail closed.** If a safety feature can't attach (for example no guardrail hook for an unsupported shell), say so and require an explicit acknowledgment.

---

## Completed

### Phase 1: P2P core ✅

PTY streaming over a WebRTC DataChannel. SDP/ICE exchange, bidirectional input, resize sync. Verified across separate networks, including the symmetric-NAT case that needs TURN.

### Phase 2: Container sandbox ✅

Disposable Docker container behind a shared `Session` interface. Verified isolation (`whoami` returned `root` in the container, host files not visible).

### Phase 3: Reproducible builds and CI ✅

Digest-pinned base image, layer-content hashing (the top-level image ID changed on every build because of Buildx attestation metadata), `myna.lock`, and GitHub Actions with a deliberately failing run as proof. This matters in sandbox mode only.

### Phase 4: Multi-peer and permissions ✅

Host approval, `view` and `control` roles enforced on the host, several guests at once, replay for late joiners, JSON framing. The server accepts approvals only from the host and relays handshake messages only for approved peers.

### Phase 5: Browser client ✅

`xterm.js` guest page with role selection, direct DataChannel to the host, TURN credentials held server-side, and `PROTOCOL.md`.

### Repo state (`main`, checked 2026-10-14)

This comes from a file inventory and written description, plus a direct read of `cloudflare/worker.ts`, `src/cli/commands/up.ts`, `src/core/peer.ts` and `src/core/types.ts`. Not yet read: `join.ts`, `session.ts`, `docker.ts`, `server.ts`, `public/index.js` and `PROTOCOL.md`. Treat anything about those files as a map to confirm.

- **Signaling:** `cloudflare/worker.ts` holds the Worker and the `MynaRooms` Durable Object (declared as a SQLite class in `wrangler.toml`). It is deployed and `/health` returns OK. A second, in-memory Node signaling server also exists in `src/core/server.ts`.
- **CLI:** `src/bin/myna.ts` calls `src/cli/index.ts` (Commander), which registers `commands/up.ts` and `commands/join.ts`. A working global `myna` command exists through `npm link`.
- **What `myna up` does today:** it defaults to **Docker**. It builds `./Dockerfile` as `myna-workspace:latest` and checks `myna.lock`, or uses `ubuntu:22.04` when there is no Dockerfile. `--local` selects a bare shell through `node-pty` with a warning that the host filesystem is exposed. **There is no `--sandbox` flag and native is not the default.** The native-first pivot is planned, not built.
- **Core:** `session.ts` (node-pty), `docker.ts` (builds, containers, resource limits, attach), `peer.ts` (WebRTC and ICE/TURN configuration), `types.ts` (the `Session` interface).
- **Browser guest:** `public/index.html`, `index.js` and `index.css`, served as Worker assets. `frontend/` is a separate Next.js landing site with several large video files.
- **Tests:** `tests/` mixes real tests (`session.test.ts`, `docker.test.ts`) with manual scripts (`host-test.ts`, `peer-test.ts`, `hash-test.ts`, `lock-test.ts`, `docker-pty-test.ts`).
- **CI:** one workflow, `reproducibility.yml`.
- **Docs:** `docs/PROTOCOL.md`, `CLOUDFLARE_DEPLOY.md`, `AGENTS.md`, `README.md`, `ROADMAP.md`.
- **Not yet independently verified:** the complete flow through the Worker (create room, approval, SDP and ICE exchange, data channel, terminal I/O). Only `/health` has been confirmed.
- **Known inconsistency:** `up.ts` prints a share link on an old Render address while its WebSocket default is the Cloudflare Worker.
- **Working tree:** clean and in sync with `origin/main`.

### Code review (read from `worker.ts`, `up.ts`, `peer.ts`, `types.ts`)

**Already right:**

- The trust boundary in the Worker is correct. Only the host socket can approve, deny or revoke. Handshake messages are relayed only for approved peers, and the Worker stamps the sender's `peerId` itself.
- The host checks a guest's role before parsing any DataChannel message, and an unknown role falls back to `view`.
- Rooms use the WebSocket Hibernation API, each guest has its own connection, and input uses JSON framing (`type: "input"`).

**Fix before anyone but you uses native mode (P0):**

1. **Typing `c`, `v` or `n` answers the join prompt.** In `up.ts`, while a request is pending, every host keystroke is swallowed and `c` grants control. A host typing `cd` or `cat` when a request arrives grants a stranger control of their real shell by accident, and the rest of what they typed is lost. Approvals must need a deliberate action that ordinary typing can't produce (see 6.4).
2. **`dotenv` loads the current directory's `.env`.** `peer.ts` calls `dotenv.config()`. Run from a project, `myna up` loads that project's secrets into Myna's environment, and if `session.ts` still passes `process.env` to the shell, into the shell a guest controls. It can also override `TURN_*`.
3. **Host Ctrl+C kills Myna and never reaches the shell.** In native mode you couldn't interrupt your own running command. Ctrl+X (revoke) also collides with readline. In sandbox mode the same handler never calls `session.kill()`, so the container is left running.
4. **A guest's resize message resizes the host's PTY** (`session.resize(m.cols, m.rows)`). In native mode that corrupts the host's screen.
5. **Debug output goes to the host's terminal.** `peer.ts` and `up.ts` use `console.log`, which writes into the middle of the shared shell.
6. **Output replay.** Each new guest receives up to 100,000 characters of history. In native mode that is everything your terminal showed since `myna up`, which may include secrets.

**Fix soon (P1):**
7. **The host ignores the ICE servers the Worker sends.** `up.ts` calls `createPeerConnection("host")` with no second argument, so the host uses the defaults in `peer.ts`, which read `TURN_*` from a local `.env`. An npm user has none, so their host is STUN-only.
8. **Static TURN credentials are open to anyone, not only approved guests.** The Worker sends `TURN_USERNAME` and `TURN_CREDENTIAL` to whoever the host approves, but anyone can be a host: an attacker opens two sockets, creates a room, approves their own second socket and receives your credentials. The Metered free plan is 500 MB, and exhausting it breaks relays for every real user. The Worker is live, so treat this as P0. Rate-limit `create-room` per IP and issue short-lived credentials (Metered's API, or Cloudflare's own TURN service, which is worth evaluating since you are already on Cloudflare).
9. **One Durable Object holds every room in the world** (`idFromName("myna-global-signaling")`). Use one per room.
10. **No rate limits or caps.** The room code is 8 hex characters (32 bits), not 4 digits as first reported. It's better than I assumed, but there is no throttling, and each guess that hits a live room puts a prompt on the host's terminal.
11. **`deny-peer` and `revoke-peer` never close the guest's WebSocket.** They only mark it closed. `webSocketClose` also calls `host.send` without a try/catch.
12. **Unhandled exceptions.** `up.ts` calls `JSON.parse` on server messages and awaits WebRTC calls with no try/catch, and Node exits on an unhandled rejection. A malformed message or one failed `setRemoteDescription` kills the host's session. A guest controls the SDP and ICE it sends, so even a `view` guest can end your session with one malformed answer.
13. **`workers.dev` personal subdomain baked into the CLI defaults,** and a different, stale Render address for the share link. Put a custom domain in front before releasing, so you can move infrastructure without breaking installed CLIs.
14. **No origin tagging and no gate.** Host and guest input both call `session.write(...)` (planned in 6.1 and 7.1).

---

## Round 0: ask real developers now (runs alongside Phase 6)

Nobody knows yet whether people want this. Find out cheaply.

- Give the current build to 3 to 5 developers you trust. Ask each to share a real terminal with someone.
- Watch without helping. Note where they hesitate.
- Ask:
  1. Would you give a teammate control of your real shell? What would make you comfortable?
  2. When a teammate last helped you debug, could they have rebuilt the problem from the repo? If so, what would they have wanted instead?
  3. Would you use this again this month? For what?
- Trusted friends only. The build is not hardened.
- Before testers, spend an hour with termishare, shwim and tmate. For each, note what a guest needs installed, how the host approves, and what protects the host. Ask testers which they'd pick and why.

The answers decide how much of Phases 14 and 12 (the single-binary question) is worth building.

---

## Phase 6: Native-first core

**Goal:** `myna up` shares your actual shell, and it feels like using your terminal normally. No Docker needed.

### 6.0 Repo cleanup that unblocks everything (do first)

- **One source of truth for URLs.** Create `src/core/config.ts` with the default signaling URL and a share-link base derived from it, and use it in `up.ts` and `join.ts`. This fixes the Render and Cloudflare mismatch.
- **Prove the Worker end to end.** Write a scripted test that runs create-room, join, approve, SDP, ICE and a data-channel round trip against `wrangler dev` (and later the deployed Worker), and run it in CI. Until it exists, "works through Cloudflare" is a claim, not a fact.
- **Two signaling servers.** Make `cloudflare/worker.ts` the canonical one and keep `src/core/server.ts` for local development and self-hosting only if it earns its place. If both stay, write conformance tests from `docs/PROTOCOL.md` and run them against both. Two implementations drift apart quietly.
- **Use the ICE servers the Worker sends.** Pass `msg.iceServers` from `peer-joined` into `createPeerConnection`. Then remove TURN handling from the CLI entirely.
- **Remove `dotenv` from the CLI.** Configuration comes from real environment variables or a Myna config file in the user's config directory, never from the current directory.
- **Catch errors.** Wrap the message handler in `up.ts` (and the one in `join.ts`) in try/catch so one bad message or failed negotiation drops a guest and not the whole session. Add a `close` handler on the signaling socket in `up.ts`, since the host doesn't notice today if signaling drops.
- **Sort `tests/`.** Move the manual scripts (`host-test`, `peer-test`, `hash-test`, `lock-test`, `docker-pty-test`) to `scripts/` or delete them. Keep the `*.test.ts` files and make `npm test` run them. Confirm `session.test.ts` passes after the `Session` interface changes.
- **CI.** Add a `ci.yml` that installs, runs `tsc --noEmit` and runs the tests. Restrict `reproducibility.yml` to changes to `Dockerfile` and `myna.lock`, since it only matters for sandbox mode.
- **Repo weight.** `frontend/public` holds several video files (`.mp4`, `.webm`). Run `git count-objects -vH` to see the clone size. Move media to external hosting or Git LFS, and keep `frontend/` out of the npm package (use a `files` whitelist) and out of the root install.
- **Review before promoting the repo.** Read `AGENTS.md`, `CLOUDFLARE_DEPLOY.md` and `wrangler.toml` for personal or account details.

### 6.1 Backend selection

- Today `myna up` defaults to Docker and `--local` selects the shell. Flip this: native by default, `--sandbox` for Docker, and keep `--local` as a hidden alias for one release so existing habits and scripts don't break.
- `myna up` uses the native backend. `myna up --sandbox` uses Docker (options: `--image`, `--mount ro|rw|none`).
- Keep origin out of the `Session` interface. Put the Input Gate (7.1) in front of `session.write` and tag input at the gate, since a backend shouldn't know who typed. Do add a `backend: "native" | "docker"` field so the UI can say which guardrails apply, and make `onData` return an unsubscribe function.
- Keep the `Session` interface as the single seam between transport and backend.

### 6.2 Host terminal passthrough

- **Quiet by default.** Any write to stdout lands inside the shared shell. Move the `console.log` calls in `peer.ts` and `up.ts` behind `--verbose`, and send them to a log file or one reserved status line.
- Put the host's terminal in raw mode, forward host keystrokes to the PTY, and mirror PTY output to the host's screen and to every guest.
- Restore the terminal on every exit path: normal exit, shell exit, Ctrl+C handling, uncaught exceptions and signals. A crash must never leave the host's terminal in raw mode.
- The shell's exit ends the session, and tells guests why.

### 6.3 Resize policy

- `up.ts` currently applies a guest's resize message with `session.resize`. Drop that in native mode.
- PTY size follows the host's terminal. Ignore guest resize messages in native mode. In sandbox mode the existing behavior can stay.
- Tell guests the host's dimensions so they render correctly (the CLI guest and the browser both need this).
- Output goes to guests as raw strings while input comes back as JSON, so there is no way to send the host's size, a "frozen" notice or a "session is logged" banner. Add a second DataChannel (`control`) for those messages and leave the terminal channel untouched.

### 6.4 Leader key and host commands

- **Answer join prompts through the leader.** For example leader then `a` (approve as view), leader then `c` (approve as control), leader then `n` (deny). Ordinary keys never answer a prompt and are never swallowed while one is pending. Cap the pending queue (`joinQueue` in `up.ts` is unbounded).
- **Ctrl+C goes to the shell in native mode.** Quit Myna with a leader command or by exiting the shell.
- One configurable leader key, then a letter: freeze or unfreeze, revoke all guests, list guests, help.
- Choose the default by testing it inside bash, zsh, PowerShell, vim, tmux and less.

### 6.5 Consent flow

- **Output replay is a privacy decision.** Today every new guest gets up to 100,000 characters of history. In native mode, tell the host before approving, and add `--no-replay`. Consider no replay by default for `control` guests.
- The approval prompt shows the requested role. The default answer is `view`.
- Granting `control` on the native backend requires typing a confirmation once per session, with plain text such as: "This person can run anything you can in this shell."
- Show every guest a banner saying the session is logged (Phase 7.3).

### 6.6 Join-code security and signaling abuse (required before native mode is used by anyone but you)

- The code is 8 hex characters (32 bits), made in `cloudflare/worker.ts`. There is no rate limit, and every guess that hits a live room puts a prompt on the host's terminal. With a native shell, one mistaken approval is a full compromise.
- **One Durable Object per room.** The Worker generates the room ID, routes by `idFromName(code)`, and guests connect with the code in the URL. Rooms are isolated by construction, idle rooms disappear, one busy room can't slow the others, and rate limits are per room.
- Rate-limit join attempts per IP and per room. Cap pending requests (a handful), guests per room, and message size. Give rooms a TTL and a maximum age.
- Use a longer random token (about 40 bits or more, base-32 without look-alike characters) in the link, and keep the short code for display only.
- The Worker already uses the Hibernation API (`ctx.acceptWebSocket`, `webSocketMessage`). Keep it.
- Close the guest's socket with a reason on `deny-peer` and `revoke-peer`, and wrap `host.send` in `webSocketClose` in a try/catch.
- Add state guards. Today a socket can send `create-room` or `join-room` repeatedly, and an approved guest can send `create-room` and become a host mid-session. Ignore both once a socket already has a role and a code.

**Done when:** `myna up` works in PowerShell, bash and zsh. A guest joins from the CLI and from a link. Both the host and the guest can type. Resizing the host window works. Ctrl+C reaches the shell. A forced crash leaves the host's terminal usable. Brute-forcing codes is rate-limited, shown by a test.

---

## Phase 7: Guardrails ("seatbelt")

**Goal:** make accidents unlikely and misuse visible, with almost no interruption for the host.

### 7.1 The Input Gate

- One module that every guest input chunk passes through: role check, then freeze, then audit, then guardrail.
- Unit-test it against a fake backend. Rule 4 applies: dropped means discarded.

### 7.2 Freeze

- Leader key plus `f` toggles freeze. The guest's input is discarded and the connection stays up.
- Show a status line to the host and a banner to the guest ("input paused by host").
- Add optional time-limited control that expires on its own.

### 7.3 Audit log

- Log guest input with timestamps and the guest identifier, plus the reconstructed command line when the guardrail hook provides it.
- Store it in the user's state directory (for example `~/.local/state/myna/` or `%LOCALAPPDATA%\myna\`) with owner-only permissions. Don't write it into the project directory, where it can be committed by accident.
- The log is sensitive: it will contain anything the guest typed, including passwords. Support `myna audit prune`, set a retention default, and never log host output.
- Tell guests they are being logged (see 6.5).

### 7.4 Destructive-command guardrail

**A regex over the DataChannel stream will not work.** The channel carries raw keystrokes one at a time, with backspaces, arrow keys, tab completion and history recall. A guest can press Up and Enter to re-run an old `rm -rf`, and the dangerous text never crosses the wire. The check has to happen when Enter is pressed, using the shell's own line buffer.

- **Design spike first.** Prove that in PowerShell (your own shell) a hook can pause an Enter, read the line, ask the wrapper whether to allow it, and continue. Only after that works, extend it.
- Per-shell hooks: PowerShell via a PSReadLine key handler on Enter, zsh by wrapping the `accept-line` widget, bash via `bind -x` or the `DEBUG` trap, fish via its preexec event. `cmd.exe` has no hook and is unsupported.
- Unsupported shell or failed hook: say so and require explicit acknowledgment (rule 5).
- Only prompt for guest-originated lines. The host's own commands are never intercepted.
- Use a risk check, not bare patterns. `rm -rf node_modules` should pass. `rm -rf /`, `rm -rf ~`, `dd of=/dev/...`, `mkfs`, `git push --force`, `Remove-Item -Recurse -Force` on a home or root path, `format`, `shutdown`, and `DROP TABLE` should hold.
- The prompt appears on one reserved line of the host's terminal: allow or deny, defaulting to deny after a timeout so an absent host isn't blocking the session.
- Keep the pattern list in a configurable file.

### 7.5 Be honest in the docs

- State plainly what the guardrail does not catch: scripts, aliases, functions, `curl | sh`, anything typed inside vim or a REPL, and obfuscated commands. Publish the bypass test results next to the feature.

**Done when:** a test matrix of caught and uncaught commands exists and is published. Freeze stops a running guest instantly and unfreezing replays nothing. The audit log is complete, protected, and prunable.

---

## Phase 8: Sandbox backends (the second option)

- **8.1 Docker backend:** `--sandbox` with your own Dockerfile or a small default image, optional project mount (`ro` by default, `rw` only with an explicit flag and a warning), and the reproducibility check against `myna.lock`.
- **8.2 Hardening:** CPU, memory and pid limits, dropped capabilities, `no-new-privileges`, a non-root user, a deliberate network policy (default networking can reach the internet, and on Docker Desktop it can reach services on your machine through `host.docker.internal`), and never mount the Docker socket.
- **8.3 bubblewrap backend (Linux, experimental):** a read-only bind of the host's `/usr` plus a throwaway home directory and no access to `~/.ssh`, with no daemon. Some distributions restrict unprivileged user namespaces, so test on your target distributions.
- **8.4 macOS:** evaluate `sandbox-exec`. It is marked deprecated by Apple, so check that it still works on current macOS before committing.
- **8.5 Windows:** Docker or WSL is the sandbox. There is no cheap unprivileged equivalent, so document it.
- **Never write your own isolation.** A chroot alone is not a sandbox.

**Done when:** `myna up --sandbox` works, fork-bomb and path-escape tests pass, and the docs say exactly what each backend does and does not isolate.

---

## Phase 9: Browser guest for native mode

Resume the paused UI work with the native model in mind.

- Render at the host's dimensions and allow scrolling when the guest's window is smaller.
- Show clear states: waiting for approval, view, control, frozen, logged, revoked, host left.
- Keep it light. Prefer the default renderer, and add the WebGL addon only if it is worth its size. Record the gzipped bundle size.
- Treat host output as untrusted in the browser. Keep clipboard-write escape sequences (OSC 52) disabled by default and only open plain `http(s)` links.

**Done when:** a guest joins from a phone on mobile data and the experience matches the CLI guest.

---

## Phase 10: Trust, privacy and abuse resistance

- **Authenticated handshake:** use a PAKE (password-authenticated key exchange, as magic-wormhole does) or a short comparison code so that a malicious signaling server can't sit in the middle. Evaluate current JavaScript libraries before choosing one.
- **TURN credentials:** the Worker currently hands the same static credentials to every approved guest. Mint short-lived per-session credentials instead (the Metered dashboard documents expiring credentials), and monitor usage.
- **Signaling abuse:** per-IP limits, connection caps, and logs that don't retain more than needed.
- **Documents:** `SECURITY.md` with a reporting contact and `docs/THREAT_MODEL.md` rewritten for the native model. Its non-goals include "a control guest can do anything the host can" and "guardrails are accident prevention."
- **Claims review:** read every sentence in the README and website against what is verified.

---

## Phase 11: Portability and reliability

- **Shell and OS matrix:** Windows PowerShell and `cmd`, WSL, macOS zsh, Linux bash and fish, and inside tmux. Document which combinations support guardrails.
- **Windows PTY:** the project uses `useConpty: false` as a workaround for a ConPTY crash under Node 24. Re-test with current `node-pty` and Node, since the older backend is less maintained.
- **Backpressure:** watch `dc.bufferedAmount` and use `bufferedAmountLowThreshold` so a huge `cat` can't stall the host.
- **Reconnect:** recover from a network blip with an ICE restart.
- **Tests and CI:** unit tests for the gate and framing, an in-process integration test, and a smoke test on Linux. Windows runners generally can't run Linux containers, so test the Docker backend on Linux only.
- **Quiet output:** replace debug logging with `--verbose`.
- **Per-guest revoke and role changes**, tested with a mixed view and control pair.

---

## Phase 12: Package, weight and publish

- **Build:** compile with `tsc`, add a `bin` entry with a shebang, set `engines` honestly (the CI run showed `chalk@6` needs Node 22 and `commander@15` needs 22.12), and use a `files` whitelist. Read `npm pack --dry-run` and make sure no `.env` or personal files are included.
- **Native dependencies:** `node-pty` and `@roamhq/wrtc` are native modules. Now that native mode is the default, `node-pty` is core. Test `npm install -g` on clean Windows, macOS and Linux machines. A failed native install is the most likely first impression, so give it a clear error message.
- **Single binary question:** Node's single-executable support or `bun build --compile` might bundle the app, but native addons complicate that. A rewrite in Go or Rust would produce small static binaries for ARM and Android, which would solve the Termux failure, but it means rewriting the core. Decide only if Round 0 or Phase 13 shows demand from low-end or headless users.
- **Publishing:** check the name with `npm view <name>` (use a scoped name if taken), add a LICENSE, metadata and a CHANGELOG, and publish from GitHub Actions with provenance and 2FA. Release `0.1.0` under a `next` tag first.
- **Self-hosting:** document how to run your own signaling server (Worker or `npm run signal`), so users don't depend on yours.

### Weight budgets (measure, record in the repo, then claim)

- npm install size, and dependency count.
- Browser bundle, gzipped.
- Signaling server: memory and Durable Object usage at a realistic number of rooms.
- Host: memory and CPU of `myna up` itself. Native mode has no container overhead. In sandbox mode, record `docker stats`.

---

## Phase 13: Validation gate

Don't build Phase 14 until this is done.

- Run a structured round with 8 to 10 developers who match the target, including some you don't know.
- Give each a real task and measure: time from `myna up` to the guest at a prompt (target under 60 seconds), how many guests connect without help, how many hosts start a second session within two weeks unprompted, and what they asked for in their own words.
- Decision rule (starting guesses): if about half the hosts come back unprompted, proceed to Phase 14 and build what they asked for. If they use it once and stop, find out why before building. If one feature is requested independently by several people, it moves up. If only you want it, it moves down.
- Record the results in `docs/validation.md`.

---

## Phase 14: Debug handoff (only what Phase 13 supports)

Small, ephemeral, session-scoped, no accounts and nothing stored on a server.

- **Session context card:** `myna up --title "..." --link <url>`, shown to the guest after approval.
- **Session chat:** one ephemeral text channel. Cap message size, rate-limit it, let the host mute a guest, render with `textContent` and never `innerHTML`, and don't copy terminal output into chat automatically (it can contain secrets).
- **Files, logs and patches:** `myna send <path>` over a separate DataChannel in chunks, SHA-256 verified, with a size limit. Sanitize filenames, write only into an inbox directory, never execute, and honor a `.mynaignore` (`.env*`, `*.pem`, `id_rsa*`, `.git/config`).
- **Live state attach (sandbox backends):** `myna attach <container>` shares a shell in an already-running container. It exposes that container's environment variables and files, so it defaults to `view` with an explicit warning.
- **Read-only code viewer and `myna diff`**, respecting `.mynaignore`.
- **Issue to session:** `myna up --issue <url>` using the `gh` CLI. Posting the join link on an issue is opt-in, because a link on a public issue is a public invitation to request access.

---

## Phase 15: Docs, community and launch

- **README:** a one-paragraph pitch, a 30-second demo GIF, a three-command quickstart, the trust-mode table above, an architecture diagram, and a short security-model summary.
- **Comparison:** be accurate about tmate and upterm (relay-based), termishare (WebRTC peer to peer), shwim (end-to-end encrypted through a PAKE), VS Code Live Share and Codespaces. Check each project's current features first. Treat these as differentiators to test, not facts to assume: a guest who needs only a browser, host approval with per-guest roles, guardrails with an audit log, and an optional sandbox.
- **Contributors:** `CONTRIBUTING.md`, a local-development guide, templates, a code of conduct, and a few `good first issue` tickets.
- **Launch:** after Phases 10 and 13. Write up the engineering story (the ICE failure that needed TURN, the Docker image ID that changed on every build, and why a regex over keystrokes can't be a guardrail), then post a Show HN and to r/commandline.
- A user base isn't guaranteed. What you control is a first run that works in two minutes, a clear reason to choose this over tmate, and honest security claims.

---

## Not building (for now)

| Idea | Why not now |
| --- | --- |
| Team chat, DMs, channels, presence | Competes with Slack and Discord. Needs accounts, storage and moderation, and removes the no-account advantage. |
| User accounts and project workspaces | Adds a database and a privacy surface. Revisit only if Phase 13 shows demand for persistent rooms. |
| Command blocklist as "security" | It can't be one. Keep it as a guardrail and say so. |
| Suggest mode (host presses Enter for the guest) | Tested against the goal of seamless sharing and rejected as too much friction. |
| Video or voice | A separate product. |
| Browser IDE, GitHub replacement | Very large scope. |
| Persistent cloud session history | Terminal output can contain secrets. Storing it makes MYNA a custody problem. |

---

## Order and release gates

1. Round 0 starts now and runs alongside Phase 6.
2. **Gate A, native mode usable by others:** Phase 6 done, including 6.6 (join-code security), plus the freeze key and the audit log from Phase 7.
3. **Gate B, any public announcement:** Phases 7, 8 and 10 done, and the docs reviewed for claims.
4. Phase 13 comes before Phase 14, so new features are pulled by users and not pushed by guesses.
5. A phase is done when its done criteria are met with evidence (logs, a CI run, a recording), not when it seemed to work.
