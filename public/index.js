const statusEl = document.getElementById('status');
const setupEl = document.getElementById('setup');
const terminalWrapEl = document.getElementById('terminal-wrap');
const terminalEl = document.getElementById('terminal');

let ws, pc, dc, term, fitAddon;

let roomCode = "";
let role = "";

if (window.location.hash) {
    document.getElementById('roomCode').value =
        window.location.hash.substring(1);
}

function log(msg) {
    statusEl.innerText = msg;

    const lower = String(msg).toLowerCase();

    if (
        lower.includes('error') ||
        lower.includes('denied') ||
        lower.includes('revoked')
    ) {
        statusEl.dataset.state = 'error';
    } else if (
        lower.includes('connect') ||
        lower.includes('requesting')
    ) {
        statusEl.dataset.state = 'connecting';
    } else if (
        lower.includes('waiting') ||
        lower.includes('pending')
    ) {
        statusEl.dataset.state = 'waiting';
    } else if (
        lower.includes('live') ||
        lower.includes('joined')
    ) {
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

    const protocol =
        window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        log("Requesting to join room...");

        ws.send(JSON.stringify({
            type: "join-room",
            code: roomCode,
            requestedRole: role
        }));
    };

    ws.onmessage = async (event) => {
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
        }

        if (msg.type === "host-left") {
            log("Host closed the session.");
        }

        if (msg.type === "joined") {
            log(`Joined as ${msg.role}. Establishing P2P connection...`);

            pc = new RTCPeerConnection({
                iceServers: msg.iceServers || [
                    {
                        urls: "stun:stun.l.google.com:19302"
                    }
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
                dc = e.channel;
                setupTerminal();
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
        fontFamily:
            '"DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
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