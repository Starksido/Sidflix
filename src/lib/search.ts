import "server-only";
import type { Title } from "@/lib/catalog";
import { getHomeCatalog, settle } from "@/lib/catalog-server";
import { searchArchiveFilms } from "@/lib/sources/archive";
import { searchTodaysEvents } from "@/lib/sources/sportsdb";
import { searchAnimeOnTmdb } from "@/lib/sources/tmdb";
import { searchYifyMovies } from "@/lib/sources/yify";
import { getOnlineMovies } from "@/lib/sources/online-movies";
import { getOnlineShows } from "@/lib/sources/online-shows";
import { rankSearchResults } from "@/lib/search-relevance";
import { isVisibleInBrowse } from "@/lib/library-visibility";

// Search across the home page's official APIs plus the YTS index. Nothing is scraped.

export const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;

export type SearchResults = {
  query: string;
  results: Title[];
  /** Sources that failed for this search. Unconfigured sources are not listed. */
  unavailable: string[];
};

/** Trimmed, single-spaced and lowercased, so equal searches share a cache entry. */
export function normalizeQuery(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, MAX_QUERY_LENGTH);
}

/** Same film from two sources gets different ids, so also match on title and year. */
function titleKey(title: Title): string {
  const year = (title as { year?: unknown }).year;
  return `${title.kind === "tv-channel" ? "live-tv|" : title.kind === "series" && title.remote ? "online-tv|" : title.kind === "film" && title.remote ? "online|" : ""}${title.title.trim().toLowerCase()}|${typeof year === "number" ? year : ""}`;
}

export async function searchCatalog(raw: string | null | undefined): Promise<SearchResults> {
  const query = normalizeQuery(raw);
  if (query.length < MIN_QUERY_LENGTH) return { query, results: [], unavailable: [] };

  const unavailable: string[] = [];
  const run = <T>(name: string, load: () => Promise<T[] | null>) =>
    settle(name, load, () => unavailable.push(name));

  const [home, anime, films, events, yify, online, shows] = await Promise.all([
    getHomeCatalog(),
    run("TMDB", () => searchAnimeOnTmdb(query)),
    run("Internet Archive", () => searchArchiveFilms(query)),
    run("TheSportsDB", () => searchTodaysEvents(query)),
    run("YIFY", () => searchYifyMovies(query)),
    run("Online Movies", async () => (await getOnlineMovies(1, "popular", query)).items),
    run("Online TV Shows", async () => (await getOnlineShows(1, "popular", query)).items),
  ]);

  // Include home titles as candidates; relevance decides the final display order.
  const onHome = [
    ...home.library,
    ...home.liveTv,
    ...Object.values(home.rails).flat(),
    ...home.genreRails.flatMap((row) => row.items),
  ].filter((t) => t.title.toLowerCase().includes(query) ||
    (t.kind === "series" && t.episodes?.some((episode) => episode.title.toLowerCase().includes(query))));

  // Earlier sources win, so home and official results take priority over YIFY.
  const byId = new Map<string, Title>();
  const seenTitles = new Set<string>();
  for (const title of [
    ...onHome,
    ...(online ?? []),
    ...(shows ?? []),
    ...(anime ?? []),
    ...(films ?? []),
    ...(events ?? []),
    ...(yify ?? []),
  ]) {
    const key = titleKey(title);
    if (!isVisibleInBrowse(title) || byId.has(title.id) || seenTitles.has(key)) continue;
    byId.set(title.id, title);
    seenTitles.add(key);
  }

  return { query, results: rankSearchResults([...byId.values()], query), unavailable: unavailable.sort() };
}
