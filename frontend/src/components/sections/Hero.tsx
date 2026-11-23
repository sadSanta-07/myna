"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  Circle,
  Copy,
  Globe,
  Layers,
  LockKeyhole,
  Monitor,
  PackageCheck,
  Play,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Users,
  Wifi,
} from "lucide-react";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";
import { DiscoverButton } from "@/components/block/discover-button";

const INSTALL_COMMAND = "npm install -g myna-cli";
const ROOM_CODE = "93d58750.fd67220e0be9827b";
const SHARE_LINK = `https://myna-cloudflare-signal.miau.workers.dev/#${ROOM_CODE}`;

type ViewMode = "split" | "host" | "guest";
type HandshakeStep = 0 | 1 | 2 | 3;

export default function Hero() {
  const [installExpanded, setInstallExpanded] = useState(false);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Showcase state
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [handshakeStep, setHandshakeStep] = useState<HandshakeStep>(3);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [accessMode, setAccessMode] = useState<"control" | "view">("control");
  const [hostApprovedRole, setHostApprovedRole] = useState<"control" | "view">("control");
  const [isAccessDropdownOpen, setIsAccessDropdownOpen] = useState(false);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function copyInstallCommand() {
    setInstallExpanded(true);
    setCopying(true);

    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopiedInstall(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedInstall(false), 2400);
    } catch {
      setCopiedInstall(false);
    } finally {
      setCopying(false);
    }
  }

  async function copyText(text: string, type: "room" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "room") {
        setCopiedRoomCode(true);
        setTimeout(() => setCopiedRoomCode(false), 2000);
      } else {
        setCopiedShareLink(true);
        setTimeout(() => setCopiedShareLink(false), 2000);
      }
    } catch {
      // fallback
    }
  }

  // Auto-play demo step-by-step
  useEffect(() => {
    if (isPlayingDemo) {
      demoIntervalRef.current = setInterval(() => {
        setHandshakeStep((prev) => ((prev + 1) % 4) as HandshakeStep);
      }, 3500);
    } else {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    }
    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    };
  }, [isPlayingDemo]);

  function handleSimulateJoin() {
    setHandshakeStep(1);
    setTimeout(() => {
      setHandshakeStep(2);
      setTimeout(() => {
        setHandshakeStep(3);
      }, 1400);
    }, 1100);
  }

  return (
    <section id="product" className="relative isolate overflow-hidden font-sans">
      {/* Background artwork */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-262.5 max-h-[100vh] overflow-hidden"
      >
        <div className="h-full w-full bg-[url('/herobg.png')] bg-cover bg-center bg-no-repeat mask-[linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-white via-white/60 to-transparent"
      />

      <div className="relative px-4 pb-14 pt-28 sm:px-6 sm:pt-32">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center text-center">
          {/* Hero copy */}
          <div className="w-full pt-8 sm:pt-[6vh]">
            <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 shadow-sm backdrop-blur-md">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime-500 opacity-40" />
                <span className="relative inline-flex size-2 rounded-full bg-lime-500" />
              </span>

              <span className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-neutral-800">
                Native P2P &amp; Sandboxed Shell Sharing · v1.1.1
              </span>
            </div>

            <h1 className="mx-auto max-w-[22rem] font-sans text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.055em] text-neutral-950 sm:max-w-4xl sm:text-6xl md:text-7xl lg:text-[84px]">
              Your terminal.
              <br />
              Their screen.
              <br />
              <span className="font-display font-normal italic tracking-[-0.045em] text-neutral-900">
                Your machine stays yours.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-[23rem] font-sans text-sm leading-6 text-neutral-700 sm:mt-6 sm:max-w-2xl sm:text-base sm:leading-7 lg:text-lg">
              Share a live terminal session with zero cloud relay. Teammates join
              from their browser or CLI, request view or control access, and connect
              directly over WebRTC. Native shell or Docker sandbox.
            </p>

            {/* CTA action buttons */}
            <div className="mx-auto mt-7 flex w-full max-w-[590px] flex-col items-center justify-center gap-3 sm:mt-9 sm:flex-row sm:items-start">
              <div
                className={[
                  "min-w-0 transition-[width,flex-basis] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "w-full sm:w-auto",
                  installExpanded ? "sm:min-w-0 sm:flex-1" : "sm:flex-none",
                ].join(" ")}
              >
                <div
                  className={[
                    "mx-auto w-full transition-[max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    installExpanded ? "sm:max-w-none" : "sm:max-w-fit",
                  ].join(" ")}
                >
                  {!installExpanded ? (
                    <div className="flex justify-center">
                      <LiquidMetalButton
                        size="md"
                        icon={<PackageCheck className="size-4" />}
                        onClick={copyInstallCommand}
                        aria-label="Copy the MYNA npm installation command"
                        metalConfig={{
                          colorBack: "#a3a3a3",
                          colorTint: "#f7fee7",
                          speed: 0.45,
                          repetition: 4,
                          distortion: 0.12,
                        }}
                        className="mx-auto block w-fit max-w-full font-sans"
                      >
                        Install MYNA
                      </LiquidMetalButton>
                    </div>
                  ) : (
                    <div
                      className="flex h-[60px] w-full min-w-0 items-center overflow-hidden rounded-full border border-neutral-200 bg-white/95 p-1 shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 duration-300"
                      aria-label="MYNA installation command"
                    >
                      <code className="min-w-0 flex-1 truncate pl-4 text-left font-mono text-[11px] text-neutral-800 sm:text-[13px]">
                        <span className="mr-2 text-lime-700 font-bold">$</span>
                        {INSTALL_COMMAND}
                      </code>

                      <button
                        type="button"
                        onClick={copyInstallCommand}
                        disabled={copying}
                        className="mr-0.5 inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-neutral-950 px-3.5 font-sans text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-70 sm:px-4"
                        aria-label="Copy npm install command"
                      >
                        {copiedInstall ? (
                          <CheckCheck className="size-3.5 text-lime-400" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {copiedInstall ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                <p
                  className="mt-2 min-h-4 text-center font-sans text-xs text-neutral-600"
                  role="status"
                  aria-live="polite"
                >
                  {copiedInstall
                    ? "Copied! Next run: myna up"
                    : installExpanded
                      ? "Ready to paste in your terminal"
                      : "Click to copy the npm install command"}
                </p>
              </div>

              <DiscoverButton
                href="https://github.com/sadSanta-07/myna"
                label="Contribute"
                className="myna-discover-button"
              />
            </div>
          </div>

          {/* ==============================================================
              STATE-OF-THE-ART PRODUCT SHOWCASE (SEAMLESSLY CLIPPED & STYLED)
              ============================================================== */}
          <div
            id="terminal-preview"
            className="mt-10 w-full max-w-7xl text-left sm:mt-14"
          >
            {/* Outer window with overflow-hidden to prevent any under-layer peeking */}
            <div className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] border border-white/10 bg-[#08080a] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/10">
              {/* Window Header / Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#111114] px-4 py-3 sm:px-6">
                {/* Traffic lights & Title */}
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full bg-[#ff5f56]" />
                    <span className="size-3 rounded-full bg-[#febc2e]" />
                    <span className="size-3 rounded-full bg-[#28c840]" />
                  </div>

                  <span className="ml-2 hidden font-sans text-xs text-neutral-400 sm:inline-flex sm:items-center sm:gap-2">
                    <Terminal className="size-3.5 text-[#bbf451]" />
                    <span className="text-white font-semibold">myna</span>
                    <span className="text-neutral-500">/</span>
                    <span className="font-medium">live collaborative environment</span>
                  </span>
                </div>

                {/* View switcher & Simulation bar */}
                <div className="flex items-center gap-2">
                  {/* View tabs */}
                  <div className="flex items-center rounded-lg border border-white/10 bg-black/50 p-0.5 text-xs font-sans">
                    <button
                      type="button"
                      onClick={() => setViewMode("split")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition ${
                        viewMode === "split"
                          ? "bg-white/15 text-white shadow-sm font-semibold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Layers className="size-3.5" />
                      <span className="hidden sm:inline">Split View</span>
                      <span className="sm:hidden">Split</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("host")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition ${
                        viewMode === "host"
                          ? "bg-white/15 text-white shadow-sm font-semibold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Terminal className="size-3.5 text-[#c4b5fd]" />
                      <span>Host CLI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("guest")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition ${
                        viewMode === "guest"
                          ? "bg-white/15 text-white shadow-sm font-semibold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Monitor className="size-3.5 text-sky-400" />
                      <span>Browser Guest</span>
                    </button>
                  </div>

                  {/* Simulation button */}
                  <button
                    type="button"
                    onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 font-sans text-xs font-medium transition ${
                      isPlayingDemo
                        ? "border-[#bbf451]/50 bg-[#bbf451]/15 text-[#bbf451]"
                        : "border-white/10 bg-white/[0.05] text-neutral-300 hover:bg-white/[0.1] hover:text-white"
                    }`}
                  >
                    {isPlayingDemo ? (
                      <>
                        <span className="size-1.5 rounded-full bg-[#bbf451] animate-ping" />
                        <span>Live Handshake</span>
                      </>
                    ) : (
                      <>
                        <Play className="size-3" />
                        <span className="hidden sm:inline">Simulate Handshake</span>
                        <span className="sm:hidden">Simulate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Handshake Stepper Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0c0c0e] px-4 py-2.5 text-xs sm:px-6">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#bbf451] opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-[#bbf451]" />
                  </span>
                  <span className="font-sans text-xs text-neutral-300 font-medium">
                    {handshakeStep === 0 && "1/4 Host session started · Waiting for teammates"}
                    {handshakeStep === 1 && "2/4 Guest requesting access via browser link"}
                    {handshakeStep === 2 && "3/4 Host approval requested: Ctrl+] C / V / D"}
                    {handshakeStep === 3 && "4/4 P2P WebRTC DataChannel active · Direct I/O"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setHandshakeStep(step as HandshakeStep)}
                      className={`h-1.5 rounded-full transition-all ${
                        handshakeStep === step
                          ? "w-6 bg-[#bbf451]"
                          : "w-2 bg-white/20 hover:bg-white/40"
                      }`}
                      title={`Jump to step ${step + 1}`}
                      aria-label={`Jump to step ${step + 1}`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setHandshakeStep(3)}
                    className="ml-2 font-sans text-xs text-neutral-400 hover:text-white transition"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Main Showcase Body */}
              <div
                className={`grid min-w-0 ${
                  viewMode === "split"
                    ? "grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-white/10"
                    : "grid-cols-1"
                }`}
              >
                {/* --------------------------------------------------------
                    PANE 1: HOST CLI (EXACT MATCH FOR IMAGE 0)
                    -------------------------------------------------------- */}
                {(viewMode === "split" || viewMode === "host") && (
                  <div className="flex flex-col bg-[#070708] font-mono text-xs">
                    {/* Host tab header */}
                    <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0d0d10] px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Terminal className="size-3.5 text-[#bbf451]" />
                        <span className="font-mono text-xs text-neutral-300">
                          PS C:\Users\miau&gt; myna up
                        </span>
                      </div>
                      <span className="rounded bg-white/[0.06] px-2 py-0.5 font-sans text-[11px] font-medium text-neutral-400">
                        Host PTY
                      </span>
                    </div>

                    {/* Terminal Scroll View */}
                    <div className="min-h-[520px] overflow-x-auto p-4 sm:p-6 text-xs leading-relaxed text-neutral-300">
                      {/* Prompt */}
                      <p className="font-mono text-neutral-400">
                        <span className="text-neutral-500">PS C:\Users\miau&gt; </span>
                        <span className="text-white font-bold">myna up</span>
                      </p>

                      {/* Lavender Block ASCII Art (Clean, Non-wrapping, Exact Match) */}
                      <div className="my-4 text-[#c4b5fd] font-mono text-[11px] sm:text-xs leading-[1.18] select-all drop-shadow-[0_2px_10px_rgba(196,181,253,0.3)]">
                        <pre className="font-mono whitespace-pre">
{`███╗   ███╗██╗   ██╗███╗   ██╗ █████╗ 
████╗ ████║╚██╗ ██╔╝████╗  ██║██╔══██╗
██╔████╔██║ ╚████╔╝ ██╔██╗ ██║███████║
██║╚██╔╝██║  ╚██╔╝  ██║╚██╗██║██╔══██║
██║ ╚═╝ ██║   ██║   ██║ ╚████║██║  ██║
╚═╝     ╚═╝   ╚═╝   ╚═╝  ╚═══╝╚═╝  ╚═╝`}
                        </pre>
                      </div>

                      {/* Header metadata */}
                      <div className="space-y-1 font-mono">
                        <p className="font-bold text-white tracking-wide">
                          ◆ TERMINAL COLLABORATION · v1.1.1
                        </p>
                        <p className="text-neutral-400">
                          Share your terminal. Stay in control.
                        </p>
                        <p className="text-neutral-400 flex items-center gap-3">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-[#c4b5fd]" />
                            Peer-to-peer
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-[#c4b5fd]" />
                            Access control
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-[#c4b5fd]" />
                            Guardrails
                          </span>
                        </p>
                      </div>

                      {/* Horizontal purple line */}
                      <div className="my-3 h-0.5 w-full bg-[#c4b5fd]/40 rounded-full" />

                      <p className="font-mono text-[#4ade80]">
                        [myna] Starting native P2P shell session...
                      </p>
                      <p className="font-mono text-neutral-500 mb-3">PS C:\Users\miau&gt;</p>

                      {/* Session Box (Exact border & content from Image 0) */}
                      <div className="rounded-xl border border-[#22c55e]/40 bg-[#0d140e]/60 p-4 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between border-b border-[#22c55e]/20 pb-2">
                          <p className="font-mono font-bold text-[#4ade80] flex items-center gap-2">
                            <span>◆</span> MYNA / SESSION READY
                          </p>
                          <span className="flex items-center gap-1.5 font-sans text-xs font-semibold text-[#4ade80]">
                            <span className="size-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                            Active
                          </span>
                        </div>

                        <p className="mt-2.5 flex items-center gap-2 font-mono text-[#4ade80] text-xs">
                          <span className="size-1.5 rounded-full bg-[#4ade80]" />
                          Waiting for teammates to request access
                        </p>

                        <div className="mt-3.5 space-y-3 font-mono">
                          {/* Room code */}
                          <div>
                            <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                              ROOM CODE
                            </p>
                            <div className="mt-1 flex items-center justify-between rounded-md bg-black/60 px-3 py-1.5 border border-white/5">
                              <code className="text-[#5eead4] font-semibold tracking-wide">
                                {ROOM_CODE}
                              </code>
                              <button
                                type="button"
                                onClick={() => copyText(ROOM_CODE, "room")}
                                className="text-neutral-400 hover:text-white transition p-1"
                                title="Copy Room Code"
                              >
                                {copiedRoomCode ? (
                                  <Check className="size-3 text-[#5eead4]" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Share link */}
                          <div>
                            <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                              SHARE LINK
                            </p>
                            <div className="mt-1 flex items-center justify-between rounded-md bg-black/60 px-3 py-1.5 border border-white/5">
                              <span className="truncate text-neutral-300 text-xs pr-2">
                                {SHARE_LINK}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyText(SHARE_LINK, "link")}
                                className="text-neutral-400 hover:text-white transition shrink-0 p-1"
                                title="Copy Share Link"
                              >
                                {copiedShareLink ? (
                                  <Check className="size-3 text-[#5eead4]" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Join CLI */}
                          <div>
                            <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                              JOIN FROM ANOTHER TERMINAL
                            </p>
                            <p className="mt-1 text-neutral-300 text-xs">
                              myna join <span className="text-[#5eead4]">{ROOM_CODE}</span>
                            </p>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="my-3 border-t border-[#22c55e]/20" />

                        {/* Host controls */}
                        <div>
                          <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                            HOST CONTROLS
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-300 font-mono">
                            <p>
                              <span className="text-neutral-400">Ctrl+] then </span>
                              <span className="text-[#4ade80] font-bold">C</span> Approve control
                            </p>
                            <p>
                              <span className="text-neutral-400">Ctrl+] then </span>
                              <span className="text-sky-300 font-bold">V</span> Approve view-only
                            </p>
                            <p>
                              <span className="text-neutral-400">Ctrl+] then </span>
                              <span className="text-rose-400 font-bold">D</span> Deny join request
                            </p>
                            <p>
                              <span className="text-neutral-400">Ctrl+] then </span>
                              <span className="text-amber-300 font-bold">F</span> Freeze guest
                            </p>
                            <p>
                              <span className="text-neutral-400">Ctrl+] then </span>
                              <span className="text-neutral-200 font-bold">X</span> Revoke guests
                            </p>
                            <p>
                              <span className="text-neutral-400">Ctrl+] then </span>
                              <span className="text-neutral-200 font-bold">Y/N</span> Guardrails
                            </p>
                          </div>
                        </div>
                      </div>

                      <p className="my-3 text-neutral-400 text-xs font-sans">
                        Your shell stays yours. MYNA runs quietly alongside it.
                      </p>

                      {/* Join Request / Approval Log */}
                      {handshakeStep >= 1 && (
                        <div className="my-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <p className="font-sans font-bold text-amber-300 flex items-center justify-between">
                            <span>JOIN REQUEST · Peer f8df</span>
                            <span className="rounded bg-amber-500/20 px-2 py-0.5 font-sans text-[10px] font-semibold text-amber-200">
                              PENDING
                            </span>
                          </p>
                          <p className="text-neutral-300 mt-1 font-sans text-xs">
                            Requested access:{" "}
                            <span className="text-white font-semibold">
                              {accessMode === "control" ? "control (input & commands)" : "view-only"}
                            </span>
                          </p>
                          <div className="mt-2.5 flex items-center gap-2 font-sans">
                            <button
                              type="button"
                              onClick={() => {
                                setHostApprovedRole("control");
                                setHandshakeStep(3);
                              }}
                              className="rounded-md bg-lime-400/20 border border-lime-400/40 px-2.5 py-1 text-xs font-medium text-lime-300 hover:bg-lime-400/30 transition"
                            >
                              Ctrl+] then <strong className="text-lime-200">C</strong> Control
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setHostApprovedRole("view");
                                setHandshakeStep(3);
                              }}
                              className="rounded-md bg-sky-400/20 border border-sky-400/40 px-2.5 py-1 text-xs font-medium text-sky-300 hover:bg-sky-400/30 transition"
                            >
                              <strong className="text-sky-200">V</strong> View-only
                            </button>
                            <button
                              type="button"
                              onClick={() => setHandshakeStep(0)}
                              className="rounded-md bg-rose-400/20 border border-rose-400/40 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-400/30 transition"
                            >
                              <strong className="text-rose-200">D</strong> Deny
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Approval statement */}
                      {handshakeStep >= 2 && (
                        <div className="my-2 space-y-1 animate-in fade-in duration-300 font-mono">
                          <p className="text-[#4ade80] font-semibold text-xs">
                            ✓ Approved peer f8df with {hostApprovedRole} access.
                          </p>
                          {handshakeStep === 3 && (
                            <>
                              <p className="text-sky-300 text-xs">
                                ↔ P2P WebRTC DataChannel established (Direct · RTT: 18ms)
                              </p>
                              <div className="mt-3 rounded border border-white/10 bg-black/60 p-3 text-xs text-neutral-300 font-mono">
                                <span className="text-[#4ade80]">guest@peer-f8df:~$</span>{" "}
                                <span className="text-white">git status</span>
                                <p className="text-neutral-400 mt-1">
                                  On branch main · Your branch is up to date with &apos;origin/main&apos;.
                                  <br />
                                  nothing to commit, working tree clean
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Cursor */}
                      <div className="mt-4 flex items-center gap-1.5 text-[#4ade80] font-mono">
                        <span>PS C:\Users\miau&gt;</span>
                        <span className="inline-block h-3.5 w-1.5 bg-[#4ade80] animate-terminal-blink" />
                      </div>
                    </div>
                  </div>
                )}

                {/* --------------------------------------------------------
                    PANE 2: BROWSER CLIENT (EXACT MATCH FOR IMAGE 1)
                    Using site font (Poppins) for modern, clean polish
                    -------------------------------------------------------- */}
                {(viewMode === "split" || viewMode === "guest") && (
                  <div className="flex flex-col bg-[#0b0b0e] text-left font-sans">
                    {/* Browser Chrome Window Header with Address Bar */}
                    <div className="border-b border-white/[0.08] bg-[#121216] px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-neutral-500">
                          <LockKeyhole className="size-3 text-emerald-400" />
                        </div>
                        <div className="flex-1 truncate rounded-md bg-black/60 px-3 py-1 font-mono text-xs text-neutral-300 border border-white/5">
                          <span className="text-neutral-500">https://</span>
                          myna-cloudflare-signal.miau.workers.dev
                          <span className="text-[#bbf451]">/#93d58750...</span>
                        </div>
                      </div>
                    </div>

                    {/* Browser Page Body (Matches Image 1 Layout) */}
                    <div className="flex-1 p-5 sm:p-7 flex flex-col justify-between">
                      {/* Sub-header in browser */}
                      <div>
                        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-6">
                          <div className="flex items-center gap-2 font-sans">
                            <span className="text-lime-400 font-bold">&gt;_</span>
                            <span className="text-xs font-bold text-white tracking-wide">
                              MYNA
                            </span>
                            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest pl-1 border-l border-white/10">
                              SHARED TERMINAL
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-sans text-xs">
                            <span className="size-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                            <span className="text-neutral-400 font-medium uppercase tracking-wider">
                              LIVE COLLABORATION
                            </span>
                            <span className="text-neutral-600">|</span>
                            <span className="text-neutral-300 font-medium">BROWSER CLIENT</span>
                          </div>
                        </div>

                        {/* Browser Hero Copy */}
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                          <div>
                            <p className="font-sans text-xs font-semibold uppercase tracking-wider text-[#bbf451]">
                              — TERMINAL, TOGETHER
                            </p>
                            <h2 className="mt-1 font-sans text-2xl font-bold tracking-tight text-white sm:text-3xl leading-tight">
                              Your terminal.
                              <br />
                              Your people.
                            </h2>
                          </div>

                          <div className="font-sans text-xs leading-5 text-neutral-300 sm:text-sm">
                            <p>
                              Join a live terminal session from your browser. Follow
                              along in view-only mode, or request control when you need
                              to work together.
                            </p>
                            <p className="mt-2 text-neutral-200 flex items-center gap-1.5 text-xs font-medium">
                              <ShieldCheck className="size-3.5 text-lime-400" />
                              The host approves access to every session.
                            </p>
                          </div>
                        </div>

                        {/* Join Workspace Card (Faithful to Image 1) */}
                        <div className="rounded-2xl border border-white/10 bg-[#131317]/90 p-5 shadow-xl backdrop-blur-md">
                          {/* Card traffic bar */}
                          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
                            <div className="flex items-center gap-1.5">
                              <span className="size-2 rounded-full bg-[#ff5f56]" />
                              <span className="size-2 rounded-full bg-[#febc2e]" />
                              <span className="size-2 rounded-full bg-[#28c840]" />
                            </div>

                            <span className="font-sans text-xs font-medium text-neutral-400">
                              MYNA &gt; SHARED SESSION
                            </span>

                            <span className="flex items-center gap-1.5 font-sans text-xs font-medium text-[#4ade80]">
                              <span className="size-1.5 rounded-full bg-[#4ade80]" />
                              WebRTC transport
                            </span>
                          </div>

                          {/* Card Heading */}
                          <div className="mb-4">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-white/10 px-1.5 py-0.5 font-sans text-xs font-bold text-white">
                                01
                              </span>
                              <h3 className="font-sans text-base font-semibold text-white">
                                Join a workspace
                              </h3>
                            </div>
                            <p className="mt-1 font-sans text-xs text-neutral-400">
                              Enter the room code shared by your host.
                            </p>
                          </div>

                          {/* Inputs Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            {/* Room Code input */}
                            <div>
                              <label className="block font-sans text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                ROOM CODE
                              </label>
                              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs">
                                <Copy className="size-3.5 text-neutral-400" />
                                <input
                                  type="text"
                                  readOnly
                                  value={ROOM_CODE}
                                  className="w-full bg-transparent font-mono text-xs text-neutral-200 outline-none"
                                />
                              </div>
                              <p className="mt-1 font-sans text-xs text-neutral-400">
                                Use the complete code from your MYNA host.
                              </p>
                            </div>

                            {/* Access Mode dropdown selector */}
                            <div className="relative">
                              <label className="block font-sans text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                ACCESS MODE
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsAccessDropdownOpen(!isAccessDropdownOpen)}
                                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-left text-xs transition hover:border-white/20"
                              >
                                <span className="font-sans text-xs font-medium text-white">
                                  {accessMode === "control"
                                    ? "Control · Interactive access"
                                    : "View only · Follow along"}
                                </span>
                                <ChevronDown className="size-3.5 text-neutral-400" />
                              </button>

                              {isAccessDropdownOpen && (
                                <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-white/15 bg-[#1a1a20] p-1.5 shadow-2xl font-sans">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAccessMode("control");
                                      setIsAccessDropdownOpen(false);
                                    }}
                                    className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10"
                                  >
                                    <span className="font-semibold text-lime-300">
                                      Control · Interactive
                                    </span>
                                    <span className="text-[11px] text-neutral-400">
                                      Send keystrokes & commands directly.
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAccessMode("view");
                                      setIsAccessDropdownOpen(false);
                                    }}
                                    className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10"
                                  >
                                    <span className="font-semibold text-neutral-200">
                                      View only · Follow along
                                    </span>
                                    <span className="text-[11px] text-neutral-400">
                                      Watch output without sending input.
                                    </span>
                                  </button>
                                </div>
                              )}
                              <p className="mt-1 font-sans text-xs text-neutral-400">
                                {accessMode === "control"
                                  ? "Allows you to type directly into host shell."
                                  : "Watch output without sending terminal input."}
                              </p>
                            </div>
                          </div>

                          {/* Action Button & Badges */}
                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            <button
                              type="button"
                              onClick={handleSimulateJoin}
                              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#bbf451] px-5 py-2.5 font-sans text-xs font-bold text-black transition-all hover:bg-[#a5de3d] hover:shadow-[0_0_20px_rgba(187,244,81,0.4)] active:scale-95"
                            >
                              <span>
                                {handshakeStep === 3
                                  ? "Connected to Session"
                                  : "Join session"}
                              </span>
                              <ArrowRight className="size-3.5" />
                            </button>

                            <div className="flex items-center gap-3 font-sans text-xs text-neutral-400 font-medium">
                              <span>No account needed</span>
                              <span>·</span>
                              <span>Approval required</span>
                            </div>
                          </div>

                          {/* Status feedback bar */}
                          <div className="mt-4 border-t border-white/[0.08] pt-3">
                            <p className="flex items-center gap-2 font-sans text-xs text-neutral-300 font-medium">
                              <span className="size-1.5 rounded-full bg-lime-400" />
                              {handshakeStep === 3
                                ? "Connected via WebRTC DataChannel · Zero latency"
                                : "Ready when you are. Enter a room code to get started."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Three trust badges below card (from Image 1) */}
                      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/[0.08] pt-4 font-sans">
                        <div className="flex items-start gap-2.5">
                          <ShieldCheck className="size-4 text-lime-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-white">Host-approved</p>
                            <p className="text-xs text-neutral-400">
                              Your request is reviewed by the host.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <Layers className="size-4 text-sky-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-white">View or control</p>
                            <p className="text-xs text-neutral-400">
                              Choose how you participate.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <Globe className="size-4 text-amber-300 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-white">In your browser</p>
                            <p className="text-xs text-neutral-400">
                              No separate terminal app needed.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Sub-footer inside browser */}
                      <div className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-3 font-sans text-xs text-neutral-400">
                        <span>MYNA / SHARE THE SESSION, NOT THE SETUP</span>
                        <a
                          href="https://github.com/sadSanta-07/myna"
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-white transition flex items-center gap-1 font-medium"
                        >
                          OPEN SOURCE ON GITHUB
                          <ArrowUpRight className="size-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Specs Bar (Seamlessly clipped with rounded-b) */}
              <div className="grid grid-cols-2 divide-x divide-white/[0.08] border-t border-white/[0.08] bg-[#0c0c0f] font-sans text-xs sm:grid-cols-4 rounded-b-[24px] sm:rounded-b-[28px]">
                <div className="p-4 sm:px-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    RAM Footprint
                  </p>
                  <p className="mt-1 font-sans text-base sm:text-lg font-bold text-white tracking-tight">
                    18–25 MB
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    Idle native CLI
                  </p>
                </div>
                <div className="p-4 sm:px-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    P2P Direct Ping
                  </p>
                  <p className="mt-1 font-sans text-base sm:text-lg font-bold text-[#4ade80] tracking-tight">
                    15–35 ms
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    Direct DataChannel
                  </p>
                </div>
                <div className="p-4 sm:px-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    CPU Overhead
                  </p>
                  <p className="mt-1 font-sans text-base sm:text-lg font-bold text-white tracking-tight">
                    &lt; 0.5%
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    During active streaming
                  </p>
                </div>
                <div className="p-4 sm:px-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Isolation
                  </p>
                  <p className="mt-1 font-sans text-base sm:text-lg font-bold text-white tracking-tight">
                    Native or Docker
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    Local container limits
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3.5 text-center font-sans text-xs font-medium text-neutral-500">
              AUTHENTIC MYNA CLIENT SHOWCASE · ZERO CLOUD RELAY · INTERACTIVE WEBRTC SIMULATION
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
