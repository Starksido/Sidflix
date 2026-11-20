"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type Hls from "hls.js";
import { isAllowed, type TvChannel } from "@/lib/catalog";
import { closePlayer, playTitle, useActiveProfile } from "@/lib/viewer-store";

export function LiveTvPlayer({ title }: { title: TvChannel }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [channels, setChannels] = useState<TvChannel[]>([title]);
  const profile = useActiveProfile();
  useEffect(() => {
    dialog.current?.showModal();
    close.current?.focus();
    const controller = new AbortController();
    fetch("/api/live-tv/channels", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Unavailable"); return response.json(); })
      .then((data: { channels: TvChannel[] }) => setChannels(data.channels))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="live-tv-player-title" onClose={closePlayer}
      onClick={(event) => { if (event.target === event.currentTarget) closePlayer(); }}
      className="bg-surface-1 text-fg m-auto max-h-[95dvh] w-[calc(100%-1rem)] max-w-7xl overflow-y-auto rounded-xl p-0 ring-1 ring-white/10 backdrop:bg-black/85 backdrop:backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div><p className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Sidflix · Live TV</p>
          <h2 id="live-tv-player-title" className="font-display mt-1 text-xl font-semibold">{title.title}</h2></div>
        <button ref={close} aria-label="Close player" onClick={closePlayer} className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">✕</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0"><LiveVideo key={title.id} title={title} />
          <div className="space-y-1 px-5 py-4 text-sm text-fg-muted">
            <p>{title.language} · {title.country}</p>
            <p className="text-xs text-fg-subtle">Join the programme currently on air.</p>
          </div>
        </div>
        <aside aria-label="Live TV channels" className="min-w-0 border-t border-white/10 p-3 lg:border-t-0 lg:border-l">
          <h3 className="px-2 py-2 text-sm font-semibold">Switch channel</h3>
          <div className="flex max-h-96 gap-2 overflow-auto lg:max-h-[33rem] lg:flex-col">
            {channels.filter((channel) => isAllowed(channel.maturity, profile.maxMaturity)).sort((a, b) => Number(b.category === title.category) - Number(a.category === title.category)).map((channel) => (
              <button key={channel.id} onClick={() => playTitle(channel)} aria-pressed={channel.id === title.id}
                className="flex min-w-48 shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-white/10 aria-pressed:bg-emerald-400/15 aria-pressed:ring-1 aria-pressed:ring-emerald-400/40 lg:min-w-0">
                {channel.logo && <Image src={channel.logo} alt="" width={48} height={32} className="h-8 w-12 shrink-0 object-contain" />}
                <span className="min-w-0"><span className="block font-medium">{channel.title}</span><span className="text-fg-subtle block text-xs">{channel.category === "movies" ? "Movies" : "Sports"} · {channel.language}</span></span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </dialog>
  );
}

function LiveVideo({ title }: { title: TvChannel }) {
  const [attempt, setAttempt] = useState(0);
  return <StreamVideo key={attempt} title={title} retry={() => setAttempt((value) => value + 1)} />;
}

function StreamVideo({ title, retry }: { title: TvChannel; retry: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const engine = useRef<Hls | null>(null);
  const [status, setStatus] = useState("Connecting to channel…");
  const [failed, setFailed] = useState<string | null>(null);
  const [qualities, setQualities] = useState<{ id: number; label: string }[]>([]);
  const [quality, setQuality] = useState(-1);
  const [captions, setCaptions] = useState<{ id: number; label: string }[]>([]);
  const [caption, setCaption] = useState(-1);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let cancelled = false;
    let source = 0;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout>;
    const play = () => element.play().catch(() => { if (!cancelled) setStatus("Press play to watch"); });
    const connect = async () => {
      if (cancelled) return;
      const current = ++generation;
      clearTimeout(timer);
      engine.current?.destroy();
      engine.current = null;
      const url = title.streamUrls[source++];
      if (!url) { setFailed("This channel is unavailable. Try again or choose another channel."); return; }
      setQualities([]);
      setQuality(-1);
      setCaptions([]);
      setCaption(-1);
      setStatus(source > 1 ? "Reconnecting…" : "Connecting to channel…");
      const next = () => { if (!cancelled) void connect(); };
      timer = setTimeout(next, 40_000);
      try {
        const { default: Hls } = await import("hls.js");
        if (cancelled || generation !== current) return;
        if (Hls.isSupported()) {
          const hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 20, backBufferLength: 30,
            manifestLoadingTimeOut: 12_000, levelLoadingTimeOut: 12_000 });
          engine.current = hls;
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (cancelled || engine.current !== hls) return;
            setQualities(hls.levels.map((level, id) => ({ id, label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps` })));
            void play();
          });
          hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
            if (!cancelled && engine.current === hls) setCaptions(hls.subtitleTracks.map((track, id) => ({ id, label: track.name || track.lang || `Track ${id + 1}` })));
          });
          hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal && engine.current === hls) next(); });
          hls.attachMedia(element);
          hls.loadSource(url);
        } else if (element.canPlayType("application/vnd.apple.mpegurl")) {
          element.src = url;
          element.addEventListener("error", next, { once: true });
          void play();
        } else {
          clearTimeout(timer);
          setFailed("This browser does not support live video. Try a current version of Edge, Chrome or Safari.");
        }
      } catch { next(); }
    };
    const playing = () => clearTimeout(timer);
    element.addEventListener("playing", playing);
    void connect();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      element.removeEventListener("playing", playing);
      engine.current?.destroy();
      engine.current = null;
      element.pause();
      element.removeAttribute("src");
      element.load();
    };
  }, [title]);

  const goLive = () => {
    const element = video.current;
    if (!element) return;
    const edge = engine.current?.liveSyncPosition;
    if (typeof edge === "number" && Number.isFinite(edge)) element.currentTime = edge;
    else if (element.seekable.length) element.currentTime = Math.max(element.seekable.start(0), element.seekable.end(element.seekable.length - 1) - 3);
    void element.play().catch(() => setStatus("Press play to watch"));
  };
  return (
    <>
      <div className="relative aspect-video bg-black">
        <video ref={video} aria-label={`${title.title} live stream`} controls autoPlay playsInline crossOrigin="anonymous"
          onPlaying={() => setStatus("Playing live TV")}
          onWaiting={() => setStatus("Buffering…")}
          onPause={() => { if (!failed) setStatus("Paused"); }}
          className="h-full w-full" />
        {failed && <div role="alert" className="absolute inset-0 grid place-content-center gap-4 bg-black/90 px-8 text-center text-sm">
          <p>{failed}</p><button onClick={retry} className="mx-auto rounded-lg bg-white/15 px-5 py-2 hover:bg-white/25">Try again</button>
        </div>}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 text-xs">
        <button onClick={goLive} disabled={Boolean(failed)} className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 hover:bg-white/20 disabled:opacity-40"><span className="size-2 rounded-full bg-red-500" />Go live</button>
        <p role="status" className="mr-auto text-fg-muted">{failed ? "Channel unavailable" : status}</p>
        {qualities.length > 1 && <label className="flex items-center gap-2">Quality<select aria-label="Stream quality" value={quality} onChange={(event) => {
          const level = Number(event.target.value); setQuality(level); if (engine.current) engine.current.currentLevel = level;
        }} className="rounded bg-surface-2 px-2 py-2"><option value={-1}>Auto</option>{qualities.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
        {captions.length > 0 && <label className="flex items-center gap-2">Subtitles<select aria-label="Stream subtitles" value={caption} onChange={(event) => {
          const track = Number(event.target.value); setCaption(track); if (engine.current) engine.current.subtitleTrack = track;
        }} className="rounded bg-surface-2 px-2 py-2"><option value={-1}>Off</option>{captions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
      </div>
    </>
  );
}
