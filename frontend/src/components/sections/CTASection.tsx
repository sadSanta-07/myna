"use client";

import { ArrowRight, ArrowUpRight, Check, Copy, GitPullRequest, Network, ShieldCheck, Terminal } from "lucide-react";
import { useState } from "react";

const INSTALL_COMMAND = "npm install -g myna-cli";

export default function CTASection() {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function copyInstallCommand() {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  return (
    <section className="border-t border-neutral-200/70 bg-neutral-50 px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-2 shadow-sm">
            <span className="flex size-7 items-center justify-center rounded-full bg-lime-100 text-lime-800">
              <Terminal className="size-4" />
            </span>
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-600 sm:text-xs">
              MYNA · Open-source terminal sharing
            </span>
          </div>
          <p className="text-sm font-medium text-neutral-600">
            Your shell. Your approval. Your choice of isolation.
          </p>
        </div>

        <h2 className="max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.055em] text-neutral-950 sm:text-5xl md:text-6xl">
          Need a second pair of eyes?
          <br className="hidden sm:block" />
          <span className="font-display font-normal italic"> Share the terminal.</span>
        </h2>

        <p className="max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
          Start a session, send your teammate a link, and approve view or control access yourself. Keep your usual shell for trusted collaborators, or choose a sandbox when you need stronger isolation.
        </p>

        <div className="my-2 grid w-full max-w-2xl grid-cols-1 gap-3 border-y border-neutral-200/80 py-5 sm:grid-cols-3 sm:gap-5">
          <div className="flex flex-col items-center gap-2 px-2">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-lime-100 text-neutral-900">
              <Network className="size-5" />
            </span>
            <p className="text-lg font-semibold tracking-tight text-neutral-950">Peer-to-peer</p>
            <p className="text-sm text-neutral-500">Terminal I/O over WebRTC</p>
          </div>
          <div className="flex flex-col items-center gap-2 px-2">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-900">
              <ShieldCheck className="size-5" />
            </span>
            <p className="text-lg font-semibold tracking-tight text-neutral-950">Host-approved</p>
            <p className="text-sm text-neutral-500">Choose view or control</p>
          </div>
          <div className="flex flex-col items-center gap-2 px-2">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-900">
              <Terminal className="size-5" />
            </span>
            <p className="text-lg font-semibold tracking-tight text-neutral-950">3 runtime paths</p>
            <p className="text-sm text-neutral-500">Native, Docker, experimental bwrap</p>
          </div>
        </div>

        <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={copyInstallCommand}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-7 text-sm font-semibold text-white shadow-lg shadow-neutral-950/10 transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 sm:w-auto"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Install command copied" : "Copy install command"}
            {!copied && <ArrowRight className="size-4" />}
          </button>

          <a
            href="https://github.com/sadSanta-07/myna"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-7 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 sm:w-auto"
          >
            <GitPullRequest className="size-4" />
            Explore on GitHub
            <ArrowUpRight className="size-3.5 opacity-60" />
          </a>
        </div>

        <div className="min-h-5" aria-live="polite" role="status">
          {copyFailed ? (
            <p className="text-xs text-rose-700">
              Clipboard access was blocked. Copy this command manually: <code>{INSTALL_COMMAND}</code>
            </p>
          ) : copied ? (
            <p className="text-xs text-green-700">Copied. Next, run <code className="rounded bg-white px-1.5 py-0.5">myna up</code> to start a session.</p>
          ) : (
            <p className="text-xs text-neutral-500">Requires Node.js 22.12+ · Docker is only required for Docker sandbox mode.</p>
          )}
        </div>
      </div>
    </section>
  );
}
