import {
  ArrowUpRight,
  Monitor,
  ShieldCheck,
  Network,
  Sparkles,
} from "lucide-react";

const proofCards = [
  {
    videoSrc: "/video1.webm",
    number: "01",
    label: "HOST + GUEST",
    badge: "Native Streaming",
    title: "One terminal. Two peers.",
    description:
      "Share an interactive terminal session through a simple browser link. The host owns the shell; the guest joins with zero local setup or CLI install.",
    Icon: Monitor,
    accent: "bg-lime-300/40",
    iconColor: "text-neutral-950",
  },
  {
    videoSrc: "/video2.webm",
    number: "02",
    label: "HOST-CONTROLLED ACCESS",
    badge: "Permission Gate",
    title: "You decide who can type.",
    description:
      "Guests request access and the host approves their role in real time. Keep the session view-only or grant full interactive control with instant freeze.",
    Icon: ShieldCheck,
    accent: "bg-sky-200/50",
    iconColor: "text-sky-800",
  },
  {
    videoSrc: "/video3.webm",
    number: "03",
    label: "PEER-TO-PEER TRANSPORT",
    badge: "WebRTC DataChannel",
    title: "Direct low-latency pipes.",
    description:
      "After a brief signaling handshake, terminal I/O travels over a direct WebRTC DataChannel. Sub-30ms typing latency without video call overhead.",
    Icon: Network,
    accent: "bg-violet-200/50",
    iconColor: "text-violet-800",
  },
];

export default function ProofSection() {
  return (
    <section
      id="highlights"
      className="relative overflow-hidden bg-neutral-50 px-4 py-20 sm:px-6 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section heading */}
        <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-600 shadow-sm sm:text-xs">
            <span className="size-2 rounded-full bg-[#bbf451]" />
            What makes MYNA different
          </span>

          <h2 className="text-3xl font-semibold leading-tight tracking-[-0.045em] text-neutral-950 sm:text-4xl md:text-5xl">
            Collaboration that starts
            <br className="hidden sm:block" /> at the real terminal.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-neutral-600 sm:text-base">
            Share the live environment, enforce granular permissions, and collaborate
            without turning your shell into a clunky screen-sharing call.
          </p>
        </div>

        {/* Three feature cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-6">
          {proofCards.map((card) => {
            const Icon = card.Icon;

            return (
              <article
                key={card.number}
                className="group relative min-w-0 overflow-hidden rounded-[26px] border border-neutral-200/90 bg-white p-2.5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/[0.08]"
              >
                {/* Video container */}
                <div
                  className={`relative h-60 overflow-hidden rounded-[20px] ${card.accent} sm:h-64`}
                >
                  <video
                    src={card.videoSrc}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-hidden="true"
                  />

                  {/* Gradient shadow overlay */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />

                  {/* Top badges */}
                  <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                    <span className="rounded-full border border-white/60 bg-white/85 px-3 py-1 font-mono text-[10px] font-semibold tracking-wider text-neutral-900 shadow-sm backdrop-blur-md">
                      {card.number} / 03
                    </span>
                    <span className="rounded-full border border-white/60 bg-white/85 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-neutral-800 shadow-sm backdrop-blur-md">
                      {card.badge}
                    </span>
                  </div>

                  {/* Icon badge */}
                  <div className="absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-2xl border border-white/70 bg-white/90 shadow-md backdrop-blur-md">
                    <Icon className={`size-5 ${card.iconColor}`} />
                  </div>
                </div>

                {/* Card copy */}
                <div className="px-4 pb-5 pt-5 sm:px-5 sm:pb-6">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    {card.label}
                  </p>

                  <h3 className="mt-2.5 text-xl font-semibold leading-snug tracking-[-0.035em] text-neutral-950 sm:text-2xl">
                    {card.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-neutral-600">
                    {card.description}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4">
                    <span className="font-mono text-[11px] font-medium text-neutral-500">
                      MYNA / ARCHITECTURE
                    </span>

                    <a
                      href="https://github.com/sadSanta-07/myna"
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Explore MYNA on GitHub: ${card.title}`}
                      className="flex size-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition-all hover:border-neutral-950 hover:bg-neutral-950 hover:text-white"
                    >
                      <ArrowUpRight className="size-4" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
