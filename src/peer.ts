import wrtc from "@roamhq/wrtc";
const { RTCPeerConnection } = wrtc;

export function createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    pc.oniceconnectionstatechange = () => {
        console.log("[peer] ICE connection state: ", pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
        console.log("[peer] connection state :", pc.connectionState);
    };

    return pc;

}