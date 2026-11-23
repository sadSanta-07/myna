"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Check,
  Cpu,
  Layers,
  LockKeyhole,
  Monitor,
  Network,
  Play,
  Radio,
  Server,
  ShieldCheck,
  Terminal,
  Wifi,
  Zap,
} from "lucide-react";

const layers = [
  {
    number: "01",
    id: "host",
    title: "Host CLI",
    subtitle: "Your machine · Shell stays local",
    detail: "Spawns native local PTY or containerized sandbox. Owns session lifecycle.",
    icon: Terminal,
    tag: "SOURCE OF TRUTH",
    color: "from-lime-400 to-emerald-500",
    payload: {
      action: "Allocates pseudo-terminal /dev/pts/3",
      transport: "Local OS process (stdin / stdout / resize)",
      security: "Host retains root control & prompt approval",
      packetSize: "Raw UTF-8 binary chunks",
    },
  },
  {
    number: "02",
    id: "signaling",
    title: "Signaling Broker",
    subtitle: "Discovery & Handshake setup",
    detail: "Lightweight WebSocket server pairs peers and exchanges SDP / ICE candidate info.",
    icon: Network,
    tag: "ZERO RELAY CLOUD",
    color: "from-sky-400 to-cyan-500",
    payload: {
      action: "Brokers WebRTC handshake via room code",
      transport: "Cloudflare Workers / Durable Objects WebSocket",
      security: "Zero terminal payload passes through server",
      packetSize: "~2 KB ephemeral SDP & ICE metadata",
    },
  },
  {
    number: "03",
    id: "datachannel",
    title: "WebRTC DataChannel",
    subtitle: "Direct P2P · Terminal transport",
    detail: "Carries interactive shell keystrokes and ANSI escape streams directly between peers.",
    icon: Wifi,
    tag: "DIRECT P2P STREAM",
    color: "from-purple-400 to-violet-500",
    payload: {
      action: "P2P SCTP data channel over DTLS 1.3",
      transport: "Direct UDP peer-to-peer (TURN fallback available)",
      security: "End-to-end encrypted; sub-25ms latency",
      packetSize: "Micro-packets per keystroke / screen burst",
    },
  },
  {
    number: "04",
    id: "guest",
    title: "Guest Teammate",
    subtitle: "Browser or CLI · Approved access",
    detail: "Teammate interacts with the live shell based on host-approved role (View or Control).",
    icon: Monitor,
    tag: "CLIENT RENDER",
    color: "from-amber-400 to-orange-500",
    payload: {
      action: "WebGL xterm.js terminal canvas rendering",
      transport: "Browser client or secondary terminal client",
      security: "Revocable by host at any instant (Ctrl+] X)",
      packetSize: "Direct canvas redraw without video streaming",
    },
  },
];

const conduits = [
  { label: "WSS Pairing", sub: "SDP Offer/Answer" },
  { label: "Direct ICE Candidate", sub: "P2P Hole Punching" },
  { label: "Encrypted SCTP Channel", sub: "Direct PTY Stream" },
];

const principles = [
  {
    icon: LockKeyhole,
    title: "Host stays in control",
    description:
      "Guests request access. The host decides whether to allow viewing or control, and can freeze or revoke anytime.",
    tag: "ACCESS POLICY",
  },
  {
    icon: Terminal,
    title: "Execution stays at the host",
    description:
      "MYNA shares terminal interaction rather than moving your code or shell to a third-party server.",
    tag: "LOCAL EXECUTION",
  },
  {
    icon: Network,
    title: "A connection, not a screen share",
    description:
      "Terminal I/O travels through a WebRTC DataChannel as raw text rather than being encoded as heavyweight video pixels.",
    tag: "TRANSPORT EFFICIENCY",
  },
];

