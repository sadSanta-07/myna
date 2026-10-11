import { WebSocketServer, WebSocket } from "ws";
import { randomBytes } from "crypto";
import express from "express";
import http from "http";
import path from "path";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

const app = express();
app.use(express.static(path.join(process.cwd(), "public")));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.get("/health", (req, res) => res.send("OK"));
interface Room {
    host: WebSocket;
    peers: Map<string, WebSocket>;
    pendingPeers: Map<string, WebSocket>;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<WebSocket, string>();
const socketToPeerId = new Map<WebSocket, string>();
const VALID_ROLES = ["view", "control"];

function generateId(): string {
    return randomBytes(4).toString("hex");
}

function getIceServers() {
    const iceServers: RTCIceServer[] = [
        { urls: "stun:stun.l.google.com:19302" }
    ];

    if (process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
        iceServers.push({
            urls: [
                "turn:global.relay.metered.ca:80",
                "turn:global.relay.metered.ca:443",
                "turn:global.relay.metered.ca:443?transport=tcp"
            ],
            username: process.env.TURN_USERNAME,
            credential: process.env.TURN_CREDENTIAL
        });
    }

    return iceServers;
}

wss.on("connection", (socket) => {
    console.log("[signaling] client connected");

    socket.on("message", (raw) => {
        let msg: any;
        try { msg = JSON.parse(raw.toString()); }
        catch { return; }

        if (msg.type === "create-room") {
            const code = generateId();
            rooms.set(code, { host: socket, peers: new Map(), pendingPeers: new Map() });
            socketToRoom.set(socket, code);
            socket.send(JSON.stringify({ type: "room-created", code }));
            console.log(`[signaling] room created ${code}`);
            return;
        }

        if (msg.type === "join-room") {
            const room = rooms.get(msg.code);
            if (!room) return socket.send(JSON.stringify({ type: "error", message: "room not found" }));

            const peerId = generateId();
            room.pendingPeers.set(peerId, socket);
            socketToRoom.set(socket, msg.code);
            socketToPeerId.set(socket, peerId);

            socket.send(JSON.stringify({ type: "join-pending", code: msg.code }));
            room.host.send(JSON.stringify({
                type: "join-request",
                code: msg.code,
                peerId,
                requestedRole: VALID_ROLES.includes(msg.requestedRole) ? msg.requestedRole : "view",
            }));
            console.log(`[signaling] join request for room: ${msg.code} from ${peerId}`);
            return;
        }

        const code = socketToRoom.get(socket);
        if (!code) return;
        const room = rooms.get(code);
        if (!room) return;
        const isHost = room.host === socket;

        // Access Control (Host Only)
        if (msg.type === "approve-peer" || msg.type === "deny-peer" || msg.type === "revoke-peer") {
            if (!isHost) return console.error("[security] non-host attempted access control");

            const targetId = msg.peerId;
            if (msg.type === "approve-peer") {
                const targetSocket = room.pendingPeers.get(targetId);
                if (!targetSocket) return;

                const role = VALID_ROLES.includes(msg.role) ? msg.role : "view";
                room.peers.set(targetId, targetSocket);
                room.pendingPeers.delete(targetId);

                const iceServers = getIceServers();
                targetSocket.send(JSON.stringify({ type: "joined", code, role, iceServers }));
                socket.send(JSON.stringify({ type: "peer-joined", code, peerId: targetId, role, iceServers }));
                console.log(`[signaling] peer ${targetId} approved`);
            } else if (msg.type === "deny-peer") {
                const targetSocket = room.pendingPeers.get(targetId);
                if (!targetSocket) return;

                targetSocket.send(JSON.stringify({ type: "join-denied", code }));
                socketToRoom.delete(targetSocket);
                socketToPeerId.delete(targetSocket);
                room.pendingPeers.delete(targetId);
            } else if (msg.type === "revoke-peer") {
                const targetSocket = room.peers.get(targetId);
                if (!targetSocket) return;

                targetSocket.send(JSON.stringify({ type: "revoked" }));
                socketToRoom.delete(targetSocket);
                socketToPeerId.delete(targetSocket);
                room.peers.delete(targetId);
            }
            return;
        }

        // WebRTC Signaling Relay
        if (["sdp-offer", "sdp-answer", "ice-candidate"].includes(msg.type)) {
            if (isHost) {
                const targetSocket = room.peers.get(msg.peerId);
                if (targetSocket) targetSocket.send(JSON.stringify(msg));
            } else {
                const peerId = socketToPeerId.get(socket);
                if (peerId && room.peers.has(peerId)) {
                    msg.peerId = peerId;
                    room.host.send(JSON.stringify(msg));
                }
            }
        }
    });

    socket.on("close", () => {
        const code = socketToRoom.get(socket);
        const peerId = socketToPeerId.get(socket);
        socketToRoom.delete(socket);
        socketToPeerId.delete(socket);
        if (!code) return;

        const room = rooms.get(code);
        if (!room) return;

        if (room.host === socket) {
            room.peers.forEach(p => p.send(JSON.stringify({ type: "host-left", code })));
            rooms.delete(code);
            console.log(`[signaling] room ${code} closed (host left)`);
        } else if (peerId) {
            if (room.peers.has(peerId)) {
                room.peers.delete(peerId);
                room.host.send(JSON.stringify({ type: "peer-left", code, peerId }));
            } else if (room.pendingPeers.has(peerId)) {
                room.pendingPeers.delete(peerId);
                room.host.send(JSON.stringify({ type: "join-request-cancelled", code, peerId }));
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`[signaling] listening on http://localhost:${PORT}`);
});