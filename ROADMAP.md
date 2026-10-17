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

### Current implementation status (history reviewed through 2026-10-16)

The old repository snapshot and code-review notes below were written before the native-first pivot and are no longer an accurate description of `main`. The following reflects the later implementation work recorded in the supplied chat history.

- **CLI and backends:** `myna up` is native-first. Docker is selected with `--sandbox`; the Linux bubblewrap backend is available as an experimental option. The old `--local`/Docker-default description is stale.
- **Native terminal UX:** host terminal passthrough, terminal restoration, resize policy, `Ctrl+]` leader-key actions, deliberate join approval, freeze/unfreeze, guest revocation, and no-replay support have been implemented.
- **Guardrails and audit:** guest input is checked before reaching the shell; a PowerShell hook and Unix shell hook exist; local audit logging and `myna audit --prune` are implemented. The guardrail remains an accident-prevention layer, not a security boundary.
- **Browser guest:** host-sized terminal rendering, scrolling, session-state banners, and disabled-by-default OSC 52 clipboard writes are implemented.
- **Signaling:** the Worker uses per-room Durable Objects, state guards, signed room codes, request rate limiting, and socket closure on deny/revoke. Dynamic TURN credentials are fetched through Metered when configured, with STUN fallback.
- **Security test suite:** `tests/security/` scripts and `docs/SECURITY_TESTS.md` were created. The supplied chat history reports the security checks passing, but this roadmap update has not rerun them; keep a fresh run log/CI artifact as release evidence.
- **Known remaining security work:** no PAKE/comparison-code authenticated handshake yet; `SECURITY.md` and `docs/THREAT_MODEL.md` still need to be confirmed/updated for the native model. Verify that secrets fail closed when configuration is missing, and that rate limiting and TURN expiry behave as intended in the deployed environment.

## Round 0: developer validation (still outstanding)

Nobody knows yet whether people want this. Find out cheaply.

- Give the current build to 3 to 5 developers you trust. Ask each to share a real terminal with someone.
- Watch without helping. Note where they hesitate.
- Ask:
  1. Would you give a teammate control of your real shell? What would make you comfortable?
  2. When a teammate last helped you debug, could they have rebuilt the problem from the repo? If so, what would they have wanted instead?
  3. Would you use this again this month? For what?
- Trusted friends only. The build is not hardened.
- Before testers, spend an hour with termishare, shwim and tmate. For each, note what a guest needs installed, how the host approves, and what protects the host. Ask testers which they'd pick and why.

The answers should decide how much of Phase 14 and the Phase 12 single-binary question is worth building.

---

## Phase 6: Native-first core ✅

**Status: implemented.** `myna up` shares the host's actual shell by default; Docker is optional through `--sandbox`. The native terminal passthrough, leader-key controls, approval flow, resize behavior, shell-exit cleanup, no-replay option, shared configuration, and signaling state guards were implemented during the pivot.

Key behavior now in place:

- Native backend by default; Docker sandbox is opt-in.
- Host keyboard input is separate from guest input, and the host's terminal size drives native mode.
- `Ctrl+]` is the leader key for approval and session controls, avoiding ordinary shell-key collisions.
- Guest roles and approval are enforced; denied/revoked peers are disconnected.
- Room codes are signed and signaling abuse controls are in place.

**Follow-up validation:** re-run the full end-to-end flow on a clean install and across supported shells. Do not treat source presence alone as proof of a release gate.

---

## Phase 7: Guardrails (“seatbelt”) ✅

**Status: implementation recorded as complete; security limitations remain explicit.**

- **7.1 Input gate:** guest input passes through role/freeze and guardrail checks before it reaches the session. Host typing is not intended to be filtered.
- **7.2 Freeze:** leader-key freeze/unfreeze drops guest input rather than queueing it.
- **7.3 Audit log:** guest input is logged locally outside the project directory; `myna audit --prune` supports retention cleanup. The log is sensitive and must remain owner-only.
- **7.4 Destructive-command guardrail:** shell-hook/IPC plumbing and a host Allow/Deny prompt have been implemented. Keep shell coverage in the regression matrix; a command filter is not a security boundary.
- **7.5 Limitations:** `docs/SECURITY_TESTS.md` records verification cases and guardrail limitations. Keep it aligned with actual test results, including bypasses through scripts, aliases, REPLs, and obfuscated commands.

**P0 release blocker:** the reviewed shell-hook path has fail-open cases when the IPC/helper is missing, unavailable, or returns no usable response. Fix those paths so a safety check cannot silently allow a risky command, and add regression tests for every failure mode before calling Gate A ready.

