import wrtc from "@roamhq/wrtc";
const { RTCPeerConnection } = wrtc;

export function createPeerConnection(label: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    pc.oniceconnectionstatechange = () => {
        console.log(`[${label}] ICE connection state:`, pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
        console.log(`[${label}] connection state:`, pc.connectionState);
    };

    return pc;
}