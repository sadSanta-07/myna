import { WebSocketServer, WebSocket } from "ws";
import { randomBytes } from "crypto";

const PORT = 8080;

const wss = new WebSocketServer({ port: PORT });

interface Room {
    host: WebSocket;
    peer: WebSocket | null;
}

const rooms = new Map<string, Room>();

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
            socket.send(JSON.stringify({ type: "joined", code: msg.code }));
            room.host.send(JSON.stringify({ type: "peer-joined", code: msg.code }));
            console.log(`[signaling] peer joined room: ${msg.code}`);
            return;
        }
    });

    socket.on("close", () => {
        console.log("[signaling] client disconnected");
    });
});

console.log(`[signaling] listening on ws://localhost:${PORT}`);