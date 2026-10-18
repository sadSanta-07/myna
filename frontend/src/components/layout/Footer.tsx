import {
  ArrowUpRight,
  Code2,
  GitPullRequest,
  Terminal,
} from "lucide-react";
import { PiGithubLogo } from "react-icons/pi";
import { DiscoverButton } from "@/components/block/discover-button";


const navLinks = [
  { href: "#product", label: "Product" },
  { href: "#highlights", label: "Features" },
  { href: "#architecture", label: "Architecture" },
  { href: "#roadmap", label: "Roadmap" },
];

const installCommand = "npm install -g myna-cli";

export function Footer() {
  return (
    <>
      {/* Closing contribution banner */}
      <section className="bg-neutral-50 px-4 py-14 sm:px-6 md:py-20">
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-sm">
          <div className="relative isolate min-h-[340px] overflow-hidden bg-[url('/cta.jpeg')] bg-cover bg-center px-6 py-8 sm:px-10 sm:py-10 md:min-h-[370px] md:px-12">
            {/* Light treatment keeps copy legible while letting cta.jpeg show through */}
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.88)_43%,rgba(255,255,255,0.45)_72%,rgba(255,255,255,0.12)_100%)]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-black/10 to-transparent"
            />

            <div className="flex min-h-[280px] flex-col justify-between gap-9 md:min-h-[290px] md:flex-row md:items-center md:gap-12">
              <div className="max-w-[35rem]">
                <span className="inline-flex items-center gap-2 rounded-full border border-neutral-900/10 bg-white/75 px-3 py-1.5 text-xs font-semibold text-neutral-700 backdrop-blur-md">
                  <span className="size-1.5 rounded-full bg-lime-500" />
                  Built in the open
                </span>

                <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-[1.08] tracking-[-0.045em] text-neutral-950 sm:text-4xl md:text-5xl">
                  Better debugging starts with sharing the real terminal.
                </h2>

                <p className="mt-5 max-w-lg text-sm font-medium leading-7 text-neutral-700 sm:text-base">
                  MYNA lets a teammate join from a browser or CLI, request view
                  or control access, and collaborate over WebRTC. Try it, report
                  a bug, or help improve the project on GitHub.
                </p>

                <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-xl border border-neutral-900/10 bg-white/70 px-3 py-2 font-mono text-xs text-neutral-800 backdrop-blur-md sm:text-sm">
                  <Terminal className="size-4 shrink-0 text-lime-700" />
                  <code className="truncate">{installCommand}</code>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 md:max-w-[260px] md:shrink-0">
                <a
                  href="https://github.com/sadSanta-07/myna"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-12 items-center justify-between gap-3 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
                >
                  <span className="inline-flex items-center gap-2 text-white">
                    <GitPullRequest className="size-4 text-white" />
                    Contribute on GitHub
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-white/70 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>

                <a
                  href="https://www.npmjs.com/package/myna-cli"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-12 items-center justify-between gap-3 rounded-full border border-white/80 bg-white/80 px-5 text-sm font-semibold text-neutral-950 backdrop-blur-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
                >
                  <span className="inline-flex items-center gap-2">
                    <Code2 className="size-4" />
                    Explore npm package
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-neutral-500 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MYNA footer */}
      <footer className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 py-7 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="#product"
            className="inline-flex w-fit items-center gap-2 text-lg font-bold tracking-tight text-neutral-950 transition-opacity hover:opacity-75"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-neutral-950 text-lime-300">
              <Terminal className="size-4" />
            </span>
            MYNA
          </a>

          <div className="flex items-center gap-4">
            <a
              aria-label="MYNA on GitHub"
              href="https://github.com/sadSanta-07/myna"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex size-9 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
            >
              <PiGithubLogo className="size-5" />
            </a>
            <a
              href="https://www.npmjs.com/package/myna-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-950"
            >
              npm package
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </div>

        <nav aria-label="Footer navigation" className="pb-6">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-neutral-500 sm:gap-x-6">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a className="transition hover:text-neutral-950" href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                className="transition hover:text-neutral-950"
                href="https://github.com/sadSanta-07/myna/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Report an issue
              </a>
            </li>
          </ul>
        </nav>

        <div className="flex flex-col gap-2 border-t border-neutral-200/80 py-4 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:text-sm">
          <p>© {new Date().getFullYear()} MYNA. Open source terminal collaboration.</p>
          <a
            href="https://github.com/sadSanta-07/myna"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 transition hover:text-neutral-950"
          >
            <PiGithubLogo className="size-3.5" />
            Built in the open
          </a>
        </div>
      </footer>
    </>
  );
}

export default Footer;
