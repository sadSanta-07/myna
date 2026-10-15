# MYNA Roadmap (native-first architecture)

MYNA shares your real terminal with a teammate through a link. The guest can use a browser or the CLI. Terminal data travels peer to peer over WebRTC. The implementation has pivoted from "Docker by default" to "your own shell by default, Docker optional"; production-readiness gates remain open.

This file separates evidenced implementation from remaining work. A checkbox is checked only when the corresponding requirement is present and sufficiently supported by repository evidence; partially implemented phases remain open.

## Direction and honest positioning

**Pitch:** peer-to-peer terminal sharing for teammates you trust. You share the shell you already use, with your own tools, and nothing needs to be set up.

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

These are target invariants. Current source only partially enforces them; use the phase checklists and open issues below to track gaps.

1. **Target, not complete:** input origin should be explicit (host or a specific guest), and guest input alone should pass through the gate. Current code has role checks and audit/guardrail logic but no centralized origin-aware Input Gate.
2. **Native resize invariant:** the PTY must follow the host terminal. Current `up.ts` ignores guest resize for native sessions and applies it for Docker, but passing host dimensions to guests is not implemented.
3. **Leader key exists but is not configurable:** Ctrl+A followed by a letter handles join approval, freeze, and revoke-all. Compatibility testing and configuration/help remain.
4. **Drop, never queue:** desired behavior; automated tests proving frozen/denied/revoked input is discarded are still missing.
5. **Fail closed:** desired behavior; shell-specific guardrail hooks and explicit unsupported-shell acknowledgments are not implemented yet.

---

## Completed foundations

### Phase 1: P2P core ✅

PTY streaming over a WebRTC DataChannel. SDP/ICE exchange, bidirectional input, resize sync. Verified across separate networks, including the symmetric-NAT case that needs TURN.

### Phase 2: Container sandbox ✅

Disposable Docker container behind a shared `Session` interface. Verified isolation (`whoami` returned `root` in the container, host files not visible).

### Phase 3: Reproducible Docker builds ✅ (CI coverage incomplete)

