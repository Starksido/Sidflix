"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { FilmTitle } from "@/lib/catalog";
import type { OnlineShowGuide } from "@/lib/online-shows";
import { advancedPlayback, atEpisodeCredits, type CreditMarker } from "@/lib/episode-credits";
import { useThemedSparkPlayer } from "@/components/themed-player";
import { parseAlternativeTvEvent, parseTvPlayerEvent } from "@/lib/remote-tv-events";
import { alternativeTvPlayerUrl, cineTvPlayerUrl, type TvPlaybackProvider } from "@/lib/player-settings";
import { useCineTvController } from "@/components/cine-tv-controller";
import { TvPlaybackBar } from "@/components/tv-playback-bar";
import { remoteKey } from "@/lib/remote-navigation";
import { episodeAutoplay } from "@/lib/episode-autoplay";
import { closePlayer, playEpisodes, playTitle, savePlayback, setEpisodeQueue, setRemoteAutoNext, useEpisodeQueue, useViewerState } from "@/lib/viewer-store";
import { FullscreenPlaybackControls, PlayerViewExit, playerRemoteKey, usePlaybackView } from "@/components/player-view";
import { enterPlaybackView, exitPlaybackView, playbackViewReady } from "@/lib/playback-view";

export function RemoteTvPlayer({ title }: { title: FilmTitle }) {
  const dialog = useRef<HTMLDialogElement>(null), close = useRef<HTMLButtonElement>(null), frame = useRef<HTMLIFrameElement>(null);
  const fullscreenRoot = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const immersive = usePlaybackView();
  const alive = useRef(true), navigating = useRef(false);
  const playback = useRef({ id: "", lastTime: null as number | null, played: false, completed: false });
  const autoplay = useRef<ReturnType<typeof episodeAutoplay> | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => autoplay.current?.poll(Date.now()), 1000);
    return () => { window.clearInterval(timer); autoplay.current?.stop(); autoplay.current = null; };
  }, [title.id]);
  const [guideResult, setGuide] = useState<{ id: string; data: OnlineShowGuide } | null>(null);
  const [creditResult, setCredits] = useState<{ id: string; marker: CreditMarker | null } | null>(null);
  const [failure, setError] = useState<{ id: string; message: string } | null>(null);
  const [busyId, setBusy] = useState<string | null>(null), [fullscreen, setFullscreen] = useState(false);
  const [provider, setProvider] = useState<TvPlaybackProvider>(() => {
    try { const value = window.localStorage.getItem(`sidflix:tv-playback:${title.episode!.seriesId}`); return value === "tv" || value === "alternative" ? value : "standard"; }
    catch { return "standard"; }
  }), [attempt, setAttempt] = useState(0);
  const [barVisible, setBarVisible] = useState(false);
  const barTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [started, setStarted] = useState<string | null>(null);
  const playbackKey = `${title.id}:${provider}:${attempt}`;
  const [parentOrigin] = useState(() => typeof window === "undefined" ? "" : window.location.origin);
  const queue = useEpisodeQueue(), { remoteAutoNext } = useViewerState();
  const episode = title.episode!, id = title.remote!.tmdb;
  const guide = guideResult?.id === title.id ? guideResult.data : null;
  const marker = creditResult?.id === title.id ? creditResult.marker : null;
  const error = failure?.id === title.id ? failure.message : "", busy = busyId === title.id;
  const position = queue.findIndex(item => item.id === title.id);
  const seasons = guide?.seasons.filter(item => episode.season === 0 ? item.number === 0 : item.number > 0) ?? [];
  const seasonPosition = seasons.findIndex(item => item.number === episode.season);
  const hasPrevious = position > 0 || seasonPosition > 0;
  const hasNext = position >= 0 && position < queue.length - 1 || seasonPosition >= 0 && seasonPosition < seasons.length - 1;
  const themed = useThemedSparkPlayer(frame, id, episode, provider === "standard", attempt);
  const cine = useCineTvController(frame, title, attempt);
  const playerUrl = provider === "standard" ? themed.url : provider === "tv" ? cineTvPlayerUrl(id, episode) : alternativeTvPlayerUrl(id, episode, parentOrigin, title.id);
  const receiveCine = cine.receive, pollCine = cine.poll;
  useEffect(() => {
    if (provider !== "tv") return;
    const timer = window.setInterval(pollCine, 1000);
    return () => window.clearInterval(timer);
  }, [provider, pollCine]);
  useEffect(() => () => { if (barTimer.current) clearTimeout(barTimer.current); }, []);
  const showBar = () => { setBarVisible(true); if (barTimer.current) clearTimeout(barTimer.current); barTimer.current = setTimeout(() => setBarVisible(false), 3500); };
  const dismissBar = () => { setBarVisible(false); stage.current?.focus({ preventScroll: true }); };
  const stageKey = (event: KeyboardEvent<HTMLElement>) => {
    if (provider !== "tv") { playerRemoteKey(event); return; }
    if (event.target !== event.currentTarget) return;
    const key = remoteKey(event);
    if (key === "ok") { event.preventDefault(); if (!event.repeat) { if (!immersive) enterPlaybackView(); cine.toggle(); showBar(); } }
    else if (key === "left" || key === "right") { event.preventDefault(); cine.seek(cine.state.time + (key === "right" ? 10 : -10)); showBar(); }
    else if (key === "up" || key === "down") {
      event.preventDefault(); showBar();
      (dialog.current?.querySelector<HTMLButtonElement>(cine.state.ready ? "[data-tv-play]" : "[data-playback-options]"))?.focus({ preventScroll: true });
    }
  };
  useEffect(() => { navigating.current = false; }, [title.id]);

  useEffect(() => {
    alive.current = true;
    void playbackViewReady().then(() => { if (alive.current) { dialog.current?.showModal(); stage.current?.focus({ preventScroll: true }); } });
    const changed = () => setFullscreen(document.fullscreenElement === fullscreenRoot.current);
    document.addEventListener("fullscreenchange", changed);
    return () => { alive.current = false; document.removeEventListener("fullscreenchange", changed); };
  }, []);
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30_000);
    fetch(`/api/tv-shows/${id}?season=${episode.season}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Guide unavailable");
      const data: OnlineShowGuide = await response.json();
      if (!disposed) { setGuide({ id: title.id, data }); setEpisodeQueue(data.episodes, title.id); }
    }).catch(() => { if (!disposed) setError({ id: title.id, message: "Episodes couldn’t be loaded. Please try again." }); }).finally(() => clearTimeout(timer));
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, [id, episode.season, title.id]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/tv-shows/${id}/credits?season=${episode.season}&episode=${episode.number}`, { signal: controller.signal })
      .then(async response => response.ok ? await response.json() as { marker: CreditMarker | null } : { marker: null })
      .then(data => { if (!controller.signal.aborted) setCredits({ id: title.id, marker: data.marker }); })
      .catch(() => { /* Without an exact marker, wait for the actual episode end. */ });
    return () => controller.abort();
  }, [id, episode.season, episode.number, title.id]);

  const navigate = useCallback(async (direction: 1 | -1) => {
    if (navigating.current) return;
    navigating.current = true;
    playback.current.completed = true;
    const next = position >= 0 ? queue[position + direction] : undefined;
    if (next) { playEpisodes(queue, next.id); return; }
    if (!guide) { navigating.current = false; playback.current.completed = false; return; }
    const regular = guide.seasons.filter(item => episode.season === 0 ? item.number === 0 : item.number > 0);
    const current = regular.findIndex(item => item.number === episode.season);
    if (current < 0) { navigating.current = false; playback.current.completed = false; return; }
    setBusy(title.id); setError(null);
    try {
      for (let i = current + direction; i >= 0 && i < regular.length; i += direction) {
        const response = await fetch(`/api/tv-shows/${id}?season=${regular[i].number}`, { signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw new Error("Next season unavailable");
        const data: OnlineShowGuide = await response.json();
        if (!alive.current) return;
        const target = direction > 0 ? data.episodes[0] : data.episodes.at(-1);
        if (target) { playEpisodes(data.episodes, target.id); return; }
      }
      if (alive.current) setError({ id: title.id, message: "There isn’t another episode available yet." });
    } catch { if (alive.current) setError({ id: title.id, message: "The adjacent episode couldn’t be loaded. Please try again." }); }
    finally { navigating.current = false; if (alive.current) setBusy(null); }
  }, [episode.season, guide, id, position, queue, title.id]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      let fromPlayer = false;
      try {
        const player = frame.current?.contentWindow;
        fromPlayer = Boolean(player && (event.source === player || event.source === player.frames[0]));
      } catch { /* Only explicitly supported, current player messages are accepted. */ }
      const value = provider === "tv" ? receiveCine(event) : provider === "standard" ? parseTvPlayerEvent(event.data, event.origin, fromPlayer, title)
        : parseAlternativeTvEvent(event.data, event.origin, event.source === frame.current?.contentWindow, title);
      const current = playback.current;
      if (!value || current.id !== title.id || current.completed) return;
      if (provider === "standard") autoplay.current?.observe(value, Date.now());
      if (value.event === "playerstatus") return;
      const moving = value.event === "timeupdate" && advancedPlayback(current.lastTime, value.time);
      current.lastTime = value.time;
      if (moving && !current.played) { current.played = true; setStarted(playbackKey); }
      if (value.event === "ended" && current.played || moving && remoteAutoNext && hasNext && atEpisodeCredits(marker, value.time, value.duration)) {
        savePlayback(title, 1, value.duration);
        if (remoteAutoNext && hasNext) { current.completed = true; void navigate(1); }
      } else if (moving) savePlayback(title, value.time / value.duration, value.duration);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [hasNext, marker, navigate, remoteAutoNext, title, provider, playbackKey, receiveCine]);

  const changeProvider = (value: TvPlaybackProvider) => {
    try { window.localStorage.setItem(`sidflix:tv-playback:${title.episode!.seriesId}`, value); } catch {}
    autoplay.current?.stop(); autoplay.current = null;
    playback.current = { id: "", lastTime: null, played: false, completed: false };
    setAttempt(attempt => attempt + 1); setProvider(value);
  };

  const fullscreenToggle = () => {
    if (immersive) exitPlaybackView(); else enterPlaybackView();
  };
  const loaded = () => {
    setStarted(null);
    playback.current = { id: title.id, lastTime: null, played: false, completed: false };
    navigating.current = false;
    autoplay.current?.stop();
    autoplay.current = null;
    if (provider === "tv") { cine.load(); stage.current?.focus({ preventScroll: true }); return; }
    if (provider === "alternative") {
      frame.current?.contentWindow?.postMessage({ type: "nxsha:subscribe", version: 1, historyId: title.id }, "https://web.nxsha.app");
      return;
    }
    autoplay.current = episodeAutoplay(command => frame.current?.contentWindow?.postMessage(command, themed.origin), Date.now());
    autoplay.current.poll(Date.now());
  };

  return <dialog ref={dialog} data-player-dialog aria-labelledby="remote-tv-title" onClose={closePlayer}
    onClick={event => { if (event.target === event.currentTarget) closePlayer(); }}
    className="tv-player m-auto max-h-[95dvh] w-[calc(100%-1rem)] max-w-6xl overflow-y-auto rounded-xl bg-surface-1 p-0 text-fg ring-1 ring-white/10 backdrop:bg-black/85 backdrop:backdrop-blur-sm">
    <div ref={fullscreenRoot} className="tv-player-shell">
    <PlayerViewExit />
    {immersive && <FullscreenPlaybackControls disabled={busy} hasNext={hasNext} onNext={() => void navigate(1)} provider={provider} onProviderChange={changeProvider} keepOptionsVisible={started !== playbackKey} />}
    <div className="tv-player-header flex items-start justify-between gap-3 border-b border-white/10 p-4"><div className="min-w-0">
      <p className="text-xs font-semibold text-playback">TV SERIES</p><h2 id="remote-tv-title" className="font-display mt-1 text-xl font-semibold">{episode.seriesTitle}</h2>
      <p className="mt-1 text-sm text-fg-muted">Season {episode.season} · Episode {episode.number} · {episode.name}</p>
    </div><button ref={close} onClick={closePlayer} aria-label="Close player" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">✕</button></div>
    <div className="tv-player-controls flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 text-sm">
      <button disabled={!guide} onClick={() => { if (guide) { closePlayer(); playTitle(guide.show); } }} className="rounded-lg bg-white/10 px-3 py-2 disabled:opacity-40">All episodes</button>
      <button disabled={!hasPrevious || busy} onClick={() => void navigate(-1)} className="rounded-lg bg-white/10 px-3 py-2 disabled:opacity-40">← Previous episode</button>
      <button disabled={!hasNext || busy} onClick={() => void navigate(1)} className="rounded-lg bg-playback px-3 py-2 font-semibold text-ink disabled:opacity-40">Next episode →</button>
      <label className="flex items-center gap-2 text-fg-muted"><input type="checkbox" checked={remoteAutoNext} onChange={event => setRemoteAutoNext(event.target.checked)} className="accent-playback" />Auto-next</label>
      <label htmlFor="tv-playback-option" className="text-fg-muted">Playback option</label>
      <select id="tv-playback-option" value={provider} onChange={event => changeProvider(event.target.value as TvPlaybackProvider)} className="max-w-full rounded-lg bg-surface-2 px-3 py-2">
        <option value="standard">Standard</option><option value="alternative">Alternative 1 · may include ads</option>
        <option value="tv">TV player · remote controls</option>
      </select>
      <button onClick={fullscreenToggle} aria-label="Fullscreen" className="ml-auto rounded-lg bg-white/10 px-3 py-2">Fullscreen</button>
    </div>
    {fullscreen && !immersive && <div className="tv-fullscreen-exit-zone">
      <button onClick={fullscreenToggle} className="tv-fullscreen-exit" aria-label="Exit fullscreen">Exit fullscreen</button>
    </div>}
    <div ref={stage} data-player-stage tabIndex={0} role="group" aria-label={provider === "tv" ? "Episode player. OK plays or pauses, Left and Right seek, Up opens playback controls." : "Episode player. Press OK for fullscreen, Up for episode controls, Down for video controls."} onKeyDown={stageKey} onDoubleClick={enterPlaybackView} className="tv-player-stage player-stage relative bg-black">
      <iframe ref={frame} key={`${provider}-${attempt}-${provider === "tv" ? title.id : ""}`} tabIndex={-1} src={playerUrl} onLoad={loaded} title={`${episode.seriesTitle} S${episode.season} E${episode.number} player`}
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" allow="autoplay *; fullscreen *; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="block aspect-video min-h-[14rem] sm:min-h-[28rem] w-full bg-black" />
      {provider === "tv" && <TvPlaybackBar state={cine.state} visible={barVisible} onActivity={showBar} onDismiss={dismissBar} onToggle={cine.toggle} onSeek={cine.seek} onVolume={cine.volume} onMute={cine.mute} onSpeed={cine.speed} />}
      {busy && <p role="status" className="absolute right-4 bottom-4 rounded-lg bg-black/80 px-4 py-3 text-sm">Loading next episode…</p>}
      {fullscreen && error && <p role="alert" className="absolute right-4 bottom-4 max-w-sm rounded-lg bg-black/80 px-4 py-3 text-sm">{error}</p>}
    </div>
    <div className="tv-player-footer flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4 text-xs text-fg-muted"><div>
      <p>Settle in for the next episode.</p>
      <p className="mt-1">Having trouble? Retry playback or choose another option above.</p>
      {error && <p role="alert" className="mt-2 text-playback">{error}</p>}
    </div><button onClick={() => { autoplay.current?.stop(); autoplay.current = null; playback.current = { id: "", lastTime: null, played: false, completed: false }; navigating.current = false; setAttempt(value => value + 1); }} className="rounded-lg bg-white/10 px-4 py-2">Retry player</button></div>
    </div>
  </dialog>;
}
