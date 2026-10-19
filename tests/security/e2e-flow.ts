// Check 18: the full flow through the signaling server, scripted.
//   create room -> join -> approve -> SDP offer/answer -> ICE -> data channel -> round trip
//
//   npx tsx tests/security/e2e-flow.ts
//
// Uses loopback ICE only (no STUN/TURN) unless E2E_USE_ICE=1, so it runs in CI.
// Exit code 0 on success, 1 on failure.
import wrtc from "@roamhq/wrtc";
import { assertSafeTarget, connectGuest, connectHost, newRoom, type Msg } from "./protocol.js";

const { RTCPeerConnection } = wrtc;
const TIMEOUT_MS = 15_000;

function fail(msg: string): never {
  console.error(`FAIL  e2e flow: ${msg}`);
  process.exit(1);
}

async function main() {
  assertSafeTarget();
  const timer = setTimeout(() => fail(`timed out after ${TIMEOUT_MS} ms`), TIMEOUT_MS);

  const room = await newRoom();
  if (!room.code) fail(`POST /new returned no code (HTTP ${room.status})`);
  const host = await connectHost(room.code);
  const guest = await connectGuest(room.code, "control");
  if (!host || !guest) fail("could not open WebSockets (check protocol.ts)");

  const req = await host.waitFor("join-request", 3000);
  if (!req) fail("host never saw join-request");
  const peerId = req.peerId as string;
  host.send({ type: "approve-peer", peerId, role: "control" });

  const joined = await guest.waitFor("joined", 3000);
  if (!joined) fail("guest was never approved");
  const peerJoined = await host.waitFor("peer-joined", 3000);
  if (!peerJoined) fail("host never saw peer-joined");

  const useIce = process.env.E2E_USE_ICE === "1";
  const hostPc = new RTCPeerConnection({ iceServers: useIce ? (peerJoined.iceServers ?? []) : [] });
  const guestPc = new RTCPeerConnection({ iceServers: useIce ? (joined.iceServers ?? []) : [] });

  const terminal = hostPc.createDataChannel("terminal");
  hostPc.createDataChannel("control");

  const hostGotInput = new Promise<string>((resolve) => {
    terminal.onmessage = (e: MessageEvent) => {
      try {
        const m = JSON.parse(e.data.toString());
        if (m.type === "input") resolve(m.data);
      } catch (err) { console.warn("[myna e2e] Ignoring non-JSON terminal message:", err); }
    };
  });
  const guestGotOutput = new Promise<string>((resolve) => {
    guestPc.ondatachannel = (e: RTCDataChannelEvent) => {
      const ch = e.channel;
      if (ch.label !== "terminal") return;
      ch.onmessage = (m: MessageEvent) => resolve(String(m.data));
      ch.onopen = () => ch.send(JSON.stringify({ type: "input", data: "echo e2e\n" }));
    };
  });
  terminal.onopen = () => terminal.send("hello-from-host");

  hostPc.onicecandidate = (e: RTCPeerConnectionIceEvent) => e.candidate && host.send({ type: "ice-candidate", peerId, candidate: e.candidate });
  guestPc.onicecandidate = (e: RTCPeerConnectionIceEvent) => e.candidate && guest.send({ type: "ice-candidate", candidate: e.candidate });

  let guestRemoteSet = false;
  const guestPending: RTCIceCandidateInit[] = [];
  guest.on(async (m: Msg) => {
    try {
      if (m.type === "sdp-offer") {
        await guestPc.setRemoteDescription(m.sdp);
        guestRemoteSet = true;
        for (const c of guestPending.splice(0)) await guestPc.addIceCandidate(c);
        const answer = await guestPc.createAnswer();
        await guestPc.setLocalDescription(answer);
        guest.send({ type: "sdp-answer", sdp: answer });
      } else if (m.type === "ice-candidate") {
        if (guestRemoteSet) await guestPc.addIceCandidate(m.candidate);
        else guestPending.push(m.candidate);
      }
    } catch (err: unknown) {
      fail(`guest handshake error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  let hostRemoteSet = false;
  const hostPending: RTCIceCandidateInit[] = [];
  host.on(async (m: Msg) => {
    try {
      if (m.type === "sdp-answer" && m.peerId === peerId) {
        await hostPc.setRemoteDescription(m.sdp);
        hostRemoteSet = true;
        for (const c of hostPending.splice(0)) await hostPc.addIceCandidate(c);
      } else if (m.type === "ice-candidate" && m.peerId === peerId) {
        if (hostRemoteSet) await hostPc.addIceCandidate(m.candidate);
        else hostPending.push(m.candidate);
      }
    } catch (err: unknown) {
      fail(`host handshake error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  const offer = await hostPc.createOffer();
  await hostPc.setLocalDescription(offer);
  host.send({ type: "sdp-offer", peerId, sdp: offer });

  const [out, input] = await Promise.all([guestGotOutput, hostGotInput]);
  if (out !== "hello-from-host") fail(`guest received "${out}" instead of the host's message`);
  if (input !== "echo e2e\n") fail(`host received "${input}" instead of the guest's input`);

  clearTimeout(timer);
  console.log("PASS  e2e flow: room, approval, SDP, ICE and a data-channel round trip all worked");
  hostPc.close();
  guestPc.close();
  host.close();
  guest.close();
  process.exit(0);
}

main();
