"use client";

import { useEffect, useRef, useState } from "react";
import { Artwork } from "@/components/artwork";
import { OnlineSeriesDialog } from "@/components/online-series-dialog";
import { SeasonPicker } from "@/components/season-picker";
import { EpisodeList } from "@/components/episode-list";
import type { SeriesTitle } from "@/lib/catalog";
import { closeSeries, playEpisodes, useSelectedSeries, useViewerState } from "@/lib/viewer-store";

export function SeriesDialog() {
  const series = useSelectedSeries();
  return series ? series.remote ? <OnlineSeriesDialog key={series.id} series={series} /> : <SeriesDetails key={series.id} series={series} /> : null;
}

function SeriesDetails({ series }: { series: SeriesTitle }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const episodes = series.episodes ?? [];
  const { activeProfileId, watching } = useViewerState();
  const watchingEpisode = watching[activeProfileId]?.find((entry) => episodes.some((episode) => episode.id === entry.titleId));
  const resume = episodes.find((episode) => episode.id === watchingEpisode?.titleId) ?? episodes[0];
  const seasons = [...new Set(episodes.map((episode) => episode.episode!.season))];
  const [season, setSeason] = useState(resume?.episode?.season ?? seasons[0]);
  useEffect(() => { dialog.current?.showModal(); close.current?.focus(); }, []);
  return (
    <dialog ref={dialog} data-episode-dialog aria-labelledby="series-heading" onClose={closeSeries}
      onClick={(event) => { if (event.target === event.currentTarget) closeSeries(); }}
      className="bg-surface-1 text-fg m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl p-0 shadow-2xl ring-1 ring-white/10 backdrop:bg-black/80 backdrop:backdrop-blur-sm">
      <div className="relative overflow-hidden rounded-t-2xl">
        <Artwork title={series} showTitle className="h-48 sm:h-64" />
        <button ref={close} onClick={closeSeries} aria-label="Close episodes" className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-black/65 text-xl hover:bg-black">×</button>
      </div>
      <div className="px-5 py-6 sm:px-8">
        <p className="text-accent text-xs font-semibold tracking-[0.18em] uppercase">Series</p>
        <h2 id="series-heading" className="font-display mt-2 text-3xl font-bold tracking-tight">{series.title}</h2>
        <p className="text-fg-muted mt-2 text-sm">{series.seasons} {series.seasons === 1 ? "season" : "seasons"} · {episodes.length} episodes · {series.maturity}</p>
        {resume && <button onClick={() => playEpisodes(episodes, resume.id)}
          className="bg-fg text-ink mt-5 rounded-lg px-5 py-2.5 text-sm font-semibold transition hover:opacity-85">
          ▶ {watchingEpisode ? "Resume" : "Play"} S{resume.episode!.season} E{resume.episode!.number}
        </button>}
        <div className="border-line mt-8 flex items-center justify-between gap-4 border-b pb-4">
          <h3 className="font-display text-xl font-semibold">Episodes</h3>
          <SeasonPicker seasons={seasons.map(number => ({ number, name: `Season ${number}` }))} value={season} onChange={setSeason} />
        </div>
        <EpisodeList className="divide-line divide-y">
          {episodes.filter((episode) => episode.episode!.season === season).map((episode) => (
            <li key={episode.id}>
              <button data-episode-button onClick={() => playEpisodes(episodes, episode.id)} aria-label={`Play S${season} E${episode.episode!.number}: ${episode.episode!.name}`}
                className="group flex w-full items-center gap-4 rounded-lg py-4 text-left transition hover:bg-white/5 sm:px-3">
                <span className="text-fg-subtle w-7 shrink-0 text-center text-lg tabular-nums">{episode.episode!.number}</span>
                <span className="bg-surface-3 group-hover:bg-accent group-hover:text-ink grid size-12 shrink-0 place-items-center rounded-lg transition">▶</span>
                <span className="min-w-0 flex-1"><span className="block font-medium">{episode.episode!.name}</span>
                  <span className="text-fg-subtle mt-1 block text-xs">Season {season} · Episode {episode.episode!.number}</span></span>
                {watchingEpisode?.titleId === episode.id && <span className="text-accent text-xs">In progress</span>}
              </button>
            </li>
          ))}
        </EpisodeList>
      </div>
    </dialog>
  );
}
