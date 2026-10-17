# MYNA

MYNA shares your real terminal with a teammate through a link. Your teammate opens it in a browser, or joins with the CLI. Terminal data travels peer-to-peer over WebRTC, and you explicitly approve every guest. For guests you don't fully trust, run the session in an isolated sandbox instead.

> **Status: v1.1.0 Stable.** The core protocol is secured, rate-limited, and verified against abuse scenarios. See [`SECURITY.md`](./SECURITY.md) and [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) for our security posture. Never share a native shell with anyone you wouldn't hand your physical keyboard to.

## How it works

- `myna up` starts a shell and prints a room code and a share link.
- A guest opens the link (or runs `myna join <code>`) and asks to join as `view` or `control`.
- You approve or deny each request and choose the role. The role is strictly enforced on your machine.
- Terminal output and input travel over a WebRTC DataChannel, encrypted peer-to-peer. A lightweight signaling server (a Cloudflare Worker using Fail-Closed secrets and Durable Objects) strictly brokers the handshake and drops lingering connections. If a direct P2P path fails, traffic routes through a secure TURN relay.

## Choose how much to trust the guest

| Mode | Command | Use it for | What protects you |
| --- | --- | --- | --- |
| Native shell (default) | `myna up` | Teammates you trust | Host approval, `view` by default, freeze key, guardrails, audit log |
| Docker sandbox | `myna up --sandbox` | Strangers, teaching | Container isolation, dropped capabilities, `no-new-privileges`, memory limits |
| bubblewrap (Linux) | `myna up --sandbox bwrap` | Strangers, no Docker | Namespace isolation, no network, hidden home directory |

*Note: In native mode, a `control` guest can do anything you can do in that shell.*

## Quick start

MYNA is globally available on the NPM registry.

**Install:**

```bash
npm install -g myna-cli
```

**Host a session:**

```bash
myna up
```

*Share the link or room code it prints.*

**Join a session:**

Open the printed URL in a browser, or run:

```bash
myna join <room-code>
```

### Requirements

- Node.js 22.12 or newer.
- Docker (only required for `--sandbox`).
- Linux with `bubblewrap` (only required for `--sandbox bwrap`).
- Guardrails require PowerShell, bash, or zsh. The bash/zsh hooks currently need `python3` and `curl`.

### Useful options

```bash
myna up --sandbox                 # Run inside a Docker sandbox
myna up --sandbox bwrap           # Run inside a bubblewrap sandbox (Linux)
myna up --sandbox -m rw           # Mount your project read-write (default is read-only)
myna up --no-replay               # Don't send earlier terminal output to new guests
myna up --verbose                 # Enable verbose debug and connection logs
```

Run `myna up --help` or `myna join --help` for the full list of options.

## Host controls

Because your keyboard input flows directly into the shared shell, MYNA commands use a leader key: **`Ctrl+]`**, followed by a letter:

| Keys | Action |
| --- | --- |
| `Ctrl+]`, then `C` | Approve the pending guest with **Control** access |
| `Ctrl+]`, then `V` | Approve the pending guest with **View-only** access |
| `Ctrl+]`, then `D` | **Deny** the pending guest |
| `Ctrl+]`, then `F` | **Freeze** or unfreeze guest input |
| `Ctrl+]`, then `X` | **Revoke** all active guests and sever their connections |
| `Ctrl+]`, then `Y` / `N` | **Allow** or **Block** a triggered guardrail prompt |

*(Standard `Ctrl+C` goes directly to your shell as usual.)*

## Safety & Reliability Features

- **Host Approval & Strict Roles:** Every guest waits for your explicit approval. Pending guests cannot bypass the host, and `view` guests cannot send input.
- **Abuse Prevention:** The backend signaling server utilizes aggressive IP rate-limiting to prevent brute-force connection attacks and uses strict role-state guards.
- **Auto-Recovery:** WebRTC connections automatically trigger ICE restarts to seamlessly recover from temporary Wi-Fi drops or network interface changes.
- **Freeze:** Instantly stops guest input without disconnecting them. Input is immediately dropped, never queued.
- **Guardrails:** In PowerShell, bash, and zsh, MYNA warns you before executing a guest's destructive command (e.g., `rm -rf`, `format`, `drop table`). **This is accident prevention, not a hard security boundary.**
- **Audit Log:** Guest input is persistently logged on your machine, and guests are notified upon joining.
- **Output Replay:** New guests receive recent terminal output upon joining so they have context, unless you pass `--no-replay`.
- **Resize Sync:** In native mode, the terminal size follows the host's window. Guests render cleanly at your exact dimensions.

## Reproducible sandbox environments

In Docker sandbox mode, MYNA dynamically builds your project's `Dockerfile` (or uses a secure default) and checks the image's filesystem layers against a committed `myna.lock`. CI will fail if a build drifts from the lock, ensuring environments are perfectly reproducible.

## Performance & Resource Usage

MYNA is optimized for minimal resource impact, making it fully operational on low-spec hardware (such as 2 GB RAM dual-core environments or cloud VMs):

- **CLI Memory:** ~18 MB – 25 MB idle RAM (hard-capped via Node V8 heap flags).
- **CPU Overhead:** < 0.5% during active terminal streaming.
- **Docker Sandbox Constraints:** Hard limits set at 256 MB RAM and 0.5 CPU cores per container to protect the host system.
- **Benchmarks & Metrics:** See [`PERFORMANCE.md`](./PERFORMANCE.md) for full weight budgets, latency specs, and Worker footprints.

## Known limitations

- macOS hosts can use native mode and the Docker sandbox. There is no macOS-native sandbox.
- `bubblewrap` is Linux only. On Windows, the sandbox relies on Docker.
- Windows ConPTY is disabled by default due to an upstream API bug in Node 24 (`AttachConsole failed`). Fallback terminal emulation is used.
- The default signaling server is hosted on Cloudflare. Self-hosting instructions are in `CLOUDFLARE_DEPLOY.md`, and you can point your local CLI to your own backend using the `SIGNAL_URL` environment variable.

## Development

If you want to build and run MYNA from source:

```bash
git clone https://github.com/sadSanta-07/myna
cd myna
npm install
npm run build
npm test
npm link
```

Protocol details are available in [`docs/PROTOCOL.md`](./docs/PROTOCOL.md).
