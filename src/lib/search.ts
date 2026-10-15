import "server-only";
import type { Title } from "@/lib/catalog";
import { getHomeCatalog, settle } from "@/lib/catalog-server";
import { searchArchiveFilms } from "@/lib/sources/archive";
import { searchTodaysEvents } from "@/lib/sources/sportsdb";
import { searchAnimeOnTmdb } from "@/lib/sources/tmdb";
import { searchTwitchChannels } from "@/lib/sources/twitch";

// Search across the same official APIs the home page uses. Nothing is scraped.

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

export async function searchCatalog(raw: string | null | undefined): Promise<SearchResults> {
  const query = normalizeQuery(raw);
  if (query.length < MIN_QUERY_LENGTH) return { query, results: [], unavailable: [] };

  const unavailable: string[] = [];
  const run = <T>(name: string, load: () => Promise<T[] | null>) =>
    settle(name, load, () => unavailable.push(name));

  const [home, anime, films, events, channels] = await Promise.all([
    getHomeCatalog(),
    run("TMDB", () => searchAnimeOnTmdb(query)),
    run("Internet Archive", () => searchArchiveFilms(query)),
    run("TheSportsDB", () => searchTodaysEvents(query)),
    run("Twitch", () => searchTwitchChannels(query)),
  ]);

  // Anything in the home page's rails comes first, so a search never misses what's on
  // screen (including demo rows for sources that aren't connected).
  const onHome = [...Object.values(home.rails).flat(), ...home.genreRails.flatMap((row) => row.items)]
    .filter((t) => t.title.toLowerCase().includes(query));

  const byId = new Map<string, Title>();
  for (const title of [...onHome, ...(anime ?? []), ...(films ?? []), ...(events ?? []), ...(channels ?? [])]) {
    if (!byId.has(title.id)) byId.set(title.id, title);
  }

  return { query, results: [...byId.values()], unavailable: unavailable.sort() };
}
