
import {
    ArrowUpRight,
    Check,
    CircleDashed,
    GitBranch,
    ShieldCheck,
    Terminal,
    Wrench,
    MessageSquare,
    Files,
    Bug,
    Users,
    PackageCheck,
    Globe,
} from "lucide-react";
import DiscoverButton from "../block/discover-button";


const phases = [
    {
        number: "BUILT",
        status: "IMPLEMENTED",
        title: "Share the shell.",
        description:
            "The core experience is here: a teammate can join your real terminal from a browser or the CLI.",
        icon: Terminal,
        state: "done",
        items: [
            "Peer-to-peer terminal streaming",
            "Browser and CLI guest workflows",
            "Host approval and view/control roles",
            "Native shell with optional sandbox backends",
            "Freeze controls, guardrails and audit logging",
        ],
    },
    {
        number: "IN PROGRESS",
        status: "HARDENING",
        title: "Make trust dependable.",
        description:
            "Implementation is ahead of release validation. The priority is closing security gaps and testing real-world behavior.",
        icon: ShieldCheck,
        state: "active",
        items: [
            "Authenticated peer-handshake design",
            "Safe failure behavior for security controls",
            "Rate limits and TURN lifecycle verification",
            "Cross-platform installation testing",
            "Reproducible security test evidence",
        ],
    },
    {
        number: "THE NEXT STEP",
        status: "VALIDATION",
        title: "Learn from real developers.",
        description:
            "Before adding more features, find out whether MYNA solves a real collaboration problem and where the experience breaks down.",
        icon: Users,
        state: "planned",
        items: [
            "Run structured sessions with 8–10 developers",
            "Target joining a prompt in under 60 seconds",
            "Measure how many guests connect without help",
            "Track unprompted repeat use over two weeks",
            "Let repeated user requests guide the next build",
        ],
    },
] as const;

const stateStyles = {
    done: {
        badge: "border-[#bbf451]/50 bg-[#bbf451]/20 text-neutral-900",
        icon: "bg-[#bbf451] text-neutral-950",
        label: "Implemented · Phases 1–9",
    },
    active: {
        badge: "border-sky-200 bg-sky-50 text-sky-800",
        icon: "bg-sky-100 text-sky-800",
        label: "Security & release readiness",
    },
    planned: {
        badge: "border-neutral-200 bg-neutral-100 text-neutral-600",
        icon: "bg-neutral-100 text-neutral-500",
        label: "Validation · Phase 13",
    },
} as const;

const futureIdeas = [
    {
        icon: MessageSquare,
        number: "01",
        tag: "IF DEVELOPERS NEED IT",
        title: "Talk without switching apps",
        description:
            "An ephemeral session chat for quick explanations and debugging context, without accounts or persistent messages.",
    },
    {
        icon: Files,
        number: "02",
        tag: "IF FILE SHARING HELPS",
        title: "Pass around logs and patches",
        description:
            "A careful way to share relevant files during a debugging session, with size limits, integrity checks and safe handling.",
    },
    {
        icon: Bug,
        number: "03",
        tag: "IF DEBUGGING NEEDS IT",
        title: "Go from issue to session",
        description:
            "Bring a bug report into a collaborative terminal session, so teammates can investigate the same problem together.",
    },
    {
        icon: GitBranch,
        number: "04",
        tag: "IF THE EVIDENCE SUPPORTS IT",
        title: "A better debugging handoff",
        description:
            "Explore session context, read-only code viewing and diffs if real users show that these would make collaboration easier.",
    },
] as const;


