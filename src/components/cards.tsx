"use client";

import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Artwork } from "@/components/artwork";
import {
  formatRuntime,
  formatViewers,
  nicheHue,
  runtimeMinutes,
  type Channel,
  type LiveEvent,
  type Niche,
  type Title,
  type WatchEntry,
} from "@/lib/catalog";
import { playTitle, removeFromWatching, useIsAllowed } from "@/lib/viewer-store";

const frame =
  "relative overflow-hidden rounded-lg bg-surface-2 ring-1 ring-white/10 transition-shadow duration-200 group-hover:ring-2 group-hover:ring-(--hue) group-focus-visible:ring-2 group-focus-visible:ring-(--hue)";

function hueStyle(niche: Niche) {
  return { "--hue": nicheHue[niche] } as CSSProperties;
}

export function MaturityBadge({ maturity }: { maturity: Title["maturity"] }) {
  return (
    <span className="border-line rounded-sm border px-1 text-[0.6875rem] leading-4 font-medium">
      {maturity === "all" ? "All ages" : maturity}
    </span>
  );
}

const subscribeNothing = () => () => {};

/**
 * Match clock for live events. Upcoming ones show kick-off in the viewer's own time
 * zone after hydration; the server-rendered label (UTC) is shown until then.
 */
export function EventStatus({ event }: { event: LiveEvent }) {
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  if (event.isLive || event.startsAt === undefined || !hydrated) return event.status;

  const start = new Date(event.startsAt);
  const time = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (start.toDateString() === new Date().toDateString()) return `Starts ${time}`;
  return `Starts ${start.toLocaleDateString(undefined, { weekday: "short" })} ${time}`;
}

function Meta({ children }: { children: ReactNode }) {
  return (
    <div className="text-fg-subtle mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {children}
    </div>
  );
}

function PlayGlyph() {
  return (
    <span
      aria-hidden
      className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      <svg viewBox="0 0 20 20" className="ml-0.5 size-4 fill-current">
        <path d="M5 3.5v13l11-6.5z" />
      </svg>
    </span>
  );
}

function titleDetails(title: Title): ReactNode {
  if (title.kind === "series") {
    return (
      <>
        <span>{title.year}</span>
        <span>{title.seasons === 1 ? "1 season" : `${title.seasons} seasons`}</span>
      </>
    );
  }
  if (title.kind === "film") {
    return (
      <>
        <span>{title.year}</span>
        <span>{formatRuntime(title.minutes)}</span>
      </>
    );
  }
  return null;
}

export function PosterCard({ title }: { title: Title }) {
  if (!useIsAllowed(title.maturity)) return null;
  return (
    <li className="w-[38vw] max-w-44 shrink-0 snap-start sm:w-40 lg:w-44" style={hueStyle(title.niche)}>
      <button
        type="button"
        onClick={() => playTitle(title)}
        className="group block w-full rounded-lg text-left focus-visible:outline-none"
      >
        <div className={frame}>
          <Artwork title={title} showTitle shape="poster" className="aspect-5/7" />
          <PlayGlyph />
        </div>
        <p className="mt-2 truncate text-sm font-medium">
          <span className="sr-only">Play </span>
          {title.title}
        </p>
        <Meta>
          {titleDetails(title)}
          <MaturityBadge maturity={title.maturity} />
        </Meta>
        {title.kind === "film" && title.director && (
          <p className="text-fg-subtle mt-1 truncate text-xs">Directed by {title.director}</p>
        )}
      </button>
    </li>
  );
}

export function RankedCard({ title, rank }: { title: Title; rank: number }) {
  return (
    <li className="flex shrink-0 snap-start items-end" style={hueStyle(title.niche)}>
      <span
        aria-hidden
        className="font-display text-ink -mr-2 text-[6.5rem] leading-[0.8] font-extrabold tracking-tighter [-webkit-text-stroke:2px_rgb(255_255_255/.55)] font-stretch-condensed md:text-[8rem]"
      >
        {rank}
      </span>
      <button
        type="button"
        onClick={() => playTitle(title)}
        className="group relative w-28 rounded-lg text-left focus-visible:outline-none md:w-36"
      >
        <span className="sr-only">
          Number {rank}: play {title.title}
        </span>
        <div className={frame}>
          <Artwork title={title} showTitle shape="poster" sizes="(min-width: 60rem) 9rem, 7rem" className="aspect-5/7" />
          <PlayGlyph />
        </div>
      </button>
    </li>
  );
}

