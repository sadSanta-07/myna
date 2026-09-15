import { WebSocketServer } from "ws";

const PORT = 8080;

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket) => {
    console.log("[signaling] client connected");

    socket.on("message", (data) => {
        console.log("[signaling] recieved:", data.toString());
    });

    socket.on("close", () => {
        console.log("[signaling] client disconnected");
    });
});

console.log(`[signaling] listening on ws://localhost:${PORT}`);