export default function RoadmapSection() {
    return (
        <section
            id="roadmap"
            className="overflow-hidden bg-white px-4 py-24 sm:px-6 sm:py-32"
        >
            <div className="mx-auto max-w-7xl">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f7f7f3] px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-600">
                            <span className="size-2 rounded-full bg-[#bbf451]" />
                            Where MYNA is headed
                        </div>

                        <h2 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.06] tracking-[-0.055em] text-neutral-950 sm:text-5xl lg:text-6xl">
                            The foundation is here.
                            <br />
                            <span className="font-display font-normal italic">
                                Now let&apos;s make it useful.
                            </span>
                        </h2>
                    </div>

                    <p className="max-w-md text-sm leading-7 text-neutral-600 sm:text-base">
                        The core terminal-sharing experience is built. The next
                        steps are about trust, reliability, and discovering what
                        makes developers want to collaborate with MYNA again.
                    </p>
                </div>

                <div className="relative mt-12 grid gap-4 lg:mt-16 lg:grid-cols-3 lg:gap-5">
                    {phases.map((phase) => {
                        const Icon = phase.icon;
                        const style = stateStyles[phase.state];

                        return (
                            <article
                                key={phase.number}
                                className={`relative flex min-w-0 flex-col rounded-[26px] border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/[0.05] sm:p-7 ${phase.state === "active"
                                    ? "border-neutral-900 bg-[#f7f7f3]"
                                    : "border-neutral-200 bg-white"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div
                                        className={`flex size-12 items-center justify-center rounded-2xl ${style.icon}`}
                                    >
                                        <Icon className="size-5" />
                                    </div>

                                    <span
                                        className={`rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.13em] ${style.badge}`}
                                    >
                                        {phase.status}
                                    </span>
                                </div>

                                <div className="mt-7">
                                    <p className="font-mono text-[10px] tracking-[0.18em] text-neutral-400">
                                        PHASE {phase.number}
                                    </p>

                                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
                                        {phase.title}
                                    </h3>

                                    <p className="mt-3 min-h-14 text-sm leading-6 text-neutral-600">
                                        {phase.description}
                                    </p>
                                </div>

                                <div className="my-6 h-px bg-neutral-200" />

                                <ul className="flex-1 space-y-4">
                                    {phase.items.map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-3 text-sm leading-6 text-neutral-700"
                                        >
                                            <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white">
                                                {phase.state === "done" ? (
                                                    <Check className="size-3 text-neutral-900" />
                                                ) : phase.state === "active" ? (
                                                    <Wrench className="size-3 text-sky-700" />
                                                ) : (
                                                    <CircleDashed className="size-3 text-neutral-400" />
                                                )}
                                            </span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-7 flex items-center justify-between border-t border-neutral-200 pt-5">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                                        {style.label}
                                    </span>

                                    <span
                                        aria-hidden="true"
                                        className="flex size-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500"
                                    >
                                        <ArrowUpRight className="size-4" />
                                    </span>
                                </div>
                            </article>
                        );
                    })}
                </div>

                {/* Future directions */}
                <div className="mt-24 sm:mt-32">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                                Possibilities, not promises
                            </p>
                            <h3 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-neutral-950 sm:text-4xl">
                                What could collaboration become?
                            </h3>
                        </div>

                        <p className="max-w-sm text-sm leading-6 text-neutral-600">
                            These ideas are deliberately on hold. We’ll build only what
                            validation shows developers actually need—not a pile of features
                            for the sake of a roadmap.
                        </p>
                    </div>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {futureIdeas.map((idea) => {
                            const Icon = idea.icon;

                            return (
                                <article
                                    key={idea.number}
                                    className="group rounded-[24px] border border-neutral-200 bg-[#f7f7f3] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:bg-white hover:shadow-lg hover:shadow-black/[0.04] sm:p-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex size-10 items-center justify-center rounded-xl border border-black/[0.06] bg-white text-neutral-800 transition-colors group-hover:bg-[#bbf451]">
                                            <Icon className="size-4" />
                                        </div>
                                        <span className="font-mono text-[10px] text-neutral-400">
                                            {idea.number}
                                        </span>
                                    </div>

                                    <p className="mt-6 font-mono text-[9px] tracking-[0.15em] text-neutral-500">
                                        {idea.tag}
                                    </p>

                                    <h4 className="mt-2 text-lg font-semibold tracking-[-0.035em] text-neutral-950">
                                        {idea.title}
                                    </h4>

                                    <p className="mt-3 text-sm leading-6 text-neutral-600">
                                        {idea.description}
                                    </p>

                                    <div className="mt-5 flex items-center gap-2 text-xs text-neutral-400">
                                        <CircleDashed className="size-3.5" />
                                        <span>Exploring</span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-8 flex flex-col gap-4 rounded-[24px] border border-black/[0.07] bg-[#f7f7f3] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div>
                        <p className="text-base font-semibold text-neutral-950">
                            Have a real problem MYNA should solve?
                        </p>
                        <p className="mt-1 text-sm leading-6 text-neutral-600">
                            Explore the code, share feedback, or contribute an issue.
                        </p>
                    </div>

                    <DiscoverButton
                        href="https://github.com/sadSanta-07/myna"
                        label="Contribute"
                        className="myna-discover-button"
                    />
                </div>
            </div>
        </section>
    );
}
