
"use client";

import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  CheckCheck,
  Circle,
  Copy,
  LockKeyhole,
  Monitor,
  Network,
  PackageCheck,
  ShieldCheck,
  Terminal,
  Users,
  Wifi,
} from "lucide-react";
import { PiGithubLogo } from "react-icons/pi";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";
import { DiscoverButton } from "@/components/block/discover-button";

const INSTALL_COMMAND = "npm install -g myna-cli";

const terminalLines = [
  { kind: "muted", text: "MYNA / Host / Session" },
  { kind: "command", text: "$ myna up --sandbox" },
  { kind: "success", text: "✓ Sandbox started · limits configured" },
  { kind: "success", text: "✓ Room code and share link created" },
  { kind: "info", text: "… Waiting for a guest to request access" },
  { kind: "muted", text: "Guest requests: view · control" },
  { kind: "success", text: "✓ Host approves the requested role" },
  { kind: "info", text: "↔ Terminal I/O over WebRTC DataChannel" },
];

function StatusDot({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2 shrink-0 rounded-full ${className}`}
    />
  );
}

export default function Hero() {
  const [installExpanded, setInstallExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [copying, setCopying] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copyInstallCommand() {
    setInstallExpanded(true);
    setCopying(true);
    setCopyError(false);

    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      setCopyError(false);

      if (copyTimer.current) clearTimeout(copyTimer.current);

      copyTimer.current = setTimeout(() => {
        setCopied(false);
      }, 2400);
    } catch {
      setCopied(false);
      setCopyError(true);
    } finally {
      setCopying(false);
    }
  }

  return (
    <section id="product" className="relative isolate">
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

      <div className="relative overflow-hidden px-4 pb-14 pt-28 sm:px-6 sm:pt-32">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center text-center">
          {/* Hero copy */}
          <div className="w-full pt-8 sm:pt-[7vh]">
            <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 shadow-sm">
              <span className="relative flex size-2 shrink-0">
                <span className="relative inline-flex size-2 rounded-full bg-lime-500" />
              </span>

              <span className="font-mono text-xs font-medium text-muted-foreground sm:text-sm">
                Browser-first · peer-to-peer terminal sharing
              </span>
            </div>

            <h1 className="mx-auto max-w-[22rem] text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.055em] text-neutral-950 sm:max-w-4xl sm:text-6xl md:text-7xl lg:text-[82px]">
              Your terminal.
              <br />
              Their screen.
              <br />
              <span className="font-display font-normal italic tracking-[-0.045em]">
                Keep the shell on your machine.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-[23rem] text-sm leading-6 text-neutral-700 sm:mt-6 sm:max-w-2xl sm:text-base sm:leading-7 lg:text-lg">
              Share a live shell through a link. Your teammate joins from a
              browser or CLI, requests view or control access, and connects
              over WebRTC. Choose native mode for trusted teammates or a
              sandbox for stronger isolation.
            </p>

            {/* CTA layout: compact metal button first, expandable command after click */}
            <div className="mx-auto mt-7 flex w-full max-w-[590px] flex-col items-center justify-center gap-3 sm:mt-9 sm:flex-row sm:items-start">
              <div
                className={[
                  "min-w-0 transition-[width,flex-basis] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "w-full sm:w-auto",
                  installExpanded
                    ? "sm:min-w-0 sm:flex-1"
                    : "sm:flex-none",
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
                        className="mx-auto block w-fit max-w-full"
                      >
                        Install MYNA
                      </LiquidMetalButton>
                    </div>
                  ) : (
                    <div
                      className="flex h-[60px] w-full min-w-0 items-center overflow-hidden rounded-full border border-border bg-card p-1 shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-300"
                      aria-label="MYNA installation command"
                    >
                      <code className="min-w-0 flex-1 truncate pl-4 text-left font-mono text-[11px] text-neutral-800 sm:text-[13px]">
                        <span className="mr-2 text-primary">$</span>
                        {INSTALL_COMMAND}
                      </code>

                      <button
                        type="button"
                        onClick={copyInstallCommand}
                        disabled={copying}
                        className="mr-0.5 inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-neutral-950 px-3.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-70 sm:px-4"
                        aria-label="Copy npm install command"
                      >
                        {copied ? (
                          <CheckCheck className="size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                <p
                  className="mt-2 min-h-4 text-center text-[11px] text-neutral-600"
                  role="status"
                  aria-live="polite"
                >
                  {copyError
                    ? "Clipboard access failed. Select the command and copy it manually."
                    : copied
                      ? "Copied! Next run: myna up"
                      : installExpanded
                        ? "Install command · ready to paste"
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

          {/* Product window */}
          <div
            id="terminal-preview"
            className="mt-10 w-full max-w-6xl text-left sm:mt-12"
          >
            <div className="overflow-hidden rounded-xl border border-border bg-terminal shadow-md">
              {/* Window title bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-terminal-surface px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="size-2.5 rounded-full bg-[#febc2e]" />
                  <span className="size-2.5 rounded-full bg-[#28c840]" />

                  <span className="ml-2 flex min-w-0 items-center gap-2 truncate font-mono text-[11px] text-neutral-300 sm:text-xs">
                    <Terminal className="size-3.5 shrink-0 text-primary" />
                    myna / shared session
                  </span>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 font-mono text-xs font-medium text-primary">
                  <StatusDot className="bg-primary" />
                  Product walkthrough
                </span>
              </div>

              {/* Runtime / transport / access */}
              <div className="grid grid-cols-1 divide-y divide-white/10 border-b border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-primary">
                    <Terminal className="size-4" />
                  </div>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">
                      Host runtime
                    </p>
                    <p className="mt-1 text-xs font-medium text-white">
                      Native or sandboxed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-sky-300">
                    <Network className="size-4" />
                  </div>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">
                      Transport
                    </p>
                    <p className="mt-1 text-xs font-medium text-white">
                      WebRTC DataChannel
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-amber-200">
                    <LockKeyhole className="size-4" />
                  </div>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">
                      Access policy
                    </p>
                    <p className="mt-1 text-xs font-medium text-white">
                      Host approves every guest
                    </p>
                  </div>
                </div>
              </div>

              {/* Terminal + guest UI */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(270px,0.8fr)]">
                <div className="min-w-0 border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10">
                  <div className="flex items-center justify-between border-b border-white/[0.07] bg-terminal-surface px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2">
                      <Terminal className="size-3.5 text-primary" />
                      <span className="font-mono text-xs text-muted-foreground">
                        Host · shared shell
                      </span>
                    </div>
                    <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[9px] text-neutral-500">
                      PTY
                    </span>
                  </div>

                  <div className="min-h-[280px] space-y-2 overflow-x-auto bg-terminal px-4 py-5 font-mono text-[10px] leading-5 sm:min-h-[310px] sm:px-5 sm:py-6 sm:text-xs sm:leading-6">
                    {terminalLines.map((line, index) => (
                      <p
                        key={`${line.kind}-${index}`}
                        className={`whitespace-pre ${line.kind === "command"
                            ? "text-white"
                            : line.kind === "success"
                              ? "text-primary"
                              : line.kind === "info"
                                ? "text-sky-300"
                                : line.kind === "muted"
                                  ? "mb-3 text-neutral-600"
                                  : "text-neutral-400"
                          }`}
                      >
                        {line.text}
                      </p>
                    ))}

                    <div className="mt-2 flex items-center gap-2 text-primary">
                      <span>host@myna:~$</span>
                      <span className="inline-block h-3.5 w-1.5 animate-pulse bg-primary" />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] bg-terminal-surface px-4 py-2.5 sm:px-5">
                    <span className="font-mono text-[9px] text-neutral-600">
                      ILLUSTRATIVE TERMINAL OUTPUT
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400">
                      <ShieldCheck className="size-3.5 text-primary" />
                      Sandbox available with <code>--sandbox</code>
                    </span>
                  </div>
                </div>

                {/* Browser guest */}
                <div className="flex min-w-0 flex-col bg-terminal">
                  <div className="flex items-center justify-between border-b border-white/[0.07] bg-terminal-surface px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2">
                      <Monitor className="size-3.5 text-sky-300" />
                      <span className="font-mono text-xs text-muted-foreground">
                        Browser guest
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-primary">
                      <StatusDot className="bg-primary" />
                      Join flow
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
                    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-300/10 text-sky-200">
                            <Users className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white">
                              A teammate wants to join
                            </p>
                            <p className="mt-1 text-[10px] leading-4 text-neutral-500">
                              Open the share link in a browser, then request a
                              role.
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-md border border-amber-300/20 bg-amber-300/[0.07] px-2 py-1 text-[9px] text-amber-200">
                          Pending
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-black/30 px-2.5 py-2 font-mono text-[9px] text-neutral-500">
                        <span className="truncate">
                          https://…/#room-code
                        </span>
                        <Copy className="size-3 shrink-0" />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-medium text-neutral-300">
                          Host selects the role
                        </p>
                        <span className="font-mono text-[9px] text-neutral-600">
                          PERMISSION GATE
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-lime-300/25 bg-primary/[0.07] p-3">
                          <div className="flex items-center gap-2 text-primary">
                            <Check className="size-3.5" />
                            <span className="text-xs font-semibold">
                              Control
                            </span>
                          </div>
                          <p className="mt-2 text-[10px] leading-4 text-neutral-400">
                            Guest can send terminal input.
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                          <div className="flex items-center gap-2 text-neutral-200">
                            <Circle className="size-3.5" />
                            <span className="text-xs font-semibold">View</span>
                          </div>
                          <p className="mt-2 text-[10px] leading-4 text-neutral-400">
                            Guest can watch, not type.
                          </p>
                        </div>
                      </div>

                      <p className="mt-2 text-[9px] leading-4 text-neutral-600">
                        Illustrative UI — access is approved or denied by the
                        host.
                      </p>
                    </div>

                    <div className="mt-auto rounded-xl border border-sky-300/15 bg-sky-300/[0.045] p-3.5">
                      <div className="flex items-center gap-2">
                        <Wifi className="size-4 text-sky-300" />
                        <p className="text-xs font-medium text-white">
                          Peer-to-peer data path
                        </p>
                      </div>

                      <div className="my-3 flex items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20">
                          <Terminal className="size-3.5 text-primary" />
                        </div>
                        <div className="relative h-px flex-1 bg-sky-300/40">
                          <span className="absolute -top-1 right-1 size-2 rounded-full bg-sky-300" />
                        </div>
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20">
                          <Monitor className="size-3.5 text-sky-300" />
                        </div>
                      </div>

                      <p className="text-[10px] leading-4 text-neutral-400">
                        Signaling brokers the handshake. Terminal I/O and
                        resize events travel over the WebRTC DataChannel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Runtime options */}
              <div className="border-t border-white/10 bg-terminal-surface">
                <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
                    No guest install · No account · Host-controlled access
                  </p>
                  <p className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                    <LockKeyhole className="size-3.5 text-primary" />
                    Native shell or isolated sandbox
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-px border-t border-white/[0.07] bg-white/[0.06] sm:grid-cols-3">
                  <div className="bg-terminal-surface px-4 py-3 sm:px-5">
                    <p className="font-mono text-xs font-semibold text-white">
                      Native mode
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-neutral-500">
                      For people you trust.
                    </p>
                  </div>
                  <div className="bg-terminal-surface px-4 py-3 sm:px-5">
                    <p className="font-mono text-xs font-semibold text-white">
                      Docker sandbox
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-neutral-500">
                      Containerized sessions with resource limits.
                    </p>
                  </div>
                  <div className="bg-terminal-surface px-4 py-3 sm:px-5">
                    <p className="font-mono text-xs font-semibold text-white">
                      Linux bubblewrap
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-neutral-500">
                      Namespace-based sandbox option.
                    </p>
                  </div>
                </div>

                {/* Performance figures: validate against PERFORMANCE.md before publishing */}
                <div className="grid grid-cols-2 gap-px border-t border-white/[0.07] bg-white/[0.06] sm:grid-cols-4">
                  <div className="bg-terminal-surface px-4 py-3 sm:px-5">
                    <p className="font-mono text-sm font-semibold text-white">
                      18–25 MB
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-neutral-500">
                      Native CLI idle RAM
                    </p>
                  </div>
                  <div className="bg-terminal-surface px-4 py-3 sm:px-5">
                    <p className="font-mono text-sm font-semibold text-white">
                      &lt; 0.5%
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-neutral-500">
                      CPU during streaming
                    </p>
                  </div>
                  <div className="bg-terminal-surface px-4 py-3 sm:px-5">
                    <p className="font-mono text-sm font-semibold text-white">
                      256 MB
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-neutral-500">
                      Docker sandbox RAM cap
                    </p>
                  </div>
                  <div className="bg-terminal-surface px-4 py-3 sm:px-5">
                    <p className="font-mono text-sm font-semibold text-white">
                      15–50 ms
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-neutral-500">
                      Reported direct P2P ping
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-3 text-center font-mono text-[9px] leading-5 text-neutral-600 sm:text-[10px]">
              PRODUCT WALKTHROUGH · NOT A LIVE SESSION · Performance depends on
              the environment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
