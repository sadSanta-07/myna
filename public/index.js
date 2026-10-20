const statusEl = document.getElementById("status");
const statusMessageEl = document.getElementById("status-message");
const setupEl = document.getElementById("setup");
const terminalWrapEl = document.getElementById("terminal-wrap");
const terminalEl = document.getElementById("terminal");
const roomCodeEl = document.getElementById("roomCode");
const roleEl = document.getElementById("role");
const joinButtonEl = document.getElementById("join-button");
const changeRoomButtonEl = document.getElementById("change-room");
const controlWarningEl = document.getElementById("control-warning");

const SIGNAL_URL = "wss://myna-cloudflare-signal.iffcogc34.workers.dev".replace(/\/+$/, "");

let ws = null;
let pc = null;
let dc = null;
let controlDc = null;
let term = null;
let fitAddon = null;
let roomCode = "";
let role = "";
let joining = false;
let terminalInitialized = false;
let joinAttempt = 0;

function setStatus(message, state = "ready", showChangeRoom = false) {
    statusMessageEl.textContent = message;
    statusEl.dataset.state = state;
    changeRoomButtonEl.hidden = !showChangeRoom;
}

function log(message) {
    const lower = String(message).toLowerCase();
    let state = "ready";

    if (lower.includes("error") || lower.includes("denied") || lower.includes("revoked") || lower.includes("closed") || lower.includes("failed") || lower.includes("disconnected")) {
        state = "error";
    } else if (lower.includes("connect") || lower.includes("requesting") || lower.includes("establishing")) {
        state = "connecting";
    } else if (lower.includes("waiting") || lower.includes("pending") || lower.includes("approv")) {
        state = "waiting";
    } else if (lower.includes("live") || lower.includes("joined")) {
        state = "connected";
    }

    setStatus(message, state, state === "error" || state === "connected");
    console.log("[myna]", message);
}

function setJoining(value) {
    joining = value;
    joinButtonEl.disabled = value;
    joinButtonEl.querySelector("span").textContent = value ? "Connecting…" : "Join session";
    roomCodeEl.readOnly = value;
    roleEl.disabled = value;
}

function updateRoleHint() {
    const hint = document.getElementById("role-hint");
    if (roleEl.value === "control") {
        hint.textContent = "Input you send is typed into the host's shell.";
        controlWarningEl.hidden = false;
    } else {
        hint.textContent = "Watch output without sending terminal input.";
        controlWarningEl.hidden = true;
    }
}

function cleanupConnection({ closeSocket = true } = {}) {
    if (dc) {
        dc.onmessage = null;
        dc.onopen = null;
        dc.onclose = null;
        try { dc.close(); } catch (_) {}
    }
    if (controlDc) {
        controlDc.onmessage = null;
        try { controlDc.close(); } catch (_) {}
    }
    if (pc) {
        pc.onicecandidate = null;
        pc.ondatachannel = null;
        pc.onconnectionstatechange = null;
        try { pc.close(); } catch (_) {}
    }
    if (closeSocket && ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try { ws.close(); } catch (_) {}
    }

    dc = null;
    controlDc = null;
    pc = null;
    if (closeSocket) ws = null;
}

function returnToSetup(message, state = "error") {
    cleanupConnection();
    setJoining(false);
    terminalWrapEl.setAttribute("aria-hidden", "true");
    setupEl.hidden = false;
    setupEl.style.display = "";
    roomCodeEl.readOnly = false;
    roleEl.disabled = false;
    setStatus(message, state, true);
    roomCodeEl.focus();
}

