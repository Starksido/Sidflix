import type { SeriesTitle } from "@/lib/catalog";
import { makeOnlineShow, positiveId, record, type ShowRecord } from "@/lib/online-shows";
import { searchTitleKey, titleMatchRank } from "@/lib/search-relevance";

export type AnimeSort = "popular" | "top-rated" | "updated" | "name";
export type AnimeRecord = { tmdb: number; title: string; originalTitle: string; metadata: Record<string, unknown> };
export type AnimePage = { items: SeriesTitle[]; page: number; totalPages: number; totalResults: number; refreshedAt: number; stale: boolean };

export function animeFilters(params: URLSearchParams) {
  const page = Number(params.get("page") ?? 1), sort = params.get("sort") ?? "popular";
  if (!Number.isSafeInteger(page) || page < 1 || page > 5000 || !["popular", "top-rated", "updated", "name"].includes(sort)) throw new Error("Invalid anime filters");
  return { page, sort: sort as AnimeSort, query: (params.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 80) };
}

/** Keep only Japanese animation, safe identifiers and whitelisted metadata fields. */
export function parseAnimeFeed(value: unknown): { items: AnimeRecord[]; pages: number } {
  const data = record(value);
  if (!Array.isArray(data.results) || !Number.isSafeInteger(data.total_pages) || (data.total_pages as number) < 1 || (data.total_pages as number) > 500) throw new Error("Unexpected anime catalogue");
  const seen = new Set<number>();
  const items: AnimeRecord[] = [];
  for (const raw of data.results) {
    const row = record(raw);
    try {
      const tmdb = positiveId(row.id);
      if (seen.has(tmdb) || row.adult === true || row.original_language !== "ja" || !Array.isArray(row.genre_ids) || !row.genre_ids.includes(16) || typeof row.name !== "string" || !row.name.trim()) continue;
      seen.add(tmdb);
      const title = row.name.trim().slice(0, 140), originalTitle = typeof row.original_name === "string" ? row.original_name.slice(0, 140) : title;
      const metadata: Record<string, unknown> = { id: tmdb, name: title, original_name: originalTitle, original_language: "ja", genre_ids: [16] };
      for (const key of ["overview", "first_air_date", "poster_path", "backdrop_path"]) if (typeof row[key] === "string") metadata[key] = (row[key] as string).slice(0, key === "overview" ? 1200 : 200);
      for (const key of ["popularity", "vote_average", "vote_count"]) if (typeof row[key] === "number" && Number.isFinite(row[key])) metadata[key] = row[key];
      items.push({ tmdb, title, originalTitle, metadata });
    } catch { /* One bad record must not invalidate the remaining titles. */ }
  }
  return { items, pages: data.total_pages as number };
}

export function makeAnimeTitle(row: AnimeRecord, provider: ShowRecord, details: unknown = null): SeriesTitle {
  return { ...makeOnlineShow({ ...provider, title: row.title }, { ...row.metadata, ...record(details) }), niche: "anime" };
}

export function selectAnime(rows: AnimeRecord[], providers: ShowRecord[], page: number, sort: AnimeSort, query: string, size = 20) {
  const listed = new Map(providers.map(row => [row.tmdb, row]));
  const terms = searchTitleKey(query).split(" ").filter(Boolean);
  let items = rows.filter(row => listed.has(row.tmdb) && terms.every(term => searchTitleKey(`${row.title} ${row.originalTitle} ${listed.get(row.tmdb)!.title}`).includes(term)));
  const score = (row: AnimeRecord) => makeAnimeTitle(row, listed.get(row.tmdb)!).searchSignals!;
  const rating = (row: AnimeRecord) => { const { rating, votes } = score(row); return votes > 0 && rating > 0 ? (rating * votes + 6.5 * 250) / (votes + 250) : -1; };
  if (sort === "popular") items = items.toSorted((a, b) => score(b).popularity - score(a).popularity || score(b).votes - score(a).votes);
  if (sort === "top-rated") items = items.toSorted((a, b) => rating(b) - rating(a) || score(b).votes - score(a).votes);
  if (sort === "updated") items = items.toSorted((a, b) => listed.get(b.tmdb)!.updated.localeCompare(listed.get(a.tmdb)!.updated));
  if (sort === "name") items = items.toSorted((a, b) => a.title.localeCompare(b.title));
  if (terms.length) items = items.toSorted((a, b) => Math.min(titleMatchRank(a.title, query), titleMatchRank(a.originalTitle, query), titleMatchRank(listed.get(a.tmdb)!.title, query)) - Math.min(titleMatchRank(b.title, query), titleMatchRank(b.originalTitle, query), titleMatchRank(listed.get(b.tmdb)!.title, query)));
  const totalResults = items.length, totalPages = Math.max(1, Math.ceil(totalResults / size)), current = Math.min(page, totalPages);
  return { records: items.slice((current - 1) * size, current * size), providers: listed, totalResults, totalPages, page: current };
}
