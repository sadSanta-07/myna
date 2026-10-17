# Performance & Weight Budgets

MYNA is engineered to be a strictly zero-bloat, high-performance CLI tool. Because terminal data travels directly peer-to-peer via WebRTC DataChannels, there is no centralized server bottlenecking keystrokes or hoarding host memory.

Below are the verified weight budgets and resource benchmarks for MYNA v1.1.0 (Optimized Core).

---

## 1. Package & Distribution Weight

We actively audit our dependency tree to ensure the CLI remains light and fast across all operating systems.

* **NPM Package Size:** ~24 kB (unpacked core logic).
* **Install Footprint:** Minimal. The primary native dependency is `node-pty` (C++ binary bindings required for OS-native PTY shell spawning).
* **Guest Web Bundle:** < 300 kB (gzipped). The client bundles xterm.js and WebRTC handshake logic without heavy web frameworks.

---

## 2. Host CPU & Memory Benchmarks

### Native Mode (Default)

Optimized with hard V8 heap restrictions (`--max-old-space-size=64`).

* **Idle RAM:** ~18 MB – 25 MB
* **Active CPU (Idle):** 0.0%
* **Active CPU (High Output/Streaming):** < 0.5% (Direct stream buffering without redundant string allocations)
* **Replay Buffer:** Capped at 20,000 characters (~20 KB RAM)

### Docker Sandbox Mode (`--sandbox`)

Enforces hard resource limits on the container host config to prevent runaway guest commands from locking up low-spec hardware (e.g., 2 GB RAM dual-core environments).

* **Container Memory Cap:** 256 MB RAM max
* **Container CPU Cap:** 0.5 CPU cores max (50% single-core ceiling)
* **Host CLI Overhead:** ~20 MB RAM

### Bubblewrap Sandbox (`--sandbox bwrap` on Linux)

* **RAM Overhead:** Near 0 MB beyond the base CLI process (uses native Linux kernel namespaces).

---

## 3. Signaling Server (Cloudflare Worker)

The signaling server handles only the initial WebRTC handshake and drops the connection once the peer-to-peer data channel opens.

* **Isolate Memory:** < 10 MB per worker
* **Durable Object State:** < 1 MB per active room
* **Network Payload:** ~2–5 kB JSON per room handshake

---

## 4. Latency Characteristics (Peer-to-Peer)

* **Direct WebRTC P2P:** 15 ms – 50 ms ping (bounded strictly by local physical network routing).
* **TURN Relay Fallback:** 50 ms – 120 ms ping (used only if strict NAT/firewalls block direct UDP hole punching; traffic remains end-to-end encrypted).
