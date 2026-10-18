
import {
    ArrowUpRight,
    Monitor,
    ShieldCheck,
    Network,
} from "lucide-react";

const proofCards = [
    {
        videoSrc: "/video1.webm",
        number: "01",
        label: "HOST + GUEST",
        title: "One terminal. Two peers.",
        description:
            "Share a terminal session with a teammate through their browser. The host runs the shell; the guest joins without installing a separate terminal client.",
        Icon: Monitor,
        accent: "bg-lime-300",
        iconColor: "text-neutral-950",
    },
    {
        videoSrc: "/video2.webm",
        number: "02",
        label: "HOST-CONTROLLED ACCESS",
        title: "You decide who can type.",
        description:
            "Guests request access, and the host approves their role. Keep a session view-only or grant control when collaboration requires it.",
        Icon: ShieldCheck,
        accent: "bg-sky-100",
        iconColor: "text-sky-700",
    },
    {
        videoSrc: "/video3.webm",
        number: "03",
        label: "PEER-TO-PEER TRANSPORT",
        title: "Built around WebRTC.",
        description:
            "A signaling server helps peers establish a connection. Once connected, terminal input and output travel over a WebRTC DataChannel.",
        Icon: Network,
        accent: "bg-violet-100",
        iconColor: "text-violet-700",
    },
];

export default function ProofSection() {
    return (
        <section
            id="highlights"
            className="overflow-hidden bg-neutral-50 px-4 py-20 sm:px-6 sm:py-24 lg:py-28"
        >
            <div className="mx-auto max-w-7xl">
                {/* Section heading */}
                <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
                    <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-600 shadow-sm sm:text-xs">
                        <span className="size-2 rounded-full bg-lime-400" />
                        What makes MYNA different
                    </span>

                    <h2 className="text-3xl font-semibold leading-tight tracking-[-0.045em] text-neutral-950 sm:text-4xl md:text-5xl">
                        Collaboration that starts
                        <br className="hidden sm:block" /> at the terminal.
                    </h2>

                    <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-neutral-600 sm:text-base">
                        Share the environment, control access, and work together
                        without turning a terminal session into a screen-sharing call.
                    </p>
                </div>

                {/* Three feature cards */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
                    {proofCards.map((card) => {
                        const Icon = card.Icon;

                        return (
                            <article
                                key={card.number}
                                className="group min-w-0 overflow-hidden rounded-[26px] border border-neutral-200/80 bg-white p-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/[0.06]"
                            >
                                {/* Video */}
                                <div
                                    className={`relative h-56 overflow-hidden rounded-[19px] ${card.accent} sm:h-64`}
                                >
                                    <video
                                        src={card.videoSrc}
                                        className="h-full w-full object-cover"
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        preload="metadata"
                                        aria-hidden="true"
                                    />

                                    {/* Subtle overlay for a consistent visual treatment */}
                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.08] to-transparent" />

                                    {/* Card number */}
                                    <span className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 font-mono text-[10px] font-medium tracking-wider text-neutral-800 backdrop-blur-md">
                                        {card.number} / 03
                                    </span>

                                    {/* Icon */}
                                    <div className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-2xl border border-white/60 bg-white/85 shadow-sm backdrop-blur-md">
                                        <Icon className={`size-5 ${card.iconColor}`} />
                                    </div>
                                </div>

                                {/* Card copy */}
                                <div className="px-4 pb-5 pt-5 sm:px-5 sm:pb-6">
                                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                                        {card.label}
                                    </p>

                                    <h3 className="mt-3 text-xl font-semibold leading-snug tracking-[-0.035em] text-neutral-950 sm:text-2xl">
                                        {card.title}
                                    </h3>

                                    <p className="mt-3 text-sm leading-6 text-neutral-600">
                                        {card.description}
                                    </p>

                                    <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
                                        <span className="text-xs font-medium text-neutral-500">
                                            MYNA / CORE
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