async function joinRoom(event) {
    if (event) event.preventDefault();
    if (joining) return;

    roomCode = roomCodeEl.value.trim();
    role = roleEl.value;

    if (!roomCode) {
        setStatus("Enter the room code shared by your host.", "error");
        roomCodeEl.focus();
        return;
    }
    if (!/^[a-fA-F0-9]{8}\.[a-fA-F0-9]{16}$/.test(roomCode)) {
        setStatus("That room code doesn't look right. Paste the complete code from your MYNA host.", "error");
        roomCodeEl.focus();
        roomCodeEl.select();
        return;
    }

    cleanupConnection();
    const attempt = ++joinAttempt;
    setJoining(true);
    setupEl.hidden = true;
    setupEl.style.display = "none";
    terminalWrapEl.setAttribute("aria-hidden", "true");
    setStatus("Connecting to the signaling server…", "connecting", true);

    try {
        ws = new WebSocket(`${SIGNAL_URL}/room/${encodeURIComponent(roomCode)}`);
    } catch (error) {
        console.error("Could not create signaling connection:", error);
        returnToSetup("Couldn't start the connection. Check the room code and try again.");
        return;
    }

    const socket = ws;
    socket.onopen = () => {
        if (attempt !== joinAttempt) return;
        setStatus("Requesting to join. Waiting for the host…", "waiting", true);
        socket.send(JSON.stringify({
            type: "join-room",
            code: roomCode,
            requestedRole: role
        }));
    };

    socket.onmessage = async (event) => {
        if (attempt !== joinAttempt) return;
        try {
            const msg = JSON.parse(event.data);
            console.log("[myna] signaling:", msg.type);

            if (msg.type === "error") {
                returnToSetup(msg.message || "The room returned an error. Check the code and try again.");
                return;
            }

            if (msg.type === "join-pending") {
                setStatus("Your request is with the host. Keep this page open while they approve you.", "waiting", true);
                return;
            }

            if (msg.type === "join-denied") {
                returnToSetup("The host declined this join request. Check with them before trying again.");
                return;
            }

            if (msg.type === "revoked") {
                if (term) term.write("\r\n\x1b[33m[myna] Your access was revoked by the host.\x1b[0m\r\n");
                cleanupConnection({ closeSocket: false });
                setStatus("The host revoked your access.", "error", true);
                setJoining(false);
                setupEl.hidden = false;
                setupEl.style.display = "";
                terminalWrapEl.setAttribute("aria-hidden", "true");
                return;
            }

            if (msg.type === "host-left") {
                returnToSetup("The host closed this session. Ask them for a new room code.");
                return;
            }

            if (msg.type === "joined") {
                role = msg.role || role;
                setStatus(`Approved as ${role === "control" ? "control" : "view only"}. Establishing the peer connection…`, "connecting", true);

                pc = new RTCPeerConnection({
                    iceServers: msg.iceServers || [{ urls: "stun:stun.l.google.com:19302" }]
                });

                pc.onicecandidate = (iceEvent) => {
                    if (iceEvent.candidate && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: "ice-candidate",
                            candidate: iceEvent.candidate
                        }));
                    }
                };

                pc.onconnectionstatechange = () => {
                    if (!pc || attempt !== joinAttempt) return;
                    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
                        log("Peer connection disconnected. You can return to the room form and retry.");
                    }
                };

                pc.ondatachannel = (channelEvent) => {
                    const channel = channelEvent.channel;
                    if (channel.label === "terminal") {
                        dc = channel;
                        dc.onopen = () => {
                            if (attempt === joinAttempt) setupTerminal();
                        };
                        dc.onclose = () => {
                            if (attempt === joinAttempt) log("Terminal stream disconnected.");
                        };
                        dc.onerror = () => {
                            if (attempt === joinAttempt) log("Terminal stream error.");
                        };
                    } else if (channel.label === "control") {
                        controlDc = channel;
                        controlDc.onmessage = (controlEvent) => {
                            try {
                                const controlMessage = JSON.parse(controlEvent.data);
                                if (controlMessage.type === "resize" && term) {
                                    term.resize(controlMessage.cols, controlMessage.rows);
                                    fitAddon?.fit();
                                }
                            } catch (error) {
                                console.warn("[myna] Ignoring malformed control message:", error);
                            }
                        };
                    }
                };
            }

            if (msg.type === "sdp-offer") {
                if (!pc) {
                    log("Received a connection offer before the peer was ready. Please retry.");
                    return;
                }
                await pc.setRemoteDescription(msg.sdp);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: "sdp-answer", sdp: answer }));
                }
            }

            if (msg.type === "ice-candidate" && pc) {
                await pc.addIceCandidate(msg.candidate);
            }
        } catch (error) {
            console.error("[myna] Signaling message error:", error);
            log("A connection message could not be processed. Please try again.");
        }
    };

    socket.onerror = () => {
        if (attempt !== joinAttempt) return;
        returnToSetup("Couldn't reach the signaling server. Check your connection and try again.");
    };

    socket.onclose = () => {
        if (attempt !== joinAttempt) return;
        if (statusEl.dataset.state !== "connected" && statusEl.dataset.state !== "error") {
            returnToSetup("The signaling connection closed before the session was ready. Try again.");
        } else if (statusEl.dataset.state === "connected") {
            log("Signaling connection closed. The terminal may stay active while the peer connection is open.");
        }
    };
}

