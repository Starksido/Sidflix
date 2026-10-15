"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RailProps = {
  id?: string;
  heading: ReactNode;
  description?: string;
  /** Niche colour for the heading marker, e.g. "var(--color-anime)". */
  hue?: string;
  /** Gap between items, as a Tailwind class. */
  gapClassName?: string;
  children: ReactNode;
};

export function Rail({
  id,
  heading,
  description,
  hue,
  gapClassName = "gap-3 md:gap-4",
  children,
}: RailProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const headingId = id ? `${id}-heading` : undefined;

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => {
      const max = list.scrollWidth - list.clientWidth;
      setEdges({ start: list.scrollLeft <= 4, end: list.scrollLeft >= max - 4 });
    };
    list.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    for (const child of list.children) observer.observe(child);
    return () => {
      list.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [children]);

  const page = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({ left: direction * list.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section id={id} aria-labelledby={headingId} className="group/rail relative scroll-mt-24 has-[>ul:empty]:hidden">
      <div className="px-gutter mb-3 flex items-end justify-between gap-4 md:mb-4">
        <div>
          <h2
            id={headingId}
            className="font-display flex items-center gap-2.5 text-xl font-semibold tracking-tight md:text-2xl"
          >
            {hue && (
              <span aria-hidden className="h-4 w-1 rounded-full" style={{ background: hue }} />
            )}
            {heading}
          </h2>
          {description && <p className="text-fg-muted mt-1 text-sm">{description}</p>}
        </div>
        <div className="hidden gap-2 [@media(hover:hover)]:md:flex">
          <PageButton label="Scroll back" disabled={edges.start} onClick={() => page(-1)} flip />
          <PageButton label="Scroll forward" disabled={edges.end} onClick={() => page(1)} />
        </div>
      </div>
      <ul
        ref={listRef}
        className={`px-gutter scroll-px-gutter scrollbar-none relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain pt-1 pb-2 ${gapClassName}`}
      >
        {children}
      </ul>
    </section>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  flip,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  flip?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="bg-surface-2 hover:bg-surface-3 grid size-9 place-items-center rounded-full transition-colors disabled:opacity-30"
    >
      <svg viewBox="0 0 20 20" className={`size-4 ${flip ? "rotate-180" : ""}`} aria-hidden>
        <path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
