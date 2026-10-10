import { WebSocketServer, WebSocket } from "ws";
import { randomBytes } from "crypto";

const PORT = 8080;

const wss = new WebSocketServer({ port: PORT });

interface Room {
    host: WebSocket;
    peer: WebSocket | null;
    pendingPeer: WebSocket | null;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<WebSocket, string>();
const VALID_ROLES = ["view", "control"];

function generateRoomCode(): string {
    return randomBytes(4).toString("hex");
}

wss.on("connection", (socket) => {
    console.log("[signaling] client connected");

    socket.on("message", (raw) => {
        let msg: any;
        try {
            msg = JSON.parse(raw.toString());
        } catch {
            console.log("[signaling] ignoring non-JSON message");
            return;
        }

        if (msg.type === "create-room") {
            const code = generateRoomCode();
            rooms.set(code, { host: socket, peer: null, pendingPeer: null });
            socketToRoom.set(socket, code);
            socket.send(JSON.stringify({ type: "room-created", code }));
            console.log(`[signaling] room created ${code}`);
            return;
        }

        if (msg.type === "join-room") {
            const room = rooms.get(msg.code);

            if (!room) {
                socket.send(JSON.stringify({ type: "error", message: "room not found" }));
                return;
            }
            if (room.peer) {
                socket.send(JSON.stringify({ type: "error", message: "room already full" }));
                return;
            }
            if (room.pendingPeer) {
                socket.send(JSON.stringify({ type: "error", message: "a join request is already pending" }));
                return;
            }

            room.pendingPeer = socket;
            socketToRoom.set(socket, msg.code);
            socket.send(JSON.stringify({ type: "join-pending", code: msg.code }));
            room.host.send(JSON.stringify({
                type: "join-request",
                code: msg.code,
                requestedRole: VALID_ROLES.includes(msg.requestedRole) ? msg.requestedRole : "view",
            }));
            console.log(`[signaling] join request for room: ${msg.code}`);
            return;
        }

        if (msg.type === "approve-peer" || msg.type === "deny-peer") {
            const code = socketToRoom.get(socket);
            if (!code) return;
            const room = rooms.get(code);
            if (!room) return;

            if (room.host !== socket) {
                console.error("[security] non-host attempted access control");
                return;
            }

            if (!room.pendingPeer) {
                socket.send(JSON.stringify({ type: "error", message: `no pending peer to ${msg.type === "approve-peer" ? "approve" : "deny"}` }));
                return;
            }

            if (msg.type === "approve-peer") {
                const role = VALID_ROLES.includes(msg.role) ? msg.role : "view";
                room.peer = room.pendingPeer;
                room.pendingPeer = null;
                room.peer.send(JSON.stringify({ type: "joined", code, role }));
                socket.send(JSON.stringify({ type: "peer-joined", code }));
                console.log(`[signaling] peer approved for room: ${code}`);
            } else { // deny-peer
                room.pendingPeer.send(JSON.stringify({ type: "join-denied", code }));
                socketToRoom.delete(room.pendingPeer);
                room.pendingPeer = null;
                console.log(`[signaling] peer denied for room: ${code}`);
            }
            if (msg.type === "revoke-peer") {
            const code = socketToRoom.get(socket);
            if (!code) return;
            const room = rooms.get(code);
            
            if (!room || room.host !== socket || !room.peer) return;

            room.peer.send(JSON.stringify({ type: "revoked" }));
            socketToRoom.delete(room.peer);
            room.peer = null;
            console.log(`[signaling] host revoked peer for room: ${code}`);
            return;
        }
            return;
        }

        // sdp-offer, sdp-answer, ice-candidate etc... gets relayed
        const code = socketToRoom.get(socket);
        if (!code) {
            socket.send(JSON.stringify({ type: "error", message: "not in a room" }));
            return;
        }

        const room = rooms.get(code);
        if (!room) return;

        if (socket !== room.host && socket !== room.peer) {
            console.error("[security] unapproved peer attempted to relay message");
            return;
        }

        const other = room.host === socket ? room.peer : room.host;
        if (!other) {
            console.log("[signaling] unrelayable message:", msg.type);
            socket.send(JSON.stringify({ type: "error", message: "peer not connected yet" }));
            return;
        }

        other.send(raw.toString());
    });

    socket.on("close", () => {
        console.log("[signaling] client disconnected");
        const code = socketToRoom.get(socket);
        if (!code) return;

        const room = rooms.get(code);
        socketToRoom.delete(socket);
        if (!room) return;

        if (room.host === socket) {
            if (room.peer) {
                room.peer.send(JSON.stringify({ type: "host-left", code }));
                socketToRoom.delete(room.peer);
            }
            if (room.pendingPeer) {
                socketToRoom.delete(room.pendingPeer);
            }
            rooms.delete(code);
            console.log(`[signaling] room ${code} closed (host left)`);
        } else if (room.peer === socket) {
            room.peer = null;
            room.host.send(JSON.stringify({ type: "peer-left", code }));
            console.log(`[signaling] peer left room ${code}, room still open`);
        } else if (room.pendingPeer === socket) {
            room.pendingPeer = null;
            room.host.send(JSON.stringify({ type: "join-request-cancelled", code }));
            console.log(`[signaling] pending peer disconnected for room ${code}`);
        }
    });
});

console.log(`[signaling] listening on ws://localhost:${PORT}`);