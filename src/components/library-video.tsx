"use client";

import { useEffect, useRef, useState } from "react";
import type { FilmTitle } from "@/lib/catalog";
import type { SubtitleTrack } from "@/lib/media-subtitles";
import { adjacentEpisodes } from "@/lib/library-groups";
import { playTitle, savedProgress, savePlayback, setEpisodeQueue, useEpisodeQueue } from "@/lib/viewer-store";

const control = "rounded-md bg-white/8 px-3 py-2 text-xs font-medium transition hover:bg-white/15 disabled:cursor-default disabled:opacity-30";
function preference(key: string, fallback: string) {
  try { return window.localStorage.getItem(`sidflix:player:${key}`) ?? fallback; } catch { return fallback; }
}
function remember(key: string, value: string) {
  try { window.localStorage.setItem(`sidflix:player:${key}`, value); } catch {}
}
function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/** HLS converts local MKV/HEVC files a few seconds at a time and supports arbitrary seeking. */
export function LibraryVideo({ title, onError }: { title: FilmTitle; onError: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resume = useRef(savedProgress(title.id));
  const lastSave = useRef(0);
  const started = useRef(false);
  const episodes = useEpisodeQueue();
  const { previous, next } = adjacentEpisodes(episodes, title.id);
  const [autoplay, setAutoplay] = useState(() => preference("autoplay", "true") === "true");
  const [speed, setSpeed] = useState(() => Number(preference("speed", "1")) || 1);
  const [tracks, setTracks] = useState<SubtitleTrack[]>([]);
  const [subtitle, setSubtitle] = useState("off");
  const [subtitleStatus, setSubtitleStatus] = useState("Loading subtitles…");
  const [subtitleLoading, setSubtitleLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [season, setSeason] = useState(title.episode?.season ?? 1);
  const remaining = time.duration - time.current;

  const save = () => {
    const video = videoRef.current;
    if (video && started.current && video.duration > 0) savePlayback(title, video.currentTime / video.duration, video.duration);
  };
  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };
  const togglePlay = () => {
    const video = videoRef.current;
    if (video?.paused) void video.play().catch(() => {}); else video?.pause();
  };

  useEffect(() => {
    const abort = new AbortController();
    void fetch(`/api/library/${title.id}/context`, { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Context unavailable");
        return await response.json() as { episodes: FilmTitle[]; subtitles: SubtitleTrack[] };
      }).then((data) => {
        setEpisodeQueue(data.episodes, title.id);
        setTracks(data.subtitles);
        setSubtitleStatus(data.subtitles.length ? "" : "No subtitles available for this file.");
        const language = preference("subtitles", "off");
        const selected = data.subtitles.find((track) => track.label === preference("subtitle-label", "off")) ??
          data.subtitles.find((track) => track.language === language);
        setSubtitle(language === "off" ? "off" : selected?.id ?? "off");
        setSubtitleLoading(language !== "off" && selected !== undefined);
      }).catch(() => { if (!abort.signal.aborted) setSubtitleStatus("Subtitles unavailable. Reopen the player to retry."); });
    return () => abort.abort();
  }, [title.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    for (let index = 0; index < video.textTracks.length; index++) {
      video.textTracks[index].mode = subtitle !== "off" ? "showing" : "disabled";
    }
  }, [subtitle, tracks]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    let destroy: (() => void) | undefined;
    const src = `/api/library/${title.id}/playlist`;

    void import("hls.js").then(({ default: Hls }) => {
      if (disposed) return;
      if (Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 18, backBufferLength: 12 });
        destroy = () => hls.destroy();
        hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) onError(); });
        hls.loadSource(src);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else {
        onError();
      }
    }).catch(() => { if (!disposed) onError(); });

    return () => {
      disposed = true;
      if (started.current && video.duration > 0) savePlayback(title, video.currentTime / video.duration, video.duration);
      destroy?.();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [title, onError]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input,select,textarea") || (target.closest("button,a") && event.code === "Space")) return;
      const video = videoRef.current;
      if (!video) return;
      if (event.code === "Space" || event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (video.paused) void video.play().catch(() => {}); else video.pause();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + (event.key === "ArrowLeft" ? -10 : 10)));
      } else if (event.key.toLowerCase() === "m") video.muted = !video.muted;
      else if (event.key.toLowerCase() === "n" && next) playTitle(next);
      else if (event.key.toLowerCase() === "p" && previous) playTitle(previous);
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [next, previous]);

  return (
    <div ref={containerRef} className="bg-black fullscreen:flex fullscreen:flex-col fullscreen:justify-center [&:fullscreen_video]:max-h-[75dvh]">
      <div className="relative">
        <video ref={videoRef} aria-label={title.title} controls autoPlay playsInline onError={onError}
          className="aspect-video max-h-[60dvh] w-full bg-black object-contain"
          onLoadedMetadata={() => {
            const video = videoRef.current!;
            if (!started.current && resume.current > 0 && Number.isFinite(video.duration)) video.currentTime = resume.current * video.duration;
            started.current = true; video.playbackRate = speed;
            setTime({ current: video.currentTime, duration: video.duration });
          }}
          onPlaying={() => { setPlaying(true); setBuffering(false); }} onWaiting={() => setBuffering(true)}
          onPause={() => { setPlaying(false); save(); }}
          onTimeUpdate={() => {
            const video = videoRef.current!;
            setTime({ current: video.currentTime, duration: video.duration });
            if (Date.now() - lastSave.current > 5000) { lastSave.current = Date.now(); save(); }
          }}
          onEnded={() => { savePlayback(title, 1, videoRef.current?.duration); if (autoplay && next) playTitle(next); }}>
          {tracks.filter((track) => track.id === subtitle).map((track) => <track key={track.id} kind="subtitles" src={track.src} srcLang={track.language} label={track.label} default
            onLoad={(event) => { event.currentTarget.track.mode = "showing"; setSubtitleLoading(false); }}
            onError={() => { setSubtitleLoading(false); setSubtitleStatus("This subtitle track couldn’t be loaded. Try another track."); }} />)}
        </video>
        {buffering && <div role="status" className="pointer-events-none absolute top-4 left-4 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white/80">Getting your video ready…</div>}
        {autoplay && next && remaining > 0 && remaining <= 10 && <div className="absolute right-4 bottom-16 max-w-xs rounded-xl bg-surface-1/95 p-4 shadow-xl ring-1 ring-white/15">
          <p className="text-fg-muted text-xs">Up next in {Math.ceil(remaining)} seconds</p><p className="mt-1 text-sm font-medium">{next.episode?.name}</p>
          <div className="mt-3 flex gap-2"><button className={control} onClick={() => playTitle(next)}>Play now</button>
            <button className={control} onClick={() => { setAutoplay(false); remember("autoplay", "false"); }}>Cancel autoplay</button></div>
        </div>}
      </div>
      <div className="border-line flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <button className={control} aria-label={playing ? "Pause" : "Play"} onClick={togglePlay}>{playing ? "Ⅱ Pause" : "▶ Play"}</button>
        <button className={control} aria-label="Back 10 seconds" onClick={() => skip(-10)}>↶ 10s</button>
        <button className={control} aria-label="Forward 10 seconds" onClick={() => skip(10)}>10s ↷</button>
        <span className="text-fg-subtle mr-auto px-1 text-xs tabular-nums">{clock(time.current)} / {clock(time.duration)}</span>
        <label className="text-fg-muted flex items-center gap-2 text-xs">Speed
          <select aria-label="Playback speed" value={speed} className={`${control} bg-surface-2`} onChange={(event) => {
            const value = Number(event.target.value); setSpeed(value); remember("speed", String(value)); if (videoRef.current) videoRef.current.playbackRate = value;
          }}>{[0.5, 0.75, 1, 1.25, 1.5, 2].map((value) => <option key={value} value={value}>{value}×</option>)}</select>
        </label>
        <label className="text-fg-muted flex items-center gap-2 text-xs">Subtitles
          <select aria-label="Subtitles" value={subtitle} className={`${control} max-w-40 bg-surface-2`} title={subtitleStatus}
            onChange={(event) => { const value = event.target.value; setSubtitle(value); setSubtitleLoading(value !== "off"); setSubtitleStatus("");
              const track = tracks.find((track) => track.id === value); remember("subtitles", track?.language ?? "off"); remember("subtitle-label", track?.label ?? "off"); }}>
            <option value="off">{tracks.length ? "Off" : subtitleStatus.startsWith("Loading") ? "Loading…" : "None available"}</option>
            {tracks.map((track) => <option key={track.id} value={track.id}>{track.label}</option>)}
          </select>
        </label>
        <button className={control} aria-label="Fullscreen" onClick={() => {
          if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
          else void containerRef.current?.requestFullscreen().catch(() => {});
        }}>⛶</button>
        <button className={control} aria-label="Picture in picture" onClick={() => {
          if (document.pictureInPictureElement) void document.exitPictureInPicture().catch(() => {});
          else void videoRef.current?.requestPictureInPicture?.().catch(() => {});
        }}>▣</button>
      </div>
      {title.episode && <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button className={control} aria-label="Previous episode" disabled={!previous} onClick={() => previous && playTitle(previous)}>◀ Previous</button>
        <button className={control} aria-label="Next episode" disabled={!next} onClick={() => next && playTitle(next)}>Next episode ▶</button>
        <button className={control} aria-expanded={showEpisodes} onClick={() => setShowEpisodes(!showEpisodes)}>☷ Episodes</button>
        <label className="text-fg-muted ml-auto flex cursor-pointer items-center gap-2 text-xs"><input type="checkbox" checked={autoplay} className="accent-accent size-4"
          onChange={(event) => { setAutoplay(event.target.checked); remember("autoplay", String(event.target.checked)); }} />Autoplay next episode</label>
      </div>}
      {subtitleStatus.startsWith("This subtitle") && <p role="status" className="text-fg-muted px-4 pb-3 text-xs">{subtitleStatus}</p>}
      {subtitleLoading && <p role="status" className="text-fg-muted px-4 pb-3 text-xs">Loading subtitles… The first load can take a moment.</p>}
      {showEpisodes && <div className="border-line border-t px-4 py-4">
        <label className="text-fg-muted flex items-center gap-3 text-sm">Episodes
          <select aria-label="Player season" className="bg-surface-2 rounded-md px-3 py-2" value={season} onChange={(event) => setSeason(Number(event.target.value))}>
            {[...new Set(episodes.map((episode) => episode.episode!.season))].map((value) => <option key={value} value={value}>Season {value}</option>)}
          </select>
        </label>
        <ol className="mt-3 grid max-h-52 gap-1 overflow-y-auto">{episodes.filter((episode) => episode.episode!.season === season).map((episode) => <li key={episode.id}>
          <button aria-current={episode.id === title.id ? "true" : undefined} onClick={() => playTitle(episode)}
            className={`w-full rounded-md px-3 py-2.5 text-left text-sm hover:bg-white/10 ${episode.id === title.id ? "bg-white/10 text-accent" : "text-fg-muted"}`}>
            <span className="mr-3 tabular-nums">{episode.episode!.number}.</span>{episode.episode!.name}
          </button>
        </li>)}</ol>
      </div>}
    </div>
  );
}
