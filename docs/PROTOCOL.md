# MYNA Protocol Specification (v1)

This document defines the JSON message structures used for both WebRTC signaling (via the WebSocket server) and the peer-to-peer terminal stream (via the RTCDataChannel).

## 1. Signaling Messages (WebSocket)

All signaling messages must be valid JSON objects containing a `type` string.

### Client -> Server
- `{"type": "create-room"}` (Host only: Requests a new room code)
- `{"type": "join-room", "code": "<string>", "requestedRole": "view" | "control"}` (Peer: Requests to join an existing room)
- `{"type": "approve-peer", "peerId": "<string>", "role": "view" | "control"}` (Host only: Approves a pending join request)
- `{"type": "deny-peer", "peerId": "<string>"}` (Host only: Rejects a pending join request)
- `{"type": "revoke-peer", "peerId": "<string>"}` (Host only: Kicks an active peer mid-session)

### Server -> Client
- `{"type": "room-created", "code": "<string>"}` (Sent to Host)
- `{"type": "join-pending", "code": "<string>"}` (Sent to Peer)
- `{"type": "join-request", "code": "<string>", "peerId": "<string>", "requestedRole": "<string>"}` (Sent to Host)
- `{"type": "join-denied", "code": "<string>"}` (Sent to Peer)
- `{"type": "joined", "code": "<string>", "role": "<string>", "iceServers": [...]}` (Sent to Peer: Indicates approval and provides TURN credentials)
- `{"type": "peer-joined", "code": "<string>", "peerId": "<string>", "role": "<string>"}` (Sent to Host)
- `{"type": "revoked"}` (Sent to Peer: Access revoked by host)
- `{"type": "host-left", "code": "<string>"}` (Sent to all Peers: Host disconnected)
- `{"type": "peer-left", "code": "<string>", "peerId": "<string>"}` (Sent to Host)

### WebRTC Negotiation (Relayed by Server)
- `{"type": "sdp-offer", "peerId": "<string>", "sdp": <RTCSessionDescription>}`
- `{"type": "sdp-answer", "peerId": "<string>", "sdp": <RTCSessionDescription>}`
- `{"type": "ice-candidate", "peerId": "<string>", "candidate": <RTCIceCandidate>}`
*(Note: `peerId` is injected by the server for Peer->Host messages to ensure trust boundaries).*

## 2. Terminal Stream (RTCDataChannel)

Once the DataChannel opens, the Host and Peer communicate directly.

### Host -> Peer (Raw Output)
The host sends raw terminal `stdout` and `stderr` as plain strings. The peer pipes this directly to `xterm.js` or `process.stdout`.

### Peer -> Host (Framed Input)
To prevent terminal string-matching collisions, all messages sent from the Peer to the Host must be strictly framed JSON:
- `{"type": "input", "data": "<string>"}` (Raw keystrokes/commands)
- `{"type": "resize", "cols": <number>, "rows": <number>}` (Terminal dimensions)
*(Note: The host drops these messages silently if the peer's role is "view").*