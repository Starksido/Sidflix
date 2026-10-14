"use client";

import { useEffect, useState } from "react";
import { nicheHue } from "@/components/cards";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { nicheOrder, niches, type Niche } from "@/lib/catalog";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [activeNiche, setActiveNiche] = useState<Niche | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const frame = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting) setActiveNiche(record.target.id as Niche);
        }
        if (window.scrollY < window.innerHeight * 0.5) setActiveNiche(null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const niche of nicheOrder) {
      const section = document.getElementById(niche);
      if (section) observer.observe(section);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled ? "bg-ink/95 backdrop-blur-md" : "bg-linear-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="px-gutter flex h-16 items-center gap-6 md:h-18">
        <a href="#top" className="flex shrink-0 items-center gap-2 rounded-md" aria-label="Sidflix home">
          <span aria-hidden className="bg-accent grid size-7 place-items-center rounded-md text-black">
            <svg viewBox="0 0 20 20" className="ml-0.5 size-3.5 fill-current">
              <path d="M5 3.5v13l11-6.5z" />
            </svg>
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">Sidflix</span>
        </a>

        <nav aria-label="Browse" className="hidden md:block">
          <NicheLinks activeNiche={activeNiche} />
        </nav>

        <div className="ml-auto">
          <ProfileSwitcher />
        </div>
      </div>

      <nav aria-label="Browse" className="scrollbar-none overflow-x-auto pb-2 md:hidden">
        <NicheLinks activeNiche={activeNiche} compact />
      </nav>
    </header>
  );
}

function NicheLinks({ activeNiche, compact }: { activeNiche: Niche | null; compact?: boolean }) {
  return (
    <ul className={`flex ${compact ? "px-gutter w-max gap-2" : "gap-1"}`}>
      {nicheOrder.map((niche) => {
        const active = niche === activeNiche;
        return (
          <li key={niche}>
            <a
              href={`#${niche}`}
              aria-current={active ? "location" : undefined}
              className={`relative flex items-center gap-2 text-sm font-medium transition-colors ${
                compact
                  ? "rounded-full bg-white/10 px-3 py-1.5"
                  : "rounded-md px-3 py-2 hover:bg-white/10"
              } ${active ? "text-fg" : "text-fg-muted hover:text-fg"}`}
            >
              <span
                aria-hidden
                className={`size-1.5 rounded-full transition-opacity ${active ? "opacity-100" : "opacity-60"}`}
                style={{ background: nicheHue[niche] }}
              />
              {niches[niche].label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