Digest-pinned base image, image-layer hashing and `myna.lock` verification helpers are present, with a GitHub Actions workflow for reproducibility. Current `main` does not wire lock verification back into `myna up --sandbox`, and CI does not run the full unit-test or type-check suite; track [#6](https://github.com/sadSanta-07/myna/issues/6) and [#13](https://github.com/sadSanta-07/myna/issues/13).

### Phase 4: Multi-peer and permissions ✅ (reliability follow-ups remain)

Host approval, `view` and `control` roles, multiple guest sessions, replay for late joiners, and JSON framing are present. The Worker restricts approval/revocation to the host. Regression tests for disconnects, hostile messages, and both signaling implementations remain.

### Phase 5: Browser client ✅ (native-mode parity remains)

Browser guest assets and protocol documentation exist, with role selection and a direct DataChannel design. Validate against the native-first flow, mobile data, and privacy/status behaviors before closing Phase 9.

### Current repository status (`main`, reviewed 2026-10-15)

This status is based on a static read of the current default-branch source and package/CI/docs, plus recent commit and issue history. It is not a fresh runtime or end-to-end test run. A feature being present in code does not mean it has passed cross-platform or adversarial testing.

- **Architecture pivot: implemented.** `myna up` starts a native `node-pty` shell by default; `myna up --sandbox` selects Docker. The deprecated `--local` alias is present. The `Session` contract includes `backend: "native" | "docker"`.
- **URL configuration: implemented.** `src/core/config.ts` centralizes the signaling URL and derives the share domain. The old Render-vs-Cloudflare mismatch is addressed, although the default still uses a project-specific `workers.dev` hostname and should be externalized before a public release.
- **CLI: implemented in source.** `up`, `join <code>`, and `serve` commands are registered. `package.json` exposes a `myna` bin target and a `files` allowlist; clean-machine publishing and platform-specific native dependency installation are not verified here.
- **Signaling: two implementations remain.** `cloudflare/worker.ts` backs the configured Worker/Durable Object deployment; `src/core/server.ts` remains for self-hosting. They do not have shared protocol-conformance tests, and current issues identify defects in the Node server.
- **Worker status: implementation inspected; end-to-end status not proven by this review.** The Worker exposes `/health`, uses the WebSocket Hibernation API, relays signaling, obtains ICE servers from Metered when configured, and falls back to optional static TURN credentials. Its current routing still sends all rooms to one global Durable Object. Deployment documentation still calls the Worker experimental.
- **Input safety: partial implementation.** Host code includes a Ctrl+A leader, approval/deny actions, freeze toggling, control-role checks, guest-input audit logging, and a destructive-command pattern check. This is not the full planned Input Gate or a shell-native command hook. Do not claim comprehensive command interception.
- **Audit log: partial implementation.** `src/core/audit.ts` writes timestamped guest input under the user state directory with restrictive directory/file creation modes. There is no `myna audit prune`, retention policy, guest-facing logging banner, or published command-bypass matrix yet.
- **Docker sandbox: partially hardened.** It supports `--mount ro|rw|none`, bridge/none networking, memory/CPU/PID limits, dropped capabilities, and `no-new-privileges`. It still uses the image's default user, does not restore lockfile verification in the CLI flow, and the build-context filter does not exclude `.env` or the separate `frontend/` tree.
- **Tests and CI: incomplete.** `npm test` runs only `tests/session.test.ts`; `tests/docker.test.ts` is a manual script. The current GitHub Actions workflow checks the Docker build/lock but does not run the unit-test command or TypeScript compilation. Open issues track this gap and additional correctness concerns.
- **Browser guest: exists.** `public/index.html`, `index.js`, and `index.css` are present. Native-mode/mobile, resize, freeze/status-banner, and security behavior need fresh validation before Phase 9 is complete.
- **Landing site and media: present.** `frontend/` is a separate Next.js app with video/image assets committed in Git. The root package allowlist excludes it from the CLI package, but repository-history weight has not been reduced or measured against a published budget.
- **Recent work evidenced by commits:** source reorganization into `src/core`, `src/cli`, and `src/bin`; a package CLI entry; Cloudflare Worker deployment scaffolding; URL centralization; leader-key/freeze additions; guest-input audit and guardrail additions; dynamic Metered TURN credential support.
- **Known open issues:** [#13 CI omits tests/type-checking](https://github.com/sadSanta-07/myna/issues/13), [#12 benchmark harness](https://github.com/sadSanta-07/myna/issues/12), [#11 output-history buffer costs](https://github.com/sadSanta-07/myna/issues/11), [#10 early ICE candidates in CLI join](https://github.com/sadSanta-07/myna/issues/10), [#9 unsafe Node signaling socket sends](https://github.com/sadSanta-07/myna/issues/9), [#8 invalid non-object JSON in Node signaling](https://github.com/sadSanta-07/myna/issues/8), [#7 incomplete session/container teardown](https://github.com/sadSanta-07/myna/issues/7), [#6 sandbox lockfile verification missing](https://github.com/sadSanta-07/myna/issues/6), [#3 overly broad Docker build context](https://github.com/sadSanta-07/myna/issues/3), and [#2 pending Node-server guests not notified when host leaves](https://github.com/sadSanta-07/myna/issues/2). Closed #1 and #4 are historical fixes, not proof that current revoke/type-check coverage is comprehensive.

---

## Current priorities from the October 15 review

Do these before broadening scope or announcing public readiness:

1. **Restore reliability gates first:** add CI that runs `npm run build`/`tsc --noEmit` and `npm test`, and add focused regression tests. See [#13](https://github.com/sadSanta-07/myna/issues/13).
2. **Fix signaling/handshake correctness:** buffer early ICE in `join.ts` and test SDP/ICE ordering ([#10](https://github.com/sadSanta-07/myna/issues/10)); make Node signaling safe around closed sockets and non-object JSON ([#9](https://github.com/sadSanta-07/myna/issues/9), [#8](https://github.com/sadSanta-07/myna/issues/8)); notify pending guests when the host disconnects ([#2](https://github.com/sadSanta-07/myna/issues/2)).
3. **Finish session lifecycle and privacy:** ensure CLI teardown calls `session.kill()` on all exit paths ([#7](https://github.com/sadSanta-07/myna/issues/7)); remove current-directory `.env` loading; define replay defaults and add a guest-visible audit notice.
4. **Restore sandbox reproducibility and reduce build exposure:** wire `myna.lock` verification into sandbox startup ([#6](https://github.com/sadSanta-07/myna/issues/6)); exclude local secrets and unrelated frontend assets from Docker build context ([#3](https://github.com/sadSanta-07/myna/issues/3)); consider a non-root container user.
5. **Prove end-to-end behavior before claiming readiness:** automate Worker and Node signaling flows, add signaling-abuse limits and short-lived TURN credentials, and run a cross-platform shell matrix.
6. **Measure before making performance claims:** add reproducible baselines for output throughput, latency, event-loop impact, and startup cost ([#12](https://github.com/sadSanta-07/myna/issues/12)); replace per-chunk history string re-slicing noted in [#11](https://github.com/sadSanta-07/myna/issues/11).

**Status rule:** checked boxes mean implementation is present, not necessarily security or production validation. A phase's **Done when** criteria must have evidence before that phase is complete.

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

**Status: PARTIALLY IMPLEMENTED — do not mark this phase complete.** Native mode is now the default and several 6.0/6.1/6.4 foundations exist. Lifecycle, consent, protocol, abuse-limit, cross-platform, and end-to-end acceptance checks remain.

**Goal:** `myna up` shares your actual shell, and it feels like using your terminal normally. No Docker needed.

### 6.0 Repo cleanup that unblocks everything (do first)

- [x] **One source of truth for URLs.** `src/core/config.ts` centralizes the signaling URL and derives the share-link domain for `up.ts` and `join.ts`. The default Worker hostname should still be externalized before release.
- [ ] **Prove the Worker end to end.** Add a scripted create-room/join/approve/SDP/ICE/DataChannel round trip against `wrangler dev` and later the deployed Worker, and run it in CI.
- [ ] **Two signaling servers.** Both `cloudflare/worker.ts` and `src/core/server.ts` remain. Keep both only with protocol-conformance tests from `docs/PROTOCOL.md` against each implementation.
- [x] **Use the ICE servers the Worker sends.** `up.ts` passes `msg.iceServers` into `createPeerConnection`; the CLI uses server-provided ICE configuration.
- [ ] **Remove `dotenv` from the CLI.** `src/core/peer.ts` still invokes `dotenv.config()`, which reads `.env` from the current working directory. Use explicit environment variables or a dedicated Myna config path instead.
- [ ] **Finish error handling.** `up.ts` wraps message parsing/handling in `try/catch` and has a signaling `close` handler, but `join.ts` still lacks early-ICE buffering and full negotiation/lifecycle handling. Add regression tests and ensure a failed guest does not end the host session.
- [ ] **Sort `tests/`.** Manual test scripts are still mixed with automated tests. Keep real `*.test.ts` suites discoverable and ensure `npm test` runs all appropriate automated tests.
- [ ] **CI.** Current CI only builds/verifies the Docker lock and does not run `npm test` or TypeScript compilation. Add those checks; see [#13](https://github.com/sadSanta-07/myna/issues/13).
- [ ] **Repo weight.** The npm `files` allowlist excludes `frontend/` from the CLI package, but large videos/images are still committed. Measure Git history size and consider external media hosting or Git LFS.
- [x] **Review deployment-facing docs/configuration.** `AGENTS.md`, `CLOUDFLARE_DEPLOY.md`, and `wrangler.toml` were inspected in this review. Recheck for account-specific details before release.

### 6.1 Backend selection

- [x] Today `myna up` defaults to Docker and `--local` selects the shell. Flip this: native by default, `--sandbox` for Docker, and keep `--local` as a hidden alias for one release so existing habits and scripts don't break.
- [x] `myna up` uses the native backend. `myna up --sandbox` uses Docker (options: `--image`, `--mount ro|rw|none`, and `--network bridge|none`).
- [ ] Keep origin out of the `Session` interface. Put the Input Gate (7.1) in front of `session.write` and tag input at the gate, since a backend shouldn't know who typed. Do add a `backend: "native" | "docker"` field so the UI can say which guardrails apply, and make `onData` return an unsubscribe function.
- [x] Keep the `Session` interface as the single seam between transport and backend.

### 6.2 Host terminal passthrough

- [ ] **Quiet by default.** `up.ts` still writes status/debug messages to stdout, which can interleave with the shared terminal. Add a `--verbose` mode and route status messages safely.
- [x] Put the host's terminal in raw mode, forward host keystrokes to the PTY, and mirror PTY output to the host's screen and to every guest.
- [ ] Restore the terminal on every exit path: normal exit, shell exit, Ctrl+C handling, uncaught exceptions and signals. A crash must never leave the host's terminal in raw mode.
- [ ] The shell's exit ends the session, and tells guests why.

### 6.3 Resize policy

- [x] `up.ts` ignores guest resize messages in native mode and only applies guest resize to Docker sessions.
- [x] PTY size follows the host's terminal. Ignore guest resize messages in native mode. In sandbox mode the existing behavior can stay.
- [ ] Tell guests the host's dimensions so they render correctly (the CLI guest and the browser both need this).
- [ ] Output goes to guests as raw strings while input comes back as JSON, so there is no way to send the host's size, a "frozen" notice or a "session is logged" banner. Add a second DataChannel (`control`) for those messages and leave the terminal channel untouched.

### 6.4 Leader key and host commands

- [ ] **Finish leader-key join prompts.** Ctrl+A then `c`/`v`/`n` is implemented, but cap the unbounded pending queue and verify ordinary host typing can never be swallowed or interpreted as approval.
- [ ] **Preserve Ctrl+C behavior.** Current process signal handling exits Myna; verify Ctrl+C is forwarded to the native shell when appropriate and that teardown completes before exit.
- [ ] One configurable leader key, then a letter: freeze or unfreeze, revoke all guests, list guests, help.
- [ ] Choose the default by testing it inside bash, zsh, PowerShell, vim, tmux and less.

### 6.5 Consent flow

- [ ] **Output replay is a privacy decision.** Current code still replays up to 100,000 characters to every newly connected guest. Add an explicit consent/default policy and `--no-replay`.
- [x] The approval prompt shows the requested role. The default answer is `view`.
- [ ] Granting `control` on the native backend requires typing a confirmation once per session, with plain text such as: "This person can run anything you can in this shell."
- [ ] Show every guest a banner saying the session is logged (Phase 7.3).

### 6.6 Join-code security and signaling abuse (required before native mode is used by anyone but you)

- [ ] The current room code is 8 hex characters (32 bits). Increase invitation entropy and add rate limiting before sharing native sessions beyond trusted users.
- [ ] **One Durable Object per room.** Current Worker routes all sockets to `idFromName("myna-global-signaling")`; isolate rooms in separate Durable Objects before claiming per-room scalability.
- [ ] Rate-limit join attempts per IP and per room. Cap pending requests (a handful), guests per room, and message size. Give rooms a TTL and a maximum age.
- Use a longer random token (about 40 bits or more, base-32 without look-alike characters) in the link, and keep the short code for display only.
- [x] The Worker already uses the Hibernation API (`ctx.acceptWebSocket`, `webSocketMessage`). Keep it.
- [ ] Close the guest's socket with a reason on `deny-peer` and `revoke-peer`, and wrap `host.send` in `webSocketClose` in a try/catch.
- [x] Add state guards. Today a socket can send `create-room` or `join-room` repeatedly, and an approved guest can send `create-room` and become a host mid-session. Ignore both once a socket already has a role and a code.

**Done when:** `myna up` works in PowerShell, bash and zsh. A guest joins from the CLI and from a link. Both the host and the guest can type. Resizing the host window works. Ctrl+C reaches the shell. A forced crash leaves the host's terminal usable. Brute-forcing codes is rate-limited, shown by a test.

---

## Phase 7: Guardrails ("seatbelt")

**Status: PARTIALLY IMPLEMENTED.** Leader-key freeze, guest-input logging, and a basic destructive-command pattern check exist. The centralized Input Gate, shell-native line hooks, bypass matrix, guest-visible logging notice, pruning/retention, and proof of drop-not-queue behavior are incomplete.

**Goal:** make accidents unlikely and misuse visible, with almost no interruption for the host.

### 7.1 The Input Gate

- [ ] One module that every guest input chunk passes through: role check, then freeze, then audit, then guardrail.
- [ ] Unit-test it against a fake backend. Rule 4 applies: dropped means discarded.

### 7.2 Freeze

- [x] Leader key plus `f` toggles freeze. The guest's input is discarded and the connection stays up.
- [ ] Show a status line to the host and a banner to the guest ("input paused by host").
- [ ] Add optional time-limited control that expires on its own.

### 7.3 Audit log

- [ ] Log guest input with timestamps and the guest identifier, plus the reconstructed command line when the guardrail hook provides it.
- [x] Store it in the user's state directory (for example `~/.local/state/myna/` or `%LOCALAPPDATA%\myna\`) with owner-only permissions. Don't write it into the project directory, where it can be committed by accident.
- The log is sensitive: it will contain anything the guest typed, including passwords. Support `myna audit prune`, set a retention default, and never log host output.
- Tell guests they are being logged (see 6.5).

### 7.4 Destructive-command guardrail

**A regex over the DataChannel stream will not work.** The channel carries raw keystrokes one at a time, with backspaces, arrow keys, tab completion and history recall. A guest can press Up and Enter to re-run an old `rm -rf`, and the dangerous text never crosses the wire. The check has to happen when Enter is pressed, using the shell's own line buffer.

- **Design spike first.** Prove that in PowerShell (your own shell) a hook can pause an Enter, read the line, ask the wrapper whether to allow it, and continue. Only after that works, extend it.
- [ ] Per-shell hooks: PowerShell via a PSReadLine key handler on Enter, zsh by wrapping the `accept-line` widget, bash via `bind -x` or the `DEBUG` trap, fish via its preexec event. `cmd.exe` has no hook and is unsupported.
- [ ] Unsupported shell or failed hook: say so and require explicit acknowledgment (rule 5).
- [ ] Only prompt for guest-originated lines. The host's own commands are never intercepted.
- [ ] Use a risk check, not bare patterns. `rm -rf node_modules` should pass. `rm -rf /`, `rm -rf ~`, `dd of=/dev/...`, `mkfs`, `git push --force`, `Remove-Item -Recurse -Force` on a home or root path, `format`, `shutdown`, and `DROP TABLE` should hold.
- [ ] The prompt appears on one reserved line of the host's terminal: allow or deny, defaulting to deny after a timeout so an absent host isn't blocking the session.
- [ ] Keep the pattern list in a configurable file.

### 7.5 Be honest in the docs

- [ ] State plainly what the guardrail does not catch: scripts, aliases, functions, `curl | sh`, anything typed inside vim or a REPL, and obfuscated commands. Publish the bypass test results next to the feature.

**Done when:** a test matrix of caught and uncaught commands exists and is published. Freeze stops a running guest instantly and unfreezing replays nothing. The audit log is complete, protected, and prunable.

---

## Phase 8: Sandbox backends (the second option)

**Status: Docker exists; phase incomplete.** Resource limits and some hardening are present, but lock verification, non-root execution, build-context filtering, security tests, and platform acceptance remain. Bubblewrap/macOS backends are not implemented.

- **8.1 Docker backend:** `--sandbox` with your own Dockerfile or a small default image, optional project mount (`ro` by default, `rw` only with an explicit flag and a warning), and the reproducibility check against `myna.lock`.
- **8.2 Hardening:** CPU, memory and pid limits, dropped capabilities, `no-new-privileges`, a non-root user, a deliberate network policy (default networking can reach the internet, and on Docker Desktop it can reach services on your machine through `host.docker.internal`), and never mount the Docker socket.
- **8.3 bubblewrap backend (Linux, experimental):** a read-only bind of the host's `/usr` plus a throwaway home directory and no access to `~/.ssh`, with no daemon. Some distributions restrict unprivileged user namespaces, so test on your target distributions.
- **8.4 macOS:** evaluate `sandbox-exec`. It is marked deprecated by Apple, so check that it still works on current macOS before committing.
- **8.5 Windows:** Docker or WSL is the sandbox. There is no cheap unprivileged equivalent, so document it.
- **Never write your own isolation.** A chroot alone is not a sandbox.

**Done when:** `myna up --sandbox` works, fork-bomb and path-escape tests pass, and the docs say exactly what each backend does and does not isolate.

---

## Phase 9: Browser guest for native mode

**Status: Browser client exists; native/mobile parity is unverified.**

Resume the paused UI work with the native model in mind.

- [ ] Render at the host's dimensions and allow scrolling when the guest's window is smaller.
- [ ] Show clear states: waiting for approval, view, control, frozen, logged, revoked, host left.
- [ ] Keep it light. Prefer the default renderer, and add the WebGL addon only if it is worth its size. Record the gzipped bundle size.
- [ ] Treat host output as untrusted in the browser. Keep clipboard-write escape sequences (OSC 52) disabled by default and only open plain `http(s)` links.

**Done when:** a guest joins from a phone on mobile data and the experience matches the CLI guest.

---

## Phase 10: Trust, privacy and abuse resistance

**Status: NOT COMPLETE.** The Worker still routes rooms through one global Durable Object and the handshake has no PAKE/comparison-code authentication. Abuse limits and the security/claims-review documentation remain incomplete.

- **Authenticated handshake:** use a PAKE (password-authenticated key exchange, as magic-wormhole does) or a short comparison code so that a malicious signaling server can't sit in the middle. Evaluate current JavaScript libraries before choosing one.
- [ ] **TURN credentials:** dynamic Metered API credential retrieval is present when configured, with a static-credential fallback. Remove the shared static fallback for production, validate credential lifetime, and monitor relay usage.
- **Signaling abuse:** per-IP limits, connection caps, and logs that don't retain more than needed.
- **Documents:** `SECURITY.md` with a reporting contact and `docs/THREAT_MODEL.md` rewritten for the native model. Its non-goals include "a control guest can do anything the host can" and "guardrails are accident prevention."
- **Claims review:** read every sentence in the README and website against what is verified.

---

## Phase 11: Portability and reliability

**Status: PARTIALLY IMPLEMENTED.** Terminal restoration handlers, signaling parsing guards in `up.ts`, host-side ICE buffering, and role checks exist. Join-side ICE buffering, backpressure, reconnect, cross-OS shell validation, reliable teardown, and broader CI coverage remain.

- **Shell and OS matrix:** Windows PowerShell and `cmd`, WSL, macOS zsh, Linux bash and fish, and inside tmux. Document which combinations support guardrails.
- **Windows PTY:** the project uses `useConpty: false` as a workaround for a ConPTY crash under Node 24. Re-test with current `node-pty` and Node, since the older backend is less maintained.
- **Backpressure:** watch `dc.bufferedAmount` and use `bufferedAmountLowThreshold` so a huge `cat` can't stall the host.
- **Reconnect:** recover from a network blip with an ICE restart.
- **Tests and CI:** unit tests for the gate and framing, an in-process integration test, and a smoke test on Linux. Windows runners generally can't run Linux containers, so test the Docker backend on Linux only.
- **Quiet output:** replace debug logging with `--verbose`.
- **Per-guest revoke and role changes**, tested with a mixed view and control pair.

---

## Phase 12: Package, weight and publish

**Status: PARTIALLY IMPLEMENTED.** TypeScript build configuration, the CLI `bin`, executable wrapper, package `files` allowlist, and self-hosted `serve` command exist. Clean-machine global-install tests, CI build verification, release/provenance workflow, license/metadata cleanup, package-size measurements, and native dependency support matrix remain.

- [x] **Build/package scaffolding:** TypeScript build config, `bin` target/shebang wrapper, and `files` whitelist exist.
- [ ] **Release build verification:** set `engines` accurately, verify `npm pack --dry-run` excludes secrets, and run package/build checks in CI.
- [ ] **Native dependencies:** `node-pty` and `@roamhq/wrtc` are native modules; test clean installs on Windows, macOS and Linux and improve actionable install errors.
- [ ] **Single-binary decision:** defer Node SEA/Bun/Go/Rust exploration until Round 0 or Phase 13 shows real demand, especially from low-end/headless users.
- [ ] **Publishing:** verify the package name, add proper license/metadata/changelog, and set up provenance/2FA release automation before publishing a release.
- [x] **Self-hosting:** `myna serve` and `npm run signal` expose the Node signaling server, and deployment docs describe the Cloudflare Worker. Keep both implementations covered by protocol tests.

### Weight budgets (measure, record in the repo, then claim)

- [ ] Record npm install/package size, dependency count, gzipped browser bundle size, signaling capacity/Durable Object usage, and host CPU/memory. No reproducible benchmark results were found in the repository.
- Measure host CPU/RSS in native mode and capture `docker stats` for sandbox mode.

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

1. Round 0 should run alongside the remaining Phase 6 hardening; no developer-validation evidence was located in the repository during this review.
2. **Gate A, native mode usable by others:** NOT PASSED. Require Phase 6 acceptance tests and abuse controls, tested freeze behavior, a documented audit policy, and reliable teardown.
3. **Gate B, any public announcement:** NOT PASSED. Require Phases 7, 8 and 10, a CI/test gate, and a security-claims review.
4. Phase 13 comes before Phase 14, so new features are pulled by users and not pushed by guesses.
5. A phase is done only when its Done criteria are demonstrated with evidence (tests, CI runs, recordings, measurements); code existence alone is insufficient.