function LiveBadge({ live, children }: { live: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-semibold ${
        live ? "bg-live text-white" : "bg-black/60 text-fg backdrop-blur-sm"
      }`}
    >
      {live && <span aria-hidden className="animate-live size-1.5 rounded-full bg-white motion-reduce:animate-none" />}
      {children}
    </span>
  );
}

export function LiveCard({ event }: { event: LiveEvent }) {
  if (!useIsAllowed(event.maturity)) return null;
  return (
    <li className="w-[78vw] max-w-96 shrink-0 snap-start sm:w-80 lg:w-96" style={hueStyle("sports")}>
      <button
        type="button"
        onClick={() => playTitle(event)}
        className="group block w-full rounded-lg text-left focus-visible:outline-none"
      >
        <div className={frame}>
          <Artwork title={event} className="aspect-video" />
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            <LiveBadge live={event.isLive}>{event.isLive ? "Live" : <EventStatus event={event} />}</LiveBadge>
            {event.isLive && <LiveBadge live={false}>{event.status}</LiveBadge>}
          </div>
          {event.score && (
            <p className="font-display absolute bottom-2.5 left-3 text-4xl font-bold tracking-tight tabular-nums">
              <span className="sr-only">Score </span>
              {event.score}
            </p>
          )}
          <PlayGlyph />
        </div>
        <p className="mt-2 truncate text-sm font-medium">
          <span className="sr-only">Watch </span>
          {event.title}
        </p>
        <Meta>
          <span>{event.competition}</span>
        </Meta>
      </button>
    </li>
  );
}

export function ChannelCard({ channel }: { channel: Channel }) {
  if (!useIsAllowed(channel.maturity)) return null;
  return (
    <li className="w-[70vw] max-w-80 shrink-0 snap-start sm:w-72 lg:w-80" style={hueStyle("gaming")}>
      <button
        type="button"
        onClick={() => playTitle(channel)}
        className="group block w-full rounded-lg text-left focus-visible:outline-none"
      >
        <div className={frame}>
          <Artwork title={channel} showTitle className="aspect-video" />
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            <LiveBadge live>Live</LiveBadge>
            <LiveBadge live={false}>{formatViewers(channel.viewers)} watching</LiveBadge>
          </div>
          <PlayGlyph />
        </div>
        <div className="mt-2 flex items-start gap-2.5">
          <span
            aria-hidden
            className="font-display grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold text-black"
            style={{ background: channel.art.from }}
          >
            {channel.host.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              <span className="sr-only">Watch </span>
              {channel.title}
            </p>
            <p className="text-fg-subtle truncate text-xs">
              {channel.host} playing {channel.game}
            </p>
          </div>
        </div>
      </button>
    </li>
  );
}

export function ContinueCard({ entry, title }: { entry: WatchEntry; title: Title }) {
  const minutes = runtimeMinutes(title);
  const left = minutes ? Math.max(1, Math.round(minutes * (1 - entry.progress))) : null;
  const percent = Math.round(entry.progress * 100);

  return (
    <li className="group/card relative w-[70vw] max-w-80 shrink-0 snap-start sm:w-72 lg:w-80" style={hueStyle(title.niche)}>
      <button
        type="button"
        onClick={() => playTitle(title)}
        className="group block w-full rounded-lg text-left focus-visible:outline-none"
      >
        <div className={frame}>
          <Artwork title={title} showTitle className="aspect-video" />
          <PlayGlyph />
          <div
            role="progressbar"
            aria-label={`${title.title} progress`}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="absolute inset-x-0 bottom-0 h-1 bg-white/25"
          >
            <div className="bg-accent h-full transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <p className="mt-2 truncate text-sm font-medium">
          <span className="sr-only">Resume </span>
          {title.title}
        </p>
        <Meta>
          {entry.episode !== undefined && (
            <span className="text-fg-muted">
              S{entry.season} E{entry.episode}
            </span>
          )}
          {left !== null && <span>{left} min left</span>}
        </Meta>
      </button>
      <button
        type="button"
        onClick={() => removeFromWatching(title)}
        aria-label={`Remove ${title.title} from Continue watching`}
        className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-black/60 opacity-0 backdrop-blur-sm transition-opacity group-hover/card:opacity-100 hover:bg-black/80 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden>
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}
