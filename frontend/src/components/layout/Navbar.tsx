"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { PiGithubLogo } from "react-icons/pi";
import Image from "next/image";


const NAV_LINKS = [
  { id: "product", label: "Product" },
  { id: "architecture", label: "Architecture" },
  { id: "roadmap", label: "Roadmap" },
];

export default function Navbar() {
  const [active, setActive] = useState("product");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const sections = NAV_LINKS
      .map(({ id }) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );

        if (visibleSections[0]) {
          setActive(visibleSections[0].target.id);
        }
      },
      {
        rootMargin: "-15% 0px -65% 0px",
        threshold: 0,
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="fixed inset-x-0 top-5 z-50 flex justify-center px-4 sm:top-7">
      <nav
        aria-label="Main navigation"
        className="relative flex h-14 w-full max-w-5xl items-center justify-between rounded-full border border-black/8 bg-white/80 px-4 text-foreground shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-4xl sm:px-5"
      >
        {/* Brand */}
        <Link
          href="/"
          onClick={closeMenu}
          aria-label="MYNA home"
          className="group flex shrink-0 items-center gap-2"
        >
          <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-black">
            <Image
              src="/myna.jpg"
              alt="MYNA logo"
              fill
              priority
              sizes="80px"
              className="object-cover"
            />
          </div>

          <span className="font-brand text-lg tracking-wide">
            MYNA
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? "location" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${active === id
                  ? "bg-primary text-black"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                }`}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/sadSanta-07/myna"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-black sm:inline-flex"
          >
            <PiGithubLogo className="size-4" />
            <span>GitHub</span>
            <ArrowUpRight className="size-3.5 text-neutral-400" />
          </a>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex size-10 items-center justify-center rounded-full border border-neutral-200 transition hover:bg-neutral-100 md:hidden"
          >
            {isMenuOpen ? (
              <X className="size-4" />
            ) : (
              <Menu className="size-4" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile navigation */}
      {isMenuOpen && (
        <div className="absolute inset-x-4 top-[calc(100%+10px)] rounded-3xl border border-black/8 bg-white/95 p-3 shadow-xl backdrop-blur-2xl md:hidden">
          <div className="mb-2 px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
              Navigate
            </p>
          </div>

          {NAV_LINKS.map(({ id, label }, index) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={closeMenu}
              className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-medium transition ${active === id
                  ? "bg-primary text-black"
                  : "text-neutral-700 hover:bg-neutral-100"
                }`}
            >
              <span>{label}</span>
              <span className="font-mono text-xs opacity-50">
                0{index + 1}
              </span>
            </a>
          ))}

          <div className="my-3 border-t border-neutral-200" />

          <a
            href="https://github.com/sadSanta-07/myna"
            target="_blank"
            rel="noreferrer"
            onClick={closeMenu}
            className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            <span className="flex items-center gap-2">
              <PiGithubLogo className="size-4" />
              View source on GitHub
            </span>
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      )}
    </header>
  );
}