export default function ArchitectureSection() {
  const [activeStage, setActiveStage] = useState(0);
  const [isSimulatingTrace, setIsSimulatingTrace] = useState(false);
  const traceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-cycle trace when simulation is clicked
  useEffect(() => {
    if (isSimulatingTrace) {
      traceTimer.current = setInterval(() => {
        setActiveStage((prev) => (prev + 1) % layers.length);
      }, 2200);
    } else {
      if (traceTimer.current) clearInterval(traceTimer.current);
    }

    return () => {
      if (traceTimer.current) clearInterval(traceTimer.current);
    };
  }, [isSimulatingTrace]);

  const currentLayer = layers[activeStage];

  return (
    <section
      id="architecture"
      className="relative overflow-hidden bg-[#f7f7f3] px-4 py-24 sm:px-6 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header copy */}
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-600 shadow-sm">
              <span className="size-2 rounded-full bg-[#bbf451]" />
              Under the hood
            </div>

            <h2 className="mt-6 max-w-xl text-4xl font-semibold leading-[1.06] tracking-[-0.055em] text-neutral-950 sm:text-5xl lg:text-6xl">
              One shell.
              <br />
              <span className="font-display font-normal italic">
                A direct connection.
              </span>
            </h2>
          </div>

          <p className="max-w-xl text-sm leading-7 text-neutral-600 sm:text-base lg:justify-self-end">
            MYNA coordinates the initial connection through a signaling broker, then
            lets peers stream raw terminal I/O over a direct WebRTC DataChannel. No
            video compression, no cloud shell servers.
          </p>
        </div>

        {/* High-Tech Architecture Canvas */}
        <div className="relative mt-12 overflow-hidden rounded-[28px] border border-white/10 bg-[#08080a] p-5 text-white shadow-2xl shadow-black/20 sm:mt-16 sm:p-8 lg:p-10 ring-1 ring-white/5">
          {/* Subtle grid backdrop */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />

          {/* Top telemetry bar */}
          <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                <Radio className="size-4 text-[#bbf451] animate-pulse" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                  MYNA / REAL-TIME ARCHITECTURE
                </p>
                <p className="text-xs text-neutral-300">
                  Interactive WebRTC Data Path & Pipeline Trace
                </p>
              </div>
            </div>

            {/* Simulation controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSimulatingTrace(!isSimulatingTrace)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[10px] font-medium transition ${
                  isSimulatingTrace
                    ? "border-[#bbf451]/50 bg-[#bbf451]/15 text-[#bbf451] shadow-[0_0_15px_rgba(187,244,81,0.2)]"
                    : "border-white/15 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Play className={`size-3 ${isSimulatingTrace ? "fill-[#bbf451]" : ""}`} />
                <span>{isSimulatingTrace ? "Tracing Live Stream" : "Simulate Packet Flow"}</span>
              </button>

              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-neutral-400">
                <span className="size-1.5 rounded-full bg-[#bbf451]" />
                Zero Cloud Relay
              </span>
            </div>
          </div>

          {/* ==========================================================
              STAGES WITH ANIMATED HIGH-TECH CONNECTORS (NO SHIT ARROWS!)
              ========================================================== */}
          <div className="relative mt-8 grid gap-4 md:grid-cols-4 md:gap-3 lg:gap-4">
            {layers.map((layer, index) => {
              const Icon = layer.icon;
              const isActive = activeStage === index;

              return (
                <div key={layer.number} className="relative min-w-0">
                  {/* Card Container */}
                  <div
                    onClick={() => {
                      setActiveStage(index);
                      setIsSimulatingTrace(false);
                    }}
                    className={`group relative h-full cursor-pointer rounded-2xl border p-5 transition-all duration-300 sm:p-6 ${
                      isActive
                        ? "border-[#bbf451] bg-[#12140e] shadow-[0_0_30px_rgba(187,244,81,0.12)] -translate-y-1"
                        : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    {/* Active beacon indicator */}
                    {isActive && (
                      <span className="absolute -top-1.5 right-4 rounded-full bg-[#bbf451] px-2 py-0.5 font-mono text-[9px] font-bold text-black uppercase tracking-wider">
                        ACTIVE STAGE
                      </span>
                    )}

                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-xs font-semibold ${
                          isActive ? "text-[#bbf451]" : "text-neutral-500"
                        }`}
                      >
                        {layer.number}
                      </span>
                      <div
                        className={`flex size-10 items-center justify-center rounded-xl border transition-all ${
                          isActive
                            ? "border-[#bbf451]/50 bg-[#bbf451]/20 text-[#bbf451]"
                            : "border-white/10 bg-white/[0.05] text-neutral-400 group-hover:text-white"
                        }`}
                      >
                        <Icon className="size-5" />
                      </div>
                    </div>

                    <h3 className="mt-5 text-base font-semibold tracking-tight text-white">
                      {layer.title}
                    </h3>

                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#bbf451]/90">
                      {layer.tag}
                    </p>

                    <p className="mt-3 text-xs leading-5 text-neutral-400">
                      {layer.detail}
                    </p>

                    {/* Step telemetry footer */}
                    <div className="mt-5 border-t border-white/[0.08] pt-3 flex items-center justify-between font-mono text-[9px] text-neutral-500">
                      <span>{layer.subtitle.split("·")[0]}</span>
                      <span className={isActive ? "text-[#bbf451]" : ""}>
                        {isActive ? "Inspecting" : "Click to view"}
                      </span>
                    </div>
                  </div>

                  {/* ----------------------------------------------------
                      STATE-OF-THE-ART ANIMATED CONNECTOR BEAMS
                      Replaces static arrows with glowing animated energy conduits!
                      ---------------------------------------------------- */}
                  {index < layers.length - 1 && (
                    <>
                      {/* Desktop Horizontal Conduit */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none hidden md:block md:absolute md:-right-2 md:top-1/2 md:z-20 md:w-4 md:-translate-y-1/2 lg:-right-2.5 lg:w-5"
                      >
                        <div className="relative flex items-center justify-center">
                          {/* Pulsing energy bead */}
                          <div
                            className={`size-2.5 rounded-full border transition-all ${
                              activeStage === index || activeStage === index + 1
                                ? "border-[#bbf451] bg-[#bbf451] shadow-[0_0_12px_#bbf451]"
                                : "border-white/30 bg-white/20"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Mobile Vertical Conduit with animated beam */}
                      <div
                        aria-hidden="true"
                        className="flex h-7 items-center justify-center text-[#bbf451] md:hidden"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="size-1 rounded-full bg-[#bbf451] animate-ping" />
                          <div className="h-4 w-0.5 bg-gradient-to-b from-[#bbf451] to-sky-400 animate-pulse" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* ==========================================================
              INTERACTIVE PROTOCOL INSPECTOR PANEL (LIVE DATA TELEMETRY)
              ========================================================== */}
          <div className="relative mt-7 rounded-2xl border border-white/10 bg-[#0d0d11] p-5 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-[#bbf451] animate-ping" />
                <span className="font-mono text-xs font-semibold text-white tracking-wide">
                  STAGE {currentLayer.number} PROTOCOL INSPECTOR:{" "}
                  <span className="text-[#bbf451]">{currentLayer.title}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-[10px] text-neutral-400">
                <span className="rounded bg-white/5 px-2 py-0.5 border border-white/5">
                  Direct I/O Stream
                </span>
                <span className="rounded bg-white/5 px-2 py-0.5 border border-white/5 text-[#4ade80]">
                  E2E Verified
                </span>
              </div>
            </div>

            {/* Protocol fields grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <div className="rounded-xl border border-white/5 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                  ACTION &amp; LIFECYCLE
                </p>
                <p className="mt-1 text-white font-medium">
                  {currentLayer.payload.action}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                  TRANSPORT PROTOCOL
                </p>
                <p className="mt-1 text-sky-300 font-medium">
                  {currentLayer.payload.transport}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                  SECURITY BOUNDARY
                </p>
                <p className="mt-1 text-amber-200 font-medium">
                  {currentLayer.payload.security}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                  PAYLOAD PROFILE
                </p>
                <p className="mt-1 text-[#bbf451] font-medium">
                  {currentLayer.payload.packetSize}
                </p>
              </div>
            </div>
          </div>

          {/* Host Control Guarantee Banner */}
          <div className="relative mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/50 p-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#bbf451] text-black">
              <Check className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">
                Access remains strictly host-controlled
              </p>
              <p className="mt-0.5 text-xs text-neutral-400">
                The host approves guest permissions before collaboration begins.
                Zero remote commands execute without explicit approval.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-neutral-400">
              Zero-Trust Architecture
            </span>
          </div>
        </div>

        {/* Design principles cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {principles.map((item, index) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="group rounded-[24px] border border-black/[0.08] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/[0.04] sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[#bbf451]/30 text-neutral-950 transition-colors group-hover:bg-[#bbf451]">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-neutral-400">
                    0{index + 1}
                  </span>
                </div>

                <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                  {item.tag}
                </p>

                <h3 className="mt-2 text-lg font-semibold tracking-tight text-neutral-950">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
