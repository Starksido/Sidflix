"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LibraryVideo } from "@/components/library-video";
import { LiveTvPlayer } from "@/components/live-tv-player";
import { RemoteMoviePlayer } from "@/components/remote-movie-player";
import { RemoteTvPlayer } from "@/components/remote-tv-player";
import { archiveIdentifier, formatRuntime, formatViewers, type Title } from "@/lib/catalog";
import { closePlayer, useNowPlaying } from "@/lib/viewer-store";
import { PlayerViewExit, playerRemoteKey } from "@/components/player-view";
import { enterPlaybackView, playbackViewReady } from "@/lib/playback-view";

// Titles play in their source's official embed player: Twitch channels in Twitch's,
// Internet Archive films in the Archive's. Twitch requires the embedding site's
// hostname as `parent`, so its URL is built in the browser. Videos from your own
// library are plain video files and play in the browser's built-in player.

export function PlayerDialog() {
  const item = useNowPlaying();
  if (!item) return null;

  if (item.kind === "tv-channel") return <LiveTvPlayer title={item} />;
  if (item.kind === "film" && item.remote?.mediaType === "tv" && item.episode) return <RemoteTvPlayer key={item.episode.seriesId} title={item} />;
  if (item.kind === "film" && item.remote) return <RemoteMoviePlayer key={item.id} title={item} />;

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
        frameTitle={`${item.host} live`}
        details={`${item.host} playing ${item.game} · ${formatViewers(item.viewers)} watching`}
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
        details={[item.year, item.minutes !== null ? formatRuntime(item.minutes) : null].filter(Boolean).join(" · ")}
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
      frameTitle={item.title}
      details={[item.year, item.minutes !== null ? formatRuntime(item.minutes) : null].filter(Boolean).join(" · ")}
    />
  );
}

function Player({
  title,
  src,
  media = "frame",
  frameTitle,
  details,
}: {
  title: Title;
  src: string;
  /** "frame" embeds a source's player page; "video" plays a video file directly. */
  media?: "frame" | "video";
  frameTitle: string;
  details: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const failVideo = useCallback(() => setVideoFailed(true), []);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    void playbackViewReady().then(() => { if (mounted) { dialogRef.current?.showModal(); stageRef.current?.focus({ preventScroll: true }); } });
    return () => { mounted = false; };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      data-player-dialog
      aria-labelledby="player-title"
      // Escape closes the dialog natively; the buttons unmount it straight away.
      onClose={closePlayer}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) closePlayer();
      }}
      className="bg-surface-1 text-fg m-auto max-h-[95dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-xl p-0 shadow-2xl shadow-black/60 ring-1 ring-white/10 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      <div className="player-shell"><PlayerViewExit />
      <div ref={stageRef} data-player-stage tabIndex={0} role="group" aria-label="Video player. Press OK for fullscreen." onKeyDown={playerRemoteKey} onDoubleClick={enterPlaybackView} className="player-stage">
      {media === "frame" ? (
        <iframe
          src={src}
          title={frameTitle}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full bg-black"
        />
      ) : videoFailed ? (
        <div className="text-fg-muted grid aspect-video w-full place-content-center gap-4 bg-black px-6 text-center text-sm">
          This video couldn’t be played. Please try again.
          <button className="text-fg mx-auto rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20" onClick={() => setVideoFailed(false)}>Try again</button>
        </div>
      ) : title.kind === "film" && title.local ? (
        <LibraryVideo title={title} onError={failVideo} />
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
      </div>
      <div className="player-chrome flex items-start justify-between gap-4 px-4 py-3 md:px-5 md:py-4">
        <div className="min-w-0">
          <h2 id="player-title" className="font-display truncate text-lg font-semibold tracking-tight">
            {title.title}
          </h2>
          <p className="text-fg-subtle mt-0.5 truncate text-sm">{details}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={enterPlaybackView} className="rounded-lg bg-white/10 px-3 py-2 text-sm">Fullscreen</button>
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
      </div></dialog>
  );
}
