"use client";

import { useEffect, useRef, useState } from "react";
import { archiveIdentifier, formatRuntime, formatViewers, type Title } from "@/lib/catalog";
import { closePlayer, useNowPlaying } from "@/lib/viewer-store";

// Titles play in their source's official embed player: Twitch channels in Twitch's,
// Internet Archive films in the Archive's. Twitch requires the embedding site's
// hostname as `parent`, so its URL is built in the browser. Videos from your own
// library are plain video files and play in the browser's built-in player.

export function PlayerDialog() {
  const item = useNowPlaying();
  if (!item) return null;

  if (item.kind === "channel") {
    if (!item.twitchLogin) return null;
    const src = new URL("https://player.twitch.tv/");
    src.searchParams.set("channel", item.twitchLogin);
    src.searchParams.set("parent", window.location.hostname);
    src.searchParams.set("autoplay", "true");
    return (
      <Player
        key={item.id}
        title={item}
        src={src.toString()}
        frameTitle={`${item.host} live on Twitch`}
        details={`${item.host} playing ${item.game} · ${formatViewers(item.viewers)} watching`}
        sourceLabel="Open on Twitch"
      />
    );
  }

  if (item.video) {
    return (
      <Player
        key={item.id}
        title={item}
        src={item.video}
        media="video"
        frameTitle={item.title}
        details={`${item.year} · ${formatRuntime(item.minutes)} · Your library`}
        sourceLabel="Open video file"
      />
    );
  }

  const identifier = archiveIdentifier(item);
  if (!identifier) return null;
  return (
    <Player
      key={item.id}
      title={item}
      src={`https://archive.org/embed/${encodeURIComponent(identifier)}`}
      frameTitle={`${item.title} on the Internet Archive`}
      details={`${item.year} · ${formatRuntime(item.minutes)} · Public domain`}
      sourceLabel="Open on Internet Archive"
    />
  );
}

function Player({
  title,
  src,
  media = "frame",
  frameTitle,
  details,
  sourceLabel,
}: {
  title: Title;
  src: string;
  /** "frame" embeds a source's player page; "video" plays a video file directly. */
  media?: "frame" | "video";
  frameTitle: string;
  details: string;
  sourceLabel: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    // showModal focuses the first focusable child, the iframe, and keys pressed in a
    // cross-origin frame never reach this page, so Escape couldn't close the player.
    closeRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="player-title"
      // Escape closes the dialog natively; the buttons unmount it straight away.
      onClose={closePlayer}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) closePlayer();
      }}
      className="bg-surface-1 text-fg m-auto w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-xl p-0 shadow-2xl shadow-black/60 ring-1 ring-white/10 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      {media === "frame" ? (
        <iframe
          src={src}
          title={frameTitle}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full bg-black"
        />
      ) : videoFailed ? (
        <div className="text-fg-muted grid aspect-video w-full place-items-center bg-black px-6 text-center text-sm">
          This video couldn&rsquo;t be played. Check that its link in videos.json works and that it&rsquo;s an MP4
          (H.264) or WebM file.
        </div>
      ) : (
        <video
          src={src}
          aria-label={frameTitle}
          controls
          autoPlay
          playsInline
          onError={() => setVideoFailed(true)}
          className="aspect-video w-full bg-black"
        />
      )}
      <div className="flex items-start justify-between gap-4 px-4 py-3 md:px-5 md:py-4">
        <div className="min-w-0">
          <h2 id="player-title" className="font-display truncate text-lg font-semibold tracking-tight">
            {title.title}
          </h2>
          <p className="text-fg-subtle mt-0.5 truncate text-sm">{details}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {title.source && (
            <a
              href={title.source.href}
              target="_blank"
              rel="noreferrer"
              className="text-fg-muted hover:text-fg hidden rounded-md px-2 py-1.5 text-sm sm:block"
            >
              {sourceLabel}
            </a>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={closePlayer}
            aria-label="Close player"
            className="bg-surface-2 hover:bg-surface-3 grid size-9 place-items-center rounded-full transition-colors"
          >
            <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </dialog>
  );
}
