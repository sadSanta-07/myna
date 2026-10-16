# MYNA

MYNA shares your real terminal with a teammate through a link. Your teammate opens it in a browser, or joins with the CLI. Terminal data travels peer to peer over WebRTC, and you approve every guest. For guests you don't fully trust, run the session in a sandbox instead.

> **Status: pre-release.** The core is built and has been used successfully. A verification pass against attack scenarios is still under way (see [`ROADMAP.md`](./ROADMAP.md)). Don't share a native shell with anyone you wouldn't give your keyboard to.

## How it works

- `myna up` starts a shell and prints a room code and a share link.
- A guest opens the link (or runs `myna join <code>`) and asks to join as `view` or `control`.
- You approve or deny each request and choose the role. The role is enforced on your machine.
- Terminal output and input travel over a WebRTC DataChannel, encrypted between the two peers. A small signaling server (a Cloudflare Worker with one Durable Object per room) only brokers the handshake. If a direct path isn't possible, traffic goes through a TURN relay, still encrypted between the peers.

## Choose how much to trust the guest

| Mode | Command | Use it for | What protects you |
| --- | --- | --- | --- |
| Native shell (default) | `myna up` | teammates you trust | Host approval, `view` by default, freeze key, guardrails, audit log |
| Docker sandbox | `myna up --sandbox` | strangers, teaching | Container isolation with dropped capabilities, `no-new-privileges`, and process and memory limits |
| bubblewrap sandbox (Linux) | `myna up --sandbox bwrap` | strangers, no Docker daemon | Namespace isolation, no network, hidden home directory |

In native mode a `control` guest can do anything you can do in that shell.

## Quick start

MYNA isn't published to npm yet. Run it from source:

```
git clone https://github.com/sadSanta-07/myna
cd myna
npm install
npm run build
npm link
```

**Host:**
```
myna up
```
Share the link it prints.

**Guest:** open `https://<signaling-host>/#<room-code>` in a browser, or run:
```
myna join <room-code>
```

### Requirements

- Node.js 22.12 or newer.
- Docker, only for `--sandbox`.
- Linux with `bubblewrap`, only for `--sandbox bwrap`.
- Guardrails need PowerShell, bash or zsh. The bash and zsh hooks currently need `python3` and `curl`.

### Useful options

```
myna up --sandbox                 # Docker sandbox
myna up --sandbox bwrap           # bubblewrap sandbox (Linux)
myna up --sandbox -m rw           # mount your project read-write (default is read-only)
myna up --no-replay               # don't send earlier terminal output to new guests
```
Run `myna up --help` for the full list.

## Host controls

Your keyboard goes into the shell, so host commands use a leader key, **Ctrl+A**, followed by a letter:

| Keys | Action |
| --- | --- |
| Ctrl+A, then C | Approve the pending guest with `control` |
| Ctrl+A, then V | Approve the pending guest with `view` |
| Ctrl+A, then N | Deny the pending guest |
| Ctrl+A, then F | Freeze or unfreeze guest input |
| Ctrl+A, then X | Revoke all guests |
| Ctrl+A, then Y / N | Allow or block a guardrail prompt |

Ctrl+A is also your shell's "beginning of line" key. A configurable leader is planned. Ctrl+C goes to your shell as usual.

## Safety features, and their limits

- **Host approval and roles.** Every guest waits for your approval. `view` guests cannot send input. The signaling server accepts approvals only from the host's connection.
- **Freeze.** Instantly stops guest input without disconnecting. Input is dropped, never queued.
- **Guardrails.** In PowerShell, bash and zsh, MYNA asks you before running a guest's destructive command (such as `rm -rf`, `Remove-Item -Recurse -Force`, `format`, `drop table`). **This is accident prevention, not a security boundary.** A determined guest can bypass it (a script, a different command, a subshell started without the hook). If you don't trust the guest, use a sandbox or grant `view`.
- **Audit log.** Guest input is logged on your machine, and guests are told. The log contains anything they typed, including passwords, so treat it as sensitive.
- **Output replay.** New guests receive recent terminal output (up to 100,000 characters) unless you start with `--no-replay`. In native mode that can include anything your terminal showed since `myna up`.
- **Resize.** In native mode the terminal size follows your window. Guests render at your size.

## Reproducible sandbox environments

In Docker sandbox mode, MYNA builds your project's `Dockerfile` (or uses a default image) and checks the image's filesystem layers against a committed `myna.lock`. CI fails if a build drifts from the lock.

## Known limitations

- Not published to npm. Run from source.
- The `Ctrl+A` leader collides with a common shell key.
- macOS hosts can use native mode and the Docker sandbox. There is no macOS-native sandbox.
- bubblewrap is Linux only. On Windows, the sandbox is Docker.
- The signaling server is a hosted default. Self-hosting instructions are in `CLOUDFLARE_DEPLOY.md`, and you can point MYNA at your own with the `SIGNAL_URL` environment variable.
- "Private" here means terminal data is encrypted between peers. The signaling server still sees room codes and network addresses, and a compromised signaling server could in principle interfere with the handshake. Stronger handshake authentication is planned.

## What's next

See [`ROADMAP.md`](./ROADMAP.md): a verification pass against attack scenarios, testing with real developers, an npm release, and only then new features.

Protocol details are in [`docs/PROTOCOL.md`](./docs/PROTOCOL.md).
