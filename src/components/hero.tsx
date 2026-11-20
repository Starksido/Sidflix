"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Artwork } from "@/components/artwork";
import Link from "next/link";
import { PlayIcon } from "@phosphor-icons/react";
import { EventStatus, MaturityBadge } from "@/components/cards";
import { useCatalog } from "@/components/catalog-provider";
import {
  formatRuntime,
  formatViewers,
  isAllowed,
  type Title,
} from "@/lib/catalog";
import { playTitle, useActiveProfile, useNowPlaying, useViewerState } from "@/lib/viewer-store";
import { isVisibleInBrowse } from "@/lib/library-visibility";

/** How long a feature without a trailer stays up before the carousel moves on. */
const STILL_DURATION = "9s";

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export function Hero() {
  const { featured, getTitle } = useCatalog();
  const profile = useActiveProfile();
  const { watching } = useViewerState();
  const items = featured.flatMap((f) => {
    const title = getTitle(f.id);
    return title && isAllowed(title.maturity, profile.maxMaturity) && isVisibleInBrowse(title) ? [{ ...f, title }] : [];
  });

  const [index, setIndex] = useState(0);
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const [muted, setMuted] = useState(true);
  const [inView, setInView] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const pageVisible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => true,
  );

  const current = items[index % items.length];
  const trailer = current && !failed.includes(current.id) ? current.trailer : undefined;
  const wantsMotion = userPlaying ?? !reducedMotion;
  // The trailer also pauses while a stream plays in the player dialog.
  const playerOpen = useNowPlaying() !== null;
  const running = wantsMotion && inView && pageVisible && !playerOpen;

  const show = (next: number) => {
    setIndex((next + items.length) % items.length);
    setProgress(0);
  };

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([record]) => setInView(record.isIntersecting), {
      threshold: 0.35,
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (!running) {
      video.pause();
      return;
    }
    video.play().catch(() => {
      // Browsers block unmuted autoplay without a recent gesture; fall back to muted.
      if (video.muted) return;
      video.muted = true;
      setMuted(true);
      video.play().catch(() => {});
    });
  }, [running, muted, trailer, current?.id]);

  if (!current) return <>
    <section ref={sectionRef} id="top" aria-label="Featured" className="cinema-hero relative flex items-end overflow-hidden">
      <div className="hero-copy"><p role="status" className="text-fg-muted">Featured titles are temporarily unavailable.</p><Link prefetch={false} href="/movies" className="hero-play mt-5 inline-flex h-11 items-center rounded-md px-6 text-sm font-semibold">Browse movies</Link></div>
    </section>
    <CategoryShortcuts />
  </>;
  const { title } = current;
  const resuming = (watching[profile.id] ?? []).some((e) => e.titleId === title.id);

  return (
    <>
    <section
      ref={sectionRef}
      id="top"
      aria-roledescription="carousel"
      aria-label="Featured"
      className="cinema-hero relative flex items-end overflow-hidden"
    >
      <div key={title.id} className="animate-fade-in absolute inset-0 motion-reduce:animate-none">
        <Artwork title={title} fill eager sizes="100vw" />
        {trailer && (
          <video
            ref={videoRef}
            src={trailer.src}
            muted
            playsInline
            preload="metadata"
            onPlaying={(e) => {
              e.currentTarget.dataset.ready = "true";
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
            }}
            onEnded={() => show(index + 1)}
            onError={() => setFailed((ids) => [...ids, title.id])}
            className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-700 data-ready:opacity-100"
          />
        )}
      </div>

      <div aria-hidden className="absolute inset-0 bg-linear-to-r from-black/85 via-black/40 to-transparent md:via-black/25" />
      <div aria-hidden className="to-ink absolute inset-x-0 bottom-0 h-48 bg-linear-to-b from-transparent" />

      <div
        key={`copy-${title.id}`}
        className="hero-copy animate-fade-in relative w-full motion-reduce:animate-none"
      >
        <div className="max-w-xl">
          <p className="hero-eyebrow flex items-center gap-2 text-sm font-medium">
            SIDFLIX <span className="text-white/60">{title.kind === "tv-channel" ? "LIVE" : "SPOTLIGHT"}</span>
            {((title.kind === "live" && title.isLive) || title.kind === "tv-channel") && (
              <span className="bg-live ml-1 rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-semibold">Live</span>
            )}
          </p>

          <h2 className="hero-title mt-3 text-balance">{title.title}</h2>

          <div className="text-fg-muted mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <MaturityBadge maturity={title.maturity} />
            <HeroFacts title={title} />
          </div>

          <p className="hero-synopsis text-fg-muted mt-3 line-clamp-2 max-w-[34rem] text-sm md:text-base">{title.synopsis}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => playTitle(title)}
              className="hero-play flex h-11 items-center gap-2.5 rounded-md px-6 text-sm font-semibold transition-colors"
            >
              <PlayIcon size={18} weight="fill" aria-hidden />
              {primaryLabel(title, resuming)}
            </button>
          </div>

        </div>
      </div>

      <div className="hero-pagination absolute inset-x-0 bottom-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5" role="group" aria-label="Choose a feature">
          {items.map((item, i) => {
            const active = i === index % items.length;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={`Show ${item.title.title}`}
                aria-current={active ? "true" : undefined}
                onClick={() => show(i)}
                className="group flex h-6 items-center"
              >
                <span className={`relative block h-[3px] overflow-hidden rounded-full bg-white/30 transition-[width] duration-300 ${active ? "w-10" : "w-5 group-hover:bg-white/50"}`}>
                  {active && item.trailer && !failed.includes(item.id) && (
                    <span className="bg-fg absolute inset-0 origin-left" style={{ transform: `scaleX(${progress})` }} />
                  )}
                  {active && (!item.trailer || failed.includes(item.id)) && (
                    <span
                      key={`${item.id}-${index}`}
                      className="bg-fg animate-tick absolute inset-0 origin-left motion-reduce:animate-none"
                      style={{
                        ["--tick-duration" as string]: STILL_DURATION,
                        animationPlayState: running ? "running" : "paused",
                      }}
                      onAnimationEnd={() => show(index + 1)}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            label={wantsMotion ? "Pause previews" : "Play previews"}
            onClick={() => setUserPlaying(!wantsMotion)}
          >
            {wantsMotion ? (
              <path d="M6 4h3v12H6zM11 4h3v12h-3z" />
            ) : (
              <path d="M6 3.5v13l10-6.5z" />
            )}
          </IconButton>
          {trailer && (
            <IconButton label={muted ? "Unmute trailer" : "Mute trailer"} onClick={() => setMuted(!muted)}>
              <path d="M3 7.5h3l4-3.5v12l-4-3.5H3z" />
              {muted ? (
                <path d="M13 7.5l4 5M17 7.5l-4 5" fill="none" />
              ) : (
                <path d="M13.5 7a4 4 0 010 6M15.5 5a7 7 0 010 10" fill="none" />
              )}
            </IconButton>
          )}
        </div>
      </div>
    </section>
    <CategoryShortcuts />
    </>
  );
}

function CategoryShortcuts() {
  return <nav aria-label="Discover categories" className="category-strip scrollbar-none" data-remote-row>
    {[["New & essential", "/movies"], ["Binge worthy", "/tv-shows"], ["Anime", "/anime"], ["Genres", "/#genres"], ["Live TV", "/#live-tv"], ["Indie films", "/#indie"]].map(([label, href]) => <Link prefetch={false} key={label} href={href}><span>{label}</span></Link>)}
  </nav>;
}

function HeroFacts({ title }: { title: Title }) {
  switch (title.kind) {
    case "series":
      return (
        <>
          {title.year !== null && <span>{title.year}</span>}
          <span>{title.seasons === 1 ? "1 season" : `${title.seasons} seasons`}</span>
        </>
      );
    case "film":
      return (
        <>
          {title.year !== null && <span>{title.year}</span>}
          {title.minutes !== null && <span>{formatRuntime(title.minutes)}</span>}
          {title.director && <span>Directed by {title.director}</span>}
        </>
      );
    case "live":
      return (
        <>
          <span>{title.competition}</span>
          <span className="text-fg tabular-nums">
            {title.score && `${title.score} at `}
            <EventStatus event={title} />
          </span>
        </>
      );
    case "tv-channel":
      return <><span>{title.language}</span><span>{title.category === "movies" ? "Movie channel" : "Sports channel"}</span></>;
    case "channel":
      return (
        <>
          <span>{title.host}</span>
          <span>{formatViewers(title.viewers)} watching now</span>
        </>
      );
  }
}

function primaryLabel(title: Title, resuming: boolean): string {
  if (title.kind === "live" || title.kind === "tv-channel") return "Watch live";
  if (title.kind === "channel") return "Watch stream";
  return resuming ? "Resume" : "Play";
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-full bg-black/40 ring-1 ring-white/40 backdrop-blur-sm transition-colors hover:bg-white/15"
    >
      <svg
        viewBox="0 0 20 20"
        aria-hidden
        className="size-4"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}
