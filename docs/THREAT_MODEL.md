# MYNA Threat Model

This document outlines the security boundaries, assumptions, and accepted risks of the MYNA CLI.

## 1. Peer-to-Peer Connection (WebRTC)

**In Scope:** The terminal data stream (keystrokes, stdout, stderr) is encrypted end-to-end (E2EE) via WebRTC's native DTLS. Neither the signaling server nor the TURN relays can read the terminal content.
**Accepted Risk:** The signaling server (Cloudflare Worker) brokers the initial connection. Because the handshake is currently unauthenticated to prioritize user experience, a compromised signaling server could theoretically intercept routing data or attempt a Man-in-the-Middle (MitM) attack. We accept this risk because the official signaling infrastructure is self-hosted and strictly access-controlled.

## 2. Native Mode (Host Shell)

**In Scope:** Native mode executes commands directly on the host machine.
**Accepted Risk:** Guardrails (e.g., the 30-second block prompt) are designed for **accident prevention**, not as a hardened security boundary. A malicious guest with `control` access can bypass shell hooks by dropping into sub-shells (e.g., `bash --norc`, `pwsh -NoProfile`). **Do not give `control` access to untrusted users in Native Mode.**

## 3. Sandbox Mode (Docker)

**In Scope:** When running `myna up --sandbox`, the guest is isolated within a locked-down container.
**Guarantees:**

- The container runs as a non-root user (`UID 1000`).
- All Linux capabilities (`CapDrop: ALL`) are dropped.
- Resource limits are strictly enforced (e.g., capped PIDs to prevent fork bombs, capped RAM).
- Host directories are entirely inaccessible.

## 4. IP Privacy & TURN Relays

**In Scope:** WebRTC requires exchanging IP addresses (ICE candidates).
**Accepted Risk:** Connecting peers will be able to see each other's public IP addresses. If direct P2P fails, traffic is routed through encrypted Metered TURN relays. These credentials expire dynamically to prevent abuse.
