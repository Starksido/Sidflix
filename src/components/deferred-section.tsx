"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNowPlaying } from "@/lib/viewer-store";

/** Retain section order and anchors without loading every collection at startup. */
export function DeferredSection({ anchor, heading, children }: { anchor: string; heading: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const playing = useNowPlaying() !== null;
  useEffect(() => {
    if (revealed || playing || !root.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); }
    }, { rootMargin: "300px 0px" });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [revealed, playing]);
  return <div ref={root} id={revealed ? undefined : anchor} data-deferred-section={anchor} data-remote-placeholder={!revealed ? "" : undefined} tabIndex={!revealed ? 0 : undefined} className="scroll-mt-28">
    {revealed ? children : <section aria-label={heading} className="px-gutter min-h-[26rem] pt-1">
      <h2 className="font-display text-xl font-semibold md:text-2xl">{heading}</h2>
      <div aria-hidden className="mt-4 h-60 rounded-xl bg-white/[.025]" />
    </section>}
  </div>;
}
