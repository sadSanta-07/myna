const statusEl = document.getElementById('status');
const setupEl = document.getElementById('setup');
const terminalWrapEl = document.getElementById('terminal-wrap');
const terminalEl = document.getElementById('terminal');

const SIGNAL_URL = "wss://myna-cloudflare-signal.iffcogc34.workers.dev".replace(/\/+$/, "");

let ws, pc, dc, term, fitAddon;

let roomCode = "";
let role = "";

if (window.location.hash) {
    document.getElementById('roomCode').value = window.location.hash.substring(1);
}

function log(msg) {
    statusEl.innerText = msg;
    const lower = String(msg).toLowerCase();

    if (lower.includes('error') || lower.includes('denied') || lower.includes('revoked')) {
        statusEl.dataset.state = 'error';
    } else if (lower.includes('connect') || lower.includes('requesting')) {
        statusEl.dataset.state = 'connecting';
    } else if (lower.includes('waiting') || lower.includes('pending')) {
        statusEl.dataset.state = 'waiting';
    } else if (lower.includes('live') || lower.includes('joined')) {
        statusEl.dataset.state = 'connected';
    } else {
        statusEl.dataset.state = 'ready';
    }

    console.log(msg);
}

async function joinRoom() {
    roomCode = document.getElementById('roomCode').value.trim();
    role = document.getElementById('role').value;

    if (!roomCode) {
        return alert("Enter a room code");
    }

    setupEl.style.display = 'none';

    log("Connecting to signaling server...");

    ws = new WebSocket(`${SIGNAL_URL}/room/${roomCode}`);

    ws.onopen = () => {
        log("Requesting to join room...");
        ws.send(JSON.stringify({
            type: "join-room",
            code: roomCode,
            requestedRole: role
        }));
    };

    ws.onmessage = async (event) => {
        try {
            const msg = JSON.parse(event.data);
            console.log("Received:", msg.type);

            if (msg.type === "error") {
                log(`Error: ${msg.message}`);
            }

            if (msg.type === "join-pending") {
                log("Waiting for host to approve...");
            }

            if (msg.type === "join-denied") {
                log("Host denied your request.");
            }

            if (msg.type === "revoked") {
                log("Host revoked your access.");
                if (dc) dc.close();
                if (pc) pc.close();
            }

            if (msg.type === "host-left") {
                log("Host closed the session.");
                if (dc) dc.close();
                if (pc) pc.close();
            }

            if (msg.type === "joined") {
                log(`Joined as ${msg.role}. Establishing P2P connection...`);
                role = msg.role;

                pc = new RTCPeerConnection({
                    iceServers: msg.iceServers || [
                        { urls: "stun:stun.l.google.com:19302" }
                    ]
                });

                pc.onicecandidate = (e) => {
                    if (e.candidate) {
                        ws.send(JSON.stringify({
                            type: "ice-candidate",
                            candidate: e.candidate
                        }));
                    }
                };

                pc.ondatachannel = (e) => {
                    if (e.channel.label === "terminal") {
                        dc = e.channel;
                        dc.onopen = () => {
                            setupTerminal();
                        };
                    } else if (e.channel.label === "control") {
                        const controlDc = e.channel;
                        controlDc.onmessage = (msgEvent) => {
                            try {
                                const m = JSON.parse(msgEvent.data);
                                if (m.type === "resize" && term) {
                                    term.resize(m.cols, m.rows);
                                }
                            } catch (err) { }
                        };
                    }
                };
            }

            if (msg.type === "sdp-offer") {
                await pc.setRemoteDescription(msg.sdp);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                ws.send(JSON.stringify({
                    type: "sdp-answer",
                    sdp: answer
                }));
            }

            if (msg.type === "ice-candidate") {
                await pc.addIceCandidate(msg.candidate);
            }
        } catch (err) {
            console.error("Signaling error:", err);
        }
    };
}

function setupTerminal() {
    log("Connected! Terminal live.");

    terminalWrapEl.style.display = 'block';
    document.getElementById('terminal-mode').textContent =
        role === 'control'
            ? 'Control enabled · Read / Write'
            : 'View only · Input disabled';

    term = new Terminal({
        cursorBlink: true,
        allowProposedApi: true,
        windowOptions: { setWinLines: false, setWinCols: false },
        ignoreBracketedPasteMode: false,
        allowTransparency: false,
        disableStdin: false,
        allowWindowOptions: false,
        fontFamily: '"DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 13,
        lineHeight: 1.45,
        convertEol: true,
        scrollback: 5000,
        theme: {
            background: '#080908',
            foreground: '#e8ebe4',
            cursor: '#bbf451',
            cursorAccent: '#080908',
            selectionBackground: 'rgba(187, 244, 81, 0.25)',
            black: '#101210',
            green: '#bbf451',
            brightGreen: '#c8ff63'
        }
    });

    fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalEl);
    fitAddon.fit();

    term.writeln("\x1b[32m[myna] P2P Terminal stream connected directly to host.\x1b[0m");
    term.writeln("\x1b[33m[myna] Note: This session is being audited by the host.\x1b[0m\r\n");

    dc.onmessage = (e) => {
        term.write(e.data);
    };

    term.onData((data) => {
        if (dc.readyState === "open" && role === "control") {
            dc.send(JSON.stringify({
                type: "input",
                data
            }));
        }
    });

    window.addEventListener('resize', () => {
        fitAddon.fit();
        if (dc.readyState === "open" && role === "control") {
            dc.send(JSON.stringify({
                type: "resize",
                cols: term.cols,
                rows: term.rows
            }));
        }
    });
}