
import {
  ArrowDown,
  ArrowRight,
  Check,
  LockKeyhole,
  Monitor,
  Network,
  Terminal,
} from "lucide-react";

const layers = [
  {
    number: "01",
    title: "Host CLI",
    subtitle: "Your machine · Shell stays local",
    detail: "Starts the session and manages terminal input/output.",
    icon: Terminal,
  },
  {
    number: "02",
    title: "Signaling",
    subtitle: "Session discovery · Connection setup",
    detail: "Helps the peers exchange the information needed to connect.",
    icon: Network,
  },
  {
    number: "03",
    title: "WebRTC DataChannel",
    subtitle: "Peer-to-peer · Terminal transport",
    detail: "Carries terminal input and output after connection.",
    icon: ArrowRight,
  },
  {
    number: "04",
    title: "Guest",
    subtitle: "Browser or CLI · Approved access",
    detail: "A teammate joins and uses the permissions granted by the host.",
    icon: Monitor,
  },
];

const principles = [
  {
    icon: LockKeyhole,
    title: "Host stays in control",
    description:
      "Guests request access. The host decides whether to allow viewing or control.",
    tag: "ACCESS POLICY",
  },
  {
    icon: Terminal,
    title: "Execution stays at the host",
    description:
      "MYNA shares terminal interaction rather than moving your shell to a remote server.",
    tag: "LOCAL EXECUTION",
  },
  {
    icon: Network,
    title: "A connection, not a video call",
    description:
      "Terminal I/O travels through a WebRTC DataChannel instead of being streamed as pixels.",
    tag: "TRANSPORT",
  },
];

export default function ArchitectureSection() {
  return (
    <section
      id="architecture"
      className="relative overflow-hidden bg-background px-4 py-24 sm:px-6 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-2 font-mono text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" />
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
            MYNA coordinates the connection, then lets peers exchange terminal
            data over WebRTC. Your shell runs on the host machine, while the
            host retains control over guest access.
          </p>
        </div>

        {/* Architecture diagram */}
        <div className="relative mt-12 overflow-hidden rounded-xl border border-white/10 bg-terminal p-5 text-white shadow-md sm:mt-16 sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.09]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                MYNA / CONNECTION FLOW
              </p>
              <p className="mt-2 text-sm text-neutral-300">
                From local shell to remote collaborator
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 font-mono text-[10px] text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              SESSION FLOW
            </span>
          </div>

          <div className="relative mt-7 grid gap-3 md:grid-cols-4 md:gap-2">
            {layers.map((layer, index) => {
              const Icon = layer.icon;

              return (
                <div key={layer.number} className="relative min-w-0">
                  <article className="h-full rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition-colors hover:border-primary/40 hover:bg-white/[0.07] sm:p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-neutral-500">
                        {layer.number}
                      </span>
                      <div className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-primary">
                        <Icon className="size-4" />
                      </div>
                    </div>

                    <h3 className="mt-5 text-base font-medium tracking-tight">
                      {layer.title}
                    </h3>

                    <p className="mt-2 min-h-10 text-xs leading-5 text-primary/90">
                      {layer.subtitle}
                    </p>

                    <p className="mt-3 text-xs leading-6 text-neutral-400">
                      {layer.detail}
                    </p>
                  </article>

                  {index < layers.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="flex h-8 items-center justify-center text-primary md:absolute md:-right-3 md:top-1/2 md:z-10 md:h-auto md:-translate-y-1/2"
                    >
                      <ArrowRight className="hidden size-4 md:block" />
                      <ArrowDown className="size-4 md:hidden" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="relative mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-black">
              <Check className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Access remains host-controlled</p>
              <p className="mt-1 text-xs leading-5 text-neutral-400">
                The host approves guest permissions before collaboration begins.
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1.5 font-mono text-xs text-muted-foreground">
              Trust boundary
            </span>
          </div>

          <p className="relative mt-4 text-[10px] leading-5 text-neutral-500">
            Conceptual connection flow. Signaling and peer connection setup may
            involve additional steps; this diagram is not a packet-level trace.
          </p>
        </div>

        {/* Design principles */}
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {principles.map((item, index) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-lg border border-black/[0.07] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/[0.04] sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/35 text-neutral-950">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-xs text-neutral-400">
                    0{index + 1}
                  </span>
                </div>

                <p className="mt-6 font-mono text-xs text-muted-foreground">
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
