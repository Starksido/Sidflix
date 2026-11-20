import type { FilmTitle, SeriesTitle } from "@/lib/catalog";

export const RECENTLY_ADDED_MS = 7 * 24 * 60 * 60 * 1000;

export function isRecentlyAdded(addedAt: number | undefined, now: number): boolean {
  return addedAt !== undefined && addedAt <= now && now - addedAt < RECENTLY_ADDED_MS;
}

/** One canonical entry per episode; duplicate releases remain available to the file index. */
export function groupLibrary(films: FilmTitle[]): (FilmTitle | SeriesTitle)[] {
  const movies: FilmTitle[] = [];
  const shows = new Map<string, FilmTitle[]>();
  for (const film of films) {
    if (!film.episode) { movies.push(film); continue; }
    const episodes = shows.get(film.episode.seriesId) ?? [];
    episodes.push(film);
    shows.set(film.episode.seriesId, episodes);
  }
  const series: SeriesTitle[] = [];
  for (const [id, releases] of shows) {
    const unique = new Map<string, FilmTitle>();
    for (const film of releases) {
      const key = `${film.episode!.season}:${film.episode!.number}`;
      if (!unique.has(key)) unique.set(key, film);
    }
    const episodes = [...unique.values()].sort((a, b) =>
      a.episode!.season - b.episode!.season || a.episode!.number - b.episode!.number);
    const first = episodes[0];
    const seasons = new Set(episodes.map((episode) => episode.episode!.season)).size;
    series.push({
      id, kind: "series", title: first.episode!.seriesTitle, year: null, seasons,
      episodeMinutes: null, episodes, niche: first.niche, maturity: first.maturity,
      art: first.art, addedAt: Math.max(...releases.map((film) => film.addedAt ?? 0)),
      synopsis: `${episodes.length} episodes across ${seasons === 1 ? "1 season" : `${seasons} seasons`}. Choose a season and pick up where you left off.`,
    });
  }
  return [...movies, ...series].sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
}

export function adjacentEpisodes(episodes: FilmTitle[], id: string) {
  const index = episodes.findIndex((episode) => episode.id === id);
  return { previous: index > 0 ? episodes[index - 1] : undefined,
    next: index >= 0 ? episodes[index + 1] : undefined };
}
