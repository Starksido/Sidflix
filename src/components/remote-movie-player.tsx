"use client";

import { useEffect, useRef, useState } from "react";
import type { FilmTitle } from "@/lib/catalog";
import { parseTrialAvailability, parseTrialPlayerEvent, trialEmbedUrl, trialInfoUrl } from "@/lib/movie-trial";
import { alternativePlayerUrl, useThemedSparkPlayer } from "@/components/themed-player";
import { closePlayer, savePlayback } from "@/lib/viewer-store";
import { parseVidSparkMovieEvent } from "@/lib/remote-movie-events";
import { PlayerViewExit, playerRemoteKey } from "@/components/player-view";
import { enterPlaybackView, playbackViewReady } from "@/lib/playback-view";
import Link from "next/link";
import { downloadableTitleId } from "@/lib/download-catalog";

type MovieProvider = NonNullable<FilmTitle["remote"]>["provider"];

export function RemoteMoviePlayer({ title }: { title: FilmTitle }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [provider, setProvider] = useState<MovieProvider>("vidspark");
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<{ attempt: number; status: "listed" | "missing" | "unknown"; quality?: string } | null>(null);
  const [progress, setProgress] = useState(false);
  const tmdb = title.remote!.tmdb;
  const current = source?.attempt === attempt ? source : null;
  const protectedPlayer = provider !== "vidsrc";
  const themed = useThemedSparkPlayer(frame, tmdb, undefined, provider === "vidspark", attempt);
  const playerUrl = provider === "vidspark" ? themed.url
    : provider === "embedwave" ? alternativePlayerUrl(tmdb) : trialEmbedUrl({ tmdb });
  const downloadable = downloadableTitleId(title);

  useEffect(() => { let mounted = true; void playbackViewReady().then(() => { if (mounted) { dialog.current?.showModal(); stage.current?.focus({ preventScroll: true }); } }); return () => { mounted = false; }; }, []);
  useEffect(() => {
    if (provider !== "vidspark") return;
    let previous: number | null = null, played = false;
    const onMessage = (event: MessageEvent) => {
      let currentFrame = false;
      try { const player = frame.current?.contentWindow; currentFrame = Boolean(player && (event.source === player || event.source === player.frames[0])); } catch {}
      const value = parseVidSparkMovieEvent(event.data, event.origin, currentFrame, title);
      if (!value) return;
      if (value.event === "timeupdate" && previous !== null && value.time > previous && value.time - previous <= 30) {
        played = true; setProgress(true); savePlayback(title, value.time / value.duration, value.duration);
      } else if (value.event === "ended" && played) savePlayback(title, 1, value.duration);
      previous = value.time;
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [title, provider, attempt]);
  useEffect(() => {
    // These availability/progress checks are specific to VidSrc. Do not use
    // its listing or messages to describe a different player's playback.
    if (provider !== "vidsrc") return;
    let disposed = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    fetch(trialInfoUrl({ tmdb }), { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      if (disposed) return;
      if (response.status === 404) { setSource({ attempt, status: "missing" }); return; }
      if (!response.ok) throw new Error("Unavailable");
      const available = parseTrialAvailability(await response.json(), { tmdb });
      if (!available) throw new Error("Unexpected title");
      if (!disposed) setSource({ attempt, status: "listed", quality: available.quality });
    }).catch(() => { if (!disposed) setSource({ attempt, status: "unknown" }); })
      .finally(() => clearTimeout(timer));
    let first: number | null = null;
    const onMessage = (event: MessageEvent) => {
      const value = parseTrialPlayerEvent(event.data, event.origin, Boolean(frame.current && event.source === frame.current.contentWindow), { tmdb });
      if (!value) return;
      if (value.status === "completed") { savePlayback(title, 1, value.duration); return; }
      if (value.status !== "playing") return;
      if (first === null) first = value.progress;
      if (value.progress > first + 1) { setProgress(true); savePlayback(title, value.progress / value.duration, value.duration); }
    };
    window.addEventListener("message", onMessage);
    return () => { disposed = true; controller.abort(); clearTimeout(timer); window.removeEventListener("message", onMessage); };
  }, [tmdb, title, attempt, provider]);

  return <dialog ref={dialog} data-player-dialog aria-labelledby="remote-movie-title" onClose={closePlayer}
    onClick={(event) => { if (event.target === event.currentTarget) closePlayer(); }}
    className="m-auto max-h-[95dvh] w-[calc(100%-1rem)] max-w-6xl overflow-y-auto rounded-xl bg-surface-1 p-0 text-fg ring-1 ring-white/10 backdrop:bg-black/85 backdrop:backdrop-blur-sm">
    <div className="player-shell"><PlayerViewExit />
    <div className="player-chrome flex items-start justify-between gap-3 border-b border-white/10 p-4">
      <div className="min-w-0"><p className="text-xs font-semibold text-accent">MOVIE</p><h2 id="remote-movie-title" className="font-display mt-1 text-xl font-semibold">{title.title}</h2>
        <p className="mt-1 text-xs text-fg-subtle">{title.year}</p></div>
      <button ref={close} onClick={closePlayer} aria-label="Close player" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">✕</button>
    </div>
    <div className="player-chrome flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 text-sm">
      <button type="button" onClick={enterPlaybackView} className="rounded-lg bg-playback px-3 py-2 font-semibold text-ink">Fullscreen</button>
      {downloadable && <Link prefetch={false} href={`/downloads#download-${downloadable}`} onClick={closePlayer} className="rounded-lg bg-white/10 px-3 py-2">Download</Link>}
      <label htmlFor="remote-player-source" className="text-fg-muted">Playback option</label>
      <select id="remote-player-source" value={provider} onChange={(event) => {
        setProgress(false); setAttempt((value) => value + 1); setProvider(event.target.value as MovieProvider);
      }} className="max-w-full rounded-lg bg-surface-2 px-3 py-2">
        <option value="vidspark">Standard</option>
        <option value="embedwave">Alternative 1 · may include ads</option>
        <option value="vidsrc">Alternative 2 · may open popups</option>
      </select>
    </div>
    <div ref={stage} data-player-stage tabIndex={0} role="group" aria-label="Movie player. Press OK for fullscreen, Up to exit fullscreen, Down for video controls." onKeyDown={playerRemoteKey} onDoubleClick={enterPlaybackView} className="player-stage">
    {!protectedPlayer && current?.status === "missing" ? <div role="alert" className="grid min-h-64 place-content-center gap-3 p-6 text-center text-sm text-fg-muted">
      This movie is unavailable right now. Please try another playback option.
    </div> : <iframe ref={frame} tabIndex={-1} key={`${provider}-${attempt}`} src={playerUrl} title={`${title.title} online player`}
      sandbox={protectedPlayer ? "allow-scripts allow-same-origin allow-forms allow-presentation" : undefined}
      allow="autoplay *; fullscreen *; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy={provider === "embedwave" ? "no-referrer" : "strict-origin-when-cross-origin"}
      className="block aspect-video min-h-[14rem] sm:min-h-[32rem] w-full bg-black" />}</div>
    <div className="player-chrome flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4 text-xs text-fg-muted">
      <div><p role="status">{progress ? "Playing" : current?.status === "missing" ? "Movie unavailable" : "Choose audio, subtitles and picture quality in the player."}</p>
        <p className="mt-1">Having trouble? Retry playback or choose another option above.</p></div>
      <button onClick={() => { setProgress(false); setAttempt((value) => value + 1); }} className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">Retry player</button>
    </div>
    </div></dialog>;
}
