"use client";

import { useEffect, useRef, useState } from "react";
import { Artwork } from "@/components/artwork";
import type { SeriesTitle } from "@/lib/catalog";
import type { OnlineShowGuide } from "@/lib/online-shows";
import { closeSeries, playEpisodes } from "@/lib/viewer-store";
import { SeasonPicker } from "@/components/season-picker";
import { EpisodeList } from "@/components/episode-list";
import { focusEpisode } from "@/lib/episode-focus";

export function OnlineSeriesDialog({ series }: { series: SeriesTitle }) {
  const dialog = useRef<HTMLDialogElement>(null), close = useRef<HTMLButtonElement>(null);
  const [season, setSeason] = useState<number | null>(null), [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: OnlineShowGuide; error?: string } | null>(null);
  const key = `${season}|${retry}`, guide = result?.data, current = result?.key === key ? result : null;
  const id = series.remote!.tmdb;
  const focusEpisodes = useRef(true);
  useEffect(() => {
    if (!current?.data || !focusEpisodes.current) return;
    focusEpisodes.current = false;
    const first = dialog.current?.querySelector<HTMLButtonElement>("[data-episode-button]");
    focusEpisode(first);
  }, [current?.data]);
  useEffect(() => { dialog.current?.showModal(); close.current?.focus(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); setResult({ key, error: "The episode guide took too long to load. Please try again." }); }, 30_000);
    fetch(`/api/tv-shows/${id}${season === null ? "" : `?season=${season}`}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Guide unavailable");
      const data: OnlineShowGuide = await response.json();
      if (!controller.signal.aborted) setResult({ key, data });
    }).catch(() => { if (!controller.signal.aborted) setResult(previous => ({ key, data: previous?.data, error: "The episode guide couldn’t be loaded. Please try again." })); }).finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [id, key, season]);
  return <dialog ref={dialog} data-episode-dialog aria-labelledby="online-series-title" onClose={closeSeries}
    onClick={event => { if (event.target === event.currentTarget) closeSeries(); }}
    className="m-auto max-h-[92dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto rounded-2xl bg-surface-1 p-0 text-fg ring-1 ring-white/10 backdrop:bg-black/85 backdrop:backdrop-blur-sm">
    <div className="relative overflow-hidden rounded-t-2xl"><Artwork title={guide?.show ?? series} showTitle className="h-40 sm:h-56" />
      <button ref={close} onClick={closeSeries} aria-label="Close episodes" className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-black/65 text-xl hover:bg-black">×</button>
    </div>
    <div className="px-5 py-6 sm:px-8"><p className="text-xs font-semibold tracking-widest text-accent">TV SERIES</p>
      <h2 id="online-series-title" className="font-display mt-2 text-3xl font-bold">{series.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">{guide?.show.synopsis ?? series.synopsis}</p>
      <div className="episode-browser-tools mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4"><h3 className="font-display text-xl font-semibold">Episodes</h3>
        {guide && <SeasonPicker seasons={guide.seasons} value={season ?? guide.season} onChange={next => { focusEpisodes.current = true; setSeason(next); }} />}
      </div>
      {!current ? <p role="status" className="py-8 text-sm text-fg-muted">Loading episodes…</p>
        : current.error ? <p role="alert" className="py-6 text-sm text-fg-muted">{current.error}<button onClick={() => setRetry(value => value + 1)} className="ml-3 text-accent underline">Try again</button></p>
        : current.data && <EpisodeList id="online-episode-list" className="divide-y divide-white/10">
          {current.data.episodes.map(episode => <li key={episode.id}><button data-episode-button onClick={() => playEpisodes(current.data!.episodes, episode.id)} aria-label={`Play S${episode.episode!.season} E${episode.episode!.number}: ${episode.episode!.name}`} className="group flex w-full items-start gap-4 rounded-lg py-5 text-left hover:bg-white/5 sm:px-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white/10 text-accent group-hover:bg-accent group-hover:text-accent-ink">▶</span>
            <span className="min-w-0"><span className="block font-medium">{episode.episode!.number}. {episode.episode!.name}</span>
              <span className="mt-1 block text-xs text-fg-subtle">S{episode.episode!.season} E{episode.episode!.number}{episode.minutes ? ` · ${episode.minutes} min` : ""}</span>
              {episode.synopsis && <span className="mt-2 line-clamp-2 block text-sm text-fg-muted">{episode.synopsis}</span>}
            </span>
          </button></li>)}
          {!current.data.episodes.length && <li className="py-6 text-sm text-fg-muted">No aired episodes are listed for this season yet.</li>}
        </EpisodeList>}
    </div>
  </dialog>;
}