**Do not claim:** that the guardrail makes a real host shell safe for a hostile guest. Use the sandbox or do not grant control when the guest is untrusted.

---

## Phase 8: Sandbox backends ✅

**Status: backend work implemented.** Docker sandbox mode and the experimental Linux bubblewrap backend have been added alongside the native backend. Keep this phase marked complete for implementation, while treating platform-specific isolation testing as a release-validation task.

- **Docker:** `myna up --sandbox` selects Docker; mount modes and container resource/security options are part of the sandbox path.
- **bubblewrap:** experimental Linux backend; behavior depends on distribution support for unprivileged user namespaces.
- **Platform boundaries:** Windows relies on Docker/WSL for isolation; macOS isolation must be described conservatively.
- Never mount the Docker socket into an untrusted session, and never describe a chroot alone as a sandbox.

**Validation still required before public use:** run fork-bomb/resource-limit and path-escape tests against the actual backends and record the results for each supported OS. “Implemented” is not the same as independently proven isolation.

---

## Phase 9: Browser guest for native mode ✅

**Status: implemented.**

- Browser terminal rendering follows the host's dimensions and supports scrolling for smaller guest windows.
- The UI shows session states such as waiting for approval, view/control, frozen, revoked, and host left.
- OSC 52 clipboard-write remains disabled by default; terminal output must be treated as untrusted content.

**Validation still required:** verify the full browser flow from a phone on mobile data and check the browser UI against the CLI guest on the deployed Worker.

---

## Phase 10: Trust, privacy and abuse resistance — in progress

**Completed implementation:**

- [x] Per-room Durable Objects and signaling state guards.
- [x] Signed room codes to reject forged codes before room work is performed.
- [x] Per-IP request rate limiting in the Worker.
- [x] Deny/revoke socket closure and guards against role/state reuse.
- [x] Dynamic TURN credential retrieval through Metered when configured, with STUN fallback.
- [x] Security attack scripts and a documented verification checklist in `tests/security/` and `docs/SECURITY_TESTS.md`.

**Still required for the trust milestone:**

- [ ] **Authenticated peer handshake:** choose and implement a reviewed PAKE or short comparison-code protocol so a malicious/compromised signaling server cannot silently mediate the peer handshake. Evaluate current JavaScript libraries before choosing one; document key derivation, transcript binding, replay handling, and failure behavior.
- [ ] **Secrets fail closed:** remove weak hard-coded fallback secrets from production paths. Startup/deploy must fail clearly when required signing secrets are absent; provide a deliberate local-development path rather than a production fallback.
- [ ] **Rate-limit durability and abuse behavior:** document the current per-isolate/in-memory limiter's scope and decide whether a Durable Object or other shared limiter is required for production. Test limits across isolates and verify pending-join/guest/message caps.
- [ ] **TURN lifecycle:** prove credentials actually expire as expected with the configured Metered plan, ensure missing/failed credentials degrade safely, and add usage/abuse monitoring or documented operational checks.
- [ ] **Security documentation:** add `SECURITY.md` with a reporting contact and update `docs/THREAT_MODEL.md` for native-first sharing. State that a control guest can do anything the host can, guardrails are not a security boundary, signaling sees room metadata/IP candidates, and sandbox guarantees vary by backend.
- [ ] **Evidence:** run the security suite against `wrangler dev` and the deployed Worker; save the output/CI artifact. History reports the checks passing, but do not treat that report as a substitute for a reproducible current run.
- [ ] **Claims review:** review every README and website security/privacy claim against verified behavior.

**Done when:** the authenticated handshake is implemented and tested, the secrets/rate-limit/TURN configuration has explicit safe failure modes, the threat model matches the code, and the security test evidence is reproducible.

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
- **Launch:** after the remaining Phase 10 work and Phase 13 validation. Write up the engineering story (the ICE failure that needed TURN, the Docker image ID that changed on every build, and why a regex over keystrokes can't be a guardrail), then post a Show HN and to r/commandline.
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

1. Round 0 developer validation can start now; it does not require adding more features first.
2. **Gate A, native mode usable by others:** Phase 6–9 features are present, but Gate A is not release-ready until the guardrail/IPC fail-open paths are fixed, a fresh security suite passes, and fail-closed behavior is explicitly tested.
3. **Gate B, any public announcement:** complete the remaining Phase 10 work, finish the Phase 11 release-critical reliability checks, and review documentation/claims.
4. Phase 13 validation comes before Phase 14, so new features are pulled by users rather than pushed by guesses.
5. A phase is done when its acceptance criteria have evidence (logs, CI runs, recordings), not merely because the code seemed to work.