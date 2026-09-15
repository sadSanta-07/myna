import { WebSocketServer, WebSocket } from "ws";
import { randomBytes } from "crypto";

const PORT = 8080;

const wss = new WebSocketServer({ port: PORT });

interface Room {
    host: WebSocket;
    peer: WebSocket | null;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<WebSocket, string>();

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
            rooms.set(code, { host: socket, peer: null });
            socketToRoom.set(socket, code);
            socket.send(JSON.stringify({ type: "room-created", code }));
            console.log(`[signaling] room created ${code}`);
        }
        if (msg.type === "join-room") {
            const room = rooms.get(msg.code);

            if (!room) {
                socket.send(JSON.stringify({ type: "error", message: "room not found" }));
                return;
            }
            if (room.peer) {
                socket.send(JSON.stringify({ type: "error", message: "room  already full" }));
                return;
            }

            room.peer = socket;
            socketToRoom.set(socket, msg.code);
            socket.send(JSON.stringify({ type: "joined", code: msg.code }));
            room.host.send(JSON.stringify({ type: "peer-joined", code: msg.code }));
            console.log(`[signaling] peer joined room: ${msg.code}`);
            return;
        }

        //sdp-offer , sdp-answer , ice-cand etc... gets relayed
        const code = socketToRoom.get(socket);
        if (!code) {
            socket.send(JSON.stringify({ type: "error", message: "not in a room" }));
            return;
        }

        const room = rooms.get(code);
        if (!room) return;

        const other = room.host === socket ? room.peer : room.host;
        if (!other) {
            socket.send(JSON.stringify({ type: "error", message: "peer not connected yet" }))
            return;
        }

        other.send(raw.toString());
    });

    socket.on("close", () => {
        console.log("[signaling] client disconnected");
        const code = socketToRoom.get(socket);
        if (!code) return; // was never in a room (e.g. connected but never sent create/join)

        const room = rooms.get(code);
        socketToRoom.delete(socket);

        if (!room) return;

        if (room.host === socket) {
            // host left — room  dead
            if (room.peer) {
                room.peer.send(JSON.stringify({ type: "host-left", code }));
                socketToRoom.delete(room.peer);
            }
            rooms.delete(code);
            console.log(`[signaling] room ${code} closed (host left)`);
        } else if (room.peer === socket) {
            // peer left — room survives
            room.peer = null;
            room.host.send(JSON.stringify({ type: "peer-left", code }));
            console.log(`[signaling] peer left room ${code}, room still open`);
        }
    });
});

console.log(`[signaling] listening on ws://localhost:${PORT}`);