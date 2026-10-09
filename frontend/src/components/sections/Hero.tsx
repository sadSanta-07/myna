import { ArrowDown, ArrowRight, ArrowUpRight, ShieldCheck, Terminal } from "lucide-react";
import { PiGithubLogo } from "react-icons/pi";

const terminalLines = [
  { type: "command", text: "$ myna host --container ubuntu:22.04" },
  { type: "success", text: "✓ Container created successfully" },
  { type: "success", text: "✓ Terminal session initialized" },
  { type: "info", text: "↗ Waiting for peer connection..." },
  { type: "connected", text: "✓ Peer connected · WebRTC established" },
  { type: "command", text: "$ whoami" },
  { type: "output", text: "root" },
  { type: "command", text: "$ echo 'hello, from the other side'" },
  { type: "output", text: "hello, from the other side" },
];

export default function Hero() {
  return (
    <section id="product" className="relative isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-screen overflow-hidden"
      >
        <div
          className="h-full w-full bg-[url('/herobg.png')] bg-cover bg-center bg-no-repeat [mask-image:linear-gradient(to_bottom,black_0%,black_95%,transparent_100%)]"
        />
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
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-40" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-700 sm:text-xs">
                Peer-to-peer terminal sharing
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
              Share live terminal sessions with a peer over WebRTC. Keep execution
              inside an isolated Docker environment, not on someone else&apos;s machine.
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

          <div
            id="terminal-preview"
            className="mt-10 w-full max-w-5xl text-left sm:mt-12"
          >
            <div className="myna-terminal overflow-hidden rounded-2xl border border-white/15 shadow-2xl shadow-black/25">
              <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#151515] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="size-2.5 rounded-full bg-[#febc2e]" />
                  <span className="size-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 flex items-center gap-2 font-mono text-[11px] text-neutral-400 sm:text-xs">
                    <Terminal className="size-3.5" />
                    myna — terminal session
                  </span>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-neutral-300">
                  <span className="size-1.5 rounded-full bg-primary" />
                  DEMO SESSION
                </span>
              </div>

              <div className="grid grid-cols-1 border-b border-white/10 sm:grid-cols-3">
                <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:border-b-0 sm:border-r sm:px-5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.06]">
                    <Terminal className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Environment</p>
                    <p className="mt-1 text-xs font-medium text-white">Ubuntu 22.04</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:border-b-0 sm:border-r sm:px-5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.06]">
                    <span className="size-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Connection</p>
                    <p className="mt-1 text-xs font-medium text-white">WebRTC · Demo</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.06]">
                    <ShieldCheck className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Isolation</p>
                    <p className="mt-1 text-xs font-medium text-white">Docker container</p>
                  </div>
                </div>
              </div>

              <div className="min-h-[280px] space-y-2 overflow-x-auto bg-[#090909] px-4 py-6 font-mono text-[11px] leading-6 sm:min-h-[320px] sm:px-7 sm:py-8 sm:text-sm">
                <p className="mb-5 text-neutral-500">MYNA / WORKSPACE / SESSION_01</p>
                {terminalLines.map((line, index) => (
                  <p
                    key={`${line.type}-${index}`}
                    className={`whitespace-pre ${
                      line.type === "command"
                        ? "text-white"
                        : line.type === "success" || line.type === "connected"
                          ? "text-primary"
                          : line.type === "info"
                            ? "text-sky-300"
                            : "text-neutral-400"
                    }`}
                  >
                    {line.text}
                  </p>
                ))}
                <p className="flex items-center gap-2 pt-1 text-primary">
                  <span>root@myna:/workspace#</span>
                  <span className="inline-block h-4 w-2 animate-pulse bg-primary" />
                </p>
              </div>

              <div className="flex flex-col gap-2 border-t border-white/10 bg-[#111111] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="font-mono text-[10px] text-neutral-500">
                  SAMPLE OUTPUT · NOT A LIVE SESSION
                </p>
                <p className="flex items-center gap-2 text-xs text-neutral-400">
                  <ShieldCheck className="size-3.5 text-primary" />
                  Isolated execution environment
                </p>
              </div>
            </div>

            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-600 sm:text-xs">
              One terminal · Two peers · A controlled environment
            </p>
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
