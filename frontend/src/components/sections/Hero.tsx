import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Circle,
  Copy,
  LockKeyhole,
  Monitor,
  Network,
  ShieldCheck,
  Terminal,
  Users,
  Wifi,
} from "lucide-react";
import { PiGithubLogo } from "react-icons/pi";

const terminalLines = [
  { kind: "muted", text: "MYNA  /  HOST  /  SESSION" },
  { kind: "command", text: "$ npm install" },
  { kind: "output", text: "added packages · workspace ready" },
  { kind: "command", text: "$ npx tsx src/host-test.ts" },
  { kind: "success", text: "✓ Disposable Docker shell started" },
  { kind: "success", text: "✓ Room created · join link ready" },
  { kind: "info", text: "… Waiting for a guest to request access" },
];

const benchmarkItems = [
  { value: "< 12 kB", label: "npm download size" },
  { value: "< 40 kB", label: "installed disk size" },
  { value: "~ 21 kB", label: "browser payload" },
  { value: "< 5 MB", label: "container idle RAM*" },
];

function StatusDot({ className = "" }: { className?: string }) {
  return <span className={`inline-block size-2 rounded-full ${className}`} />;
}

export default function Hero() {
  return (
    <section id="product" className="relative isolate">
      {/* Scenic background fades into the white page below. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-screen overflow-hidden"
      >
        <div className="h-full w-full bg-[url('/herobg.png')] bg-cover bg-center bg-no-repeat [mask-image:linear-gradient(to_bottom,black_0%,black_65%,transparent_100%)]" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-white via-white/70 to-transparent"
      />

      <div className="relative overflow-hidden px-4 pb-14 pt-28 sm:min-h-[110vh] sm:px-6 sm:pb-0 sm:pt-32">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center text-center">
          <div className="pt-8 sm:pt-[10vh]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/65 px-3.5 py-2 shadow-sm backdrop-blur-md">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime-500 opacity-40" />
                <span className="relative inline-flex size-2 rounded-full bg-lime-500" />
              </span>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-700 sm:text-xs">
                Browser-first · peer-to-peer terminal sharing
              </span>
            </div>

            <h1 className="mx-auto max-w-[22rem] text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.055em] text-neutral-950 sm:max-w-4xl sm:text-6xl md:text-7xl lg:text-[82px]">
              Your terminal.
              <br />
              Their screen.
              <br />
              <span className="font-display font-normal italic tracking-[-0.035em]">
                Your machine stays yours.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-[22rem] text-sm leading-6 text-neutral-700 sm:mt-6 sm:max-w-2xl sm:text-base sm:leading-7 lg:text-lg">
              Share a live shell through a link. Your teammate joins from a
              browser, requests view or control access, and connects directly to
              your host over WebRTC.
            </p>

            <div className="mx-auto mt-7 flex w-full max-w-[23rem] flex-col items-center justify-center gap-3 sm:mt-9 sm:w-auto sm:max-w-none sm:flex-row">
              <a
                href="#architecture"
                className="myna-button-primary group inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                Explore how it works
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="https://github.com/sadSanta-07/myna"
                target="_blank"
                rel="noreferrer"
                className="myna-button-dark group inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <PiGithubLogo className="size-4" />
                View on GitHub
                <ArrowUpRight className="size-3.5 opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>

          {/* MYNA session showcase: host terminal + browser peer + access gate. */}
          <div id="terminal-preview" className="mt-10 w-full max-w-6xl text-left sm:mt-12">
            <div className="overflow-hidden rounded-[22px] border border-white/15 bg-[#090909] shadow-2xl shadow-black/30 ring-1 ring-black/10">
              {/* Window title bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#151515] px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="size-2.5 rounded-full bg-[#febc2e]" />
                  <span className="size-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 flex items-center gap-2 truncate font-mono text-[11px] text-neutral-300 sm:text-xs">
                    <Terminal className="size-3.5 shrink-0 text-lime-300" />
                    myna / shared session
                  </span>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-lime-200">
                  <StatusDot className="bg-lime-300" />
                  Product walkthrough
                </span>
              </div>

              {/* Session status strip */}
              <div className="grid grid-cols-1 divide-y divide-white/10 border-b border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-lime-300">
                    <Terminal className="size-4" />
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-500">Host environment</p>
                    <p className="mt-1 text-xs font-medium text-white">Disposable Docker shell</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-sky-300">
                    <Network className="size-4" />
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-500">Transport</p>
                    <p className="mt-1 text-xs font-medium text-white">WebRTC DataChannel</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-amber-200">
                    <LockKeyhole className="size-4" />
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-500">Access policy</p>
                    <p className="mt-1 text-xs font-medium text-white">Host approval required</p>
                  </div>
                </div>
              </div>

              {/* Main workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(270px,0.8fr)]">
                {/* Host terminal pane */}
                <div className="min-w-0 border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10">
                  <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#0e0e0e] px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2">
                      <Terminal className="size-3.5 text-lime-300" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-300">Host · container shell</span>
                    </div>
                    <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[9px] text-neutral-500">PTY</span>
                  </div>
                  <div className="min-h-[280px] space-y-2 overflow-x-auto bg-[#080808] px-4 py-5 font-mono text-[10px] leading-5 sm:min-h-[310px] sm:px-5 sm:py-6 sm:text-xs sm:leading-6">
                    {terminalLines.map((line, index) => (
                      <p
                        key={`${line.kind}-${index}`}
                        className={`whitespace-pre ${line.kind === "command"
                          ? "text-white"
                          : line.kind === "success"
                            ? "text-lime-300"
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
                    <div className="mt-2 flex items-center gap-2 text-lime-300">
                      <span>host@myna:~$</span>
                      <span className="inline-block h-3.5 w-1.5 animate-pulse bg-lime-300" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] bg-[#101010] px-4 py-2.5 sm:px-5">
                    <span className="font-mono text-[9px] text-neutral-600">ILLUSTRATIVE TERMINAL OUTPUT</span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400"><ShieldCheck className="size-3.5 text-lime-300" /> Shell runs in container</span>
                  </div>
                </div>

                {/* Guest join / host permission pane */}
                <div className="flex min-w-0 flex-col bg-[#0b0b0b]">
                  <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#0e0e0e] px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2">
                      <Monitor className="size-3.5 text-sky-300" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-300">Browser guest</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-lime-300"><StatusDot className="bg-lime-300" /> Connected flow</span>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
                    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-300/10 text-sky-200"><Users className="size-4" /></div>
                          <div>
                            <p className="text-xs font-medium text-white">A teammate wants to join</p>
                            <p className="mt-1 text-[10px] leading-4 text-neutral-500">Guest opens the share link in a browser. No guest install or account.</p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-md border border-amber-300/20 bg-amber-300/[0.07] px-2 py-1 text-[9px] text-amber-200">Pending</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-black/30 px-2.5 py-2 font-mono text-[9px] text-neutral-500">
                        <span className="truncate">https://myna…/#room-code</span>
                        <Copy className="size-3 shrink-0" />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-medium text-neutral-300">Host chooses the access level</p>
                        <span className="font-mono text-[9px] text-neutral-600">PERMISSION GATE</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-lime-300/25 bg-lime-300/[0.07] p-3">
                          <div className="flex items-center gap-2 text-lime-200"><Check className="size-3.5" /><span className="text-xs font-semibold">Control</span></div>
                          <p className="mt-2 text-[10px] leading-4 text-neutral-400">Guest can send terminal input.</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                          <div className="flex items-center gap-2 text-neutral-200"><Circle className="size-3.5" /><span className="text-xs font-semibold">View</span></div>
                          <p className="mt-2 text-[10px] leading-4 text-neutral-400">Guest can watch, not type.</p>
                        </div>
                      </div>
                      <p className="mt-2 text-[9px] leading-4 text-neutral-600">Illustrated choices — the host must explicitly approve or deny the real request.</p>
                    </div>

                    <div className="mt-auto rounded-xl border border-sky-300/15 bg-sky-300/[0.045] p-3.5">
                      <div className="flex items-center gap-2"><Wifi className="size-4 text-sky-300" /><p className="text-xs font-medium text-white">Peer-to-peer data path</p></div>
                      <div className="my-3 flex items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20"><Terminal className="size-3.5 text-lime-300" /></div>
                        <div className="relative h-px flex-1 bg-sky-300/40"><span className="absolute -top-1 right-1 size-2 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.8)]" /></div>
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20"><Monitor className="size-3.5 text-sky-300" /></div>
                      </div>
                      <p className="text-[10px] leading-4 text-neutral-400">Signaling brokers the handshake. Terminal I/O and resize events travel over the WebRTC DataChannel.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom trust/benchmark bar */}
              <div className="border-t border-white/10 bg-[#111111]">
                <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">No guest install · No account · Host-controlled access</p>
                  <p className="flex items-center gap-1.5 text-[10px] text-neutral-400"><LockKeyhole className="size-3.5 text-lime-300" /> Disposable container · no host files mounted</p>
                </div>
                <div className="grid grid-cols-2 gap-px border-t border-white/[0.07] bg-white/[0.06] sm:grid-cols-4">
                  {benchmarkItems.map((item) => (
                    <div key={item.label} className="bg-[#0d0d0d] px-4 py-3 sm:px-5">
                      <p className="font-mono text-base font-semibold tracking-tight text-white sm:text-lg">{item.value}</p>
                      <p className="mt-1 text-[9px] leading-4 text-neutral-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* <p className="mt-3 text-center font-mono text-[9px] leading-5 text-neutral-600 sm:text-[10px]">
              PRODUCT WALKTHROUGH · NOT A LIVE SESSION · *RAM / RESOURCE-HARDENING FIGURES ARE NOT ENFORCED BY THE CURRENT BUILD
            </p> */}
          </div>

          <a
            href="#architecture"
            className="mt-10 inline-flex items-center gap-2 text-xs text-neutral-700 transition hover:text-black sm:mt-12"
          >
            Discover the architecture
            <ArrowDown className="size-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