function setupTerminal() {
    if (!dc || dc.readyState !== "open") return;

    log("Connected. Terminal stream is live.");
    setJoining(false);
    changeRoomButtonEl.hidden = false;
    terminalWrapEl.setAttribute("aria-hidden", "false");
    document.getElementById("session-role").textContent = role === "control" ? "Control access" : "View only";
    document.getElementById("terminal-mode").textContent =
        role === "control" ? "Control enabled · Read / Write" : "View only · Input disabled";

    if (!terminalInitialized) {
        term = new Terminal({
            cursorBlink: true,
            allowProposedApi: true,
            windowOptions: { setWinLines: false, setWinCols: false },
            ignoreBracketedPasteMode: false,
            allowTransparency: false,
            disableStdin: role !== "control",
            allowWindowOptions: false,
            fontFamily: '"DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: window.matchMedia("(max-width: 600px)").matches ? 12 : 13,
            lineHeight: 1.45,
            convertEol: true,
            scrollback: 5000,
            theme: {
                background: "#080908",
                foreground: "#e8ebe4",
                cursor: "#bbf451",
                cursorAccent: "#080908",
                selectionBackground: "rgba(187, 244, 81, 0.25)",
                black: "#101210",
                green: "#bbf451",
                brightGreen: "#c8ff63"
            }
        });

        fitAddon = new FitAddon.FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalEl);
        terminalInitialized = true;

        term.onData((data) => {
            if (dc && dc.readyState === "open" && role === "control") {
                dc.send(JSON.stringify({ type: "input", data }));
            }
        });
    } else {
        term.options.disableStdin = role !== "control";
    }

    fitTerminal();
    term.focus();

    if (dc) {
        dc.onmessage = (messageEvent) => {
            if (term) term.write(messageEvent.data);
        };
    }
}

function fitTerminal() {
    if (!fitAddon || !term || terminalWrapEl.getAttribute("aria-hidden") === "true") return;
    requestAnimationFrame(() => {
        try {
            fitAddon.fit();
            if (dc && dc.readyState === "open" && role === "control") {
                dc.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
            }
        } catch (error) {
            console.warn("[myna] Terminal fit deferred:", error);
        }
    });
}

function changeRoom() {
    joinAttempt += 1;
    cleanupConnection();
    if (term) {
        term.reset();
        term.clear();
    }
    roomCode = "";
    setJoining(false);
    terminalWrapEl.setAttribute("aria-hidden", "true");
    setupEl.hidden = false;
    setupEl.style.display = "";
    roomCodeEl.readOnly = false;
    roleEl.disabled = false;
    setStatus("Ready when you are. Enter a room code to get started.", "ready");
    roomCodeEl.focus();
}

roleEl.addEventListener("change", updateRoleHint);
setupEl.addEventListener("submit", joinRoom);
changeRoomButtonEl.addEventListener("click", changeRoom);
window.addEventListener("resize", fitTerminal);

if (window.location.hash) {
    try {
        roomCodeEl.value = decodeURIComponent(window.location.hash.substring(1));
    } catch (_) {
        roomCodeEl.value = window.location.hash.substring(1);
    }
}
updateRoleHint();
