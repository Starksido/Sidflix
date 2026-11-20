import "server-only";
import { cacheLife } from "next/cache";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FilmTitle, SeriesTitle } from "@/lib/catalog";
import { genreDefinition, genreDefinitions, mixGenreTitles, selectGenreShows, type GenreKey, type GenrePage, type GenreSection, type GenreSort } from "@/lib/genres";
import { makeOnlineShow, record, type ShowRecord } from "@/lib/online-shows";
import { parseOnlineMoviePage } from "@/lib/online-movies";
import { getVidSparkShows, requestTmdb } from "@/lib/sources/online-shows";

const DAY = 86_400_000;
const snapshotPath = path.join(process.cwd(), "data", "tv-genres.json");
type StoredRow = { tmdb: number; updated: string; checkedAt: number; metadata: Record<string, unknown> | null };

async function readSnapshot(): Promise<StoredRow[]> {
  try {
    const saved = record(JSON.parse(await readFile(snapshotPath, "utf8")));
    if (saved.version !== 1 || !Array.isArray(saved.rows)) return [];
    return saved.rows.flatMap(raw => {
      const row = record(raw);
      if (!Number.isSafeInteger(row.tmdb) || (row.tmdb as number) < 1 || typeof row.updated !== "string" || typeof row.checkedAt !== "number" || !Number.isFinite(row.checkedAt) || row.checkedAt > Date.now()) return [];
      return [{ tmdb: row.tmdb as number, updated: row.updated, checkedAt: row.checkedAt, metadata: row.metadata === null ? null : record(row.metadata) }];
    });
  } catch { return []; }
}

function compactMetadata(value: unknown, tmdb: number): Record<string, unknown> | null {
  const row = record(value);
  if (row.id !== tmdb || row.adult === true) return null;
  const result: Record<string, unknown> = { id: tmdb };
  for (const key of ["first_air_date", "overview", "poster_path", "backdrop_path", "original_language"]) if (typeof row[key] === "string") result[key] = (row[key] as string).slice(0, key === "overview" ? 1200 : 200);
  for (const key of ["number_of_seasons", "popularity", "vote_average", "vote_count"]) if (typeof row[key] === "number" && Number.isFinite(row[key])) result[key] = row[key];
  result.genres = (Array.isArray(row.genres) ? row.genres : []).map(genre => ({ id: record(genre).id })).filter(genre => Number.isSafeInteger(genre.id));
  const words = record(row.keywords).results;
  result.keywords = { results: (Array.isArray(words) ? words : []).flatMap(word => typeof record(word).name === "string" ? [{ name: (record(word).name as string).slice(0, 120) }] : []) };
  return result;
}

export async function getGenreShowIndex(): Promise<{ items: SeriesTitle[]; partial: boolean }> {
  "use cache";
  cacheLife("hours");
  return synchronizeGenreShows(await getVidSparkShows());
}

async function saveSnapshot(rows: Map<number, StoredRow>) {
  try {
    await mkdir(path.dirname(snapshotPath), { recursive: true });
    const temp = `${snapshotPath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temp, JSON.stringify({ version: 1, rows: [...rows.values()] }));
    await rename(temp, snapshotPath);
  } catch { console.warn("[genres] Genre snapshot could not be saved."); }
}

/** Classify every provider show once; refresh only changed/expired records later. */
export async function synchronizeGenreShows(providers: ShowRecord[]): Promise<{ items: SeriesTitle[]; partial: boolean }> {
  const saved = await readSnapshot();
  const existing = new Map(saved.map(row => [row.tmdb, row]));
  const rows = new Map<number, StoredRow>();
  const pending = providers.filter(provider => {
    const previous = existing.get(provider.tmdb);
    if (previous && previous.updated === provider.updated && Date.now() - previous.checkedAt < DAY) { rows.set(provider.tmdb, previous); return false; }
    return true;
  });
  if (pending.length) console.info(`[genres] Classifying ${pending.length} TV listings.`);
  let failures = 0;
  for (let start = 0; start < pending.length; start += 10) {
    const batch = await Promise.all(pending.slice(start, start + 10).map(async provider => {
      let metadata: Record<string, unknown> | null;
      try { metadata = compactMetadata(await requestTmdb(`tv/${provider.tmdb}?append_to_response=keywords`), provider.tmdb); }
      catch { failures++; metadata = existing.get(provider.tmdb)?.metadata ?? null; }
      return { tmdb: provider.tmdb, updated: provider.updated, checkedAt: Date.now(), metadata };
    }));
    batch.forEach(row => rows.set(row.tmdb, row));
    if (start % 250 === 0 || start + 10 >= pending.length) {
      console.info(`[genres] Classified ${Math.min(start + 10, pending.length)}/${pending.length}.`);
      await saveSnapshot(rows);
    }
    if (start + 10 < pending.length) await new Promise(resolve => setTimeout(resolve, 250));
  }
  const items = providers.flatMap(provider => {
    const metadata = rows.get(provider.tmdb)?.metadata;
    return metadata ? [makeOnlineShow(provider, metadata)] : [];
  });
  if (!items.length) throw new Error("TV genres unavailable");
  return { items, partial: failures > 0 };
}

async function musicalKeyword(): Promise<number> {
  "use cache";
  cacheLife("days");
  const data = record(await requestTmdb("search/keyword?query=musical"));
  const row = (Array.isArray(data.results) ? data.results : []).map(record).find(row => row.name === "musical" && Number.isSafeInteger(row.id));
  if (!row) throw new Error("Musical keyword unavailable");
  return row.id as number;
}

export async function getGenreMovies(key: GenreKey, page = 1, sort: GenreSort = "popular"): Promise<GenrePage & { items: FilmTitle[] }> {
  "use cache";
  cacheLife("hours");
  const genre = genreDefinition(key)!;
  const params = new URLSearchParams({ page: String(page), sort_by: sort === "top-rated" ? "vote_average.desc" : "popularity.desc", include_adult: "false", include_video: "false" });
  if (sort === "top-rated") params.set("vote_count.gte", "100");
  if (genre.movieId !== null) params.set("with_genres", String(genre.movieId));
  else params.set("with_keywords", String(await musicalKeyword()));
  const result = parseOnlineMoviePage(await requestTmdb(`discover/movie?${params}`));
  return { ...result, partial: false, items: result.items.map(title => ({ ...title, genres: [...new Set([...(title.genres ?? []), key])] })) };
}

export async function getGenrePage(key: GenreKey, type: "shows" | "movies", page: number, sort: GenreSort): Promise<GenrePage> {
  if (type === "movies") return getGenreMovies(key, page, sort);
  const index = await getGenreShowIndex();
  return { ...selectGenreShows(index.items, key, page, sort), partial: index.partial };
}

export async function getGenreSections(): Promise<{ sections: GenreSection[]; partial: boolean }> {
  const shows = await getGenreShowIndex().catch(() => null);
  let partial = shows?.partial ?? true;
  const sections: GenreSection[] = [];
  for (let start = 0; start < genreDefinitions.length; start += 4) {
    const batch = await Promise.all(genreDefinitions.slice(start, start + 4).map(async genre => {
      const movies = await getGenreMovies(genre.key).catch(() => { partial = true; return null; });
      const series = shows ? selectGenreShows(shows.items, genre.key, 1, "popular", 12).items.filter((title): title is SeriesTitle => title.kind === "series") : [];
      return { key: genre.key, label: genre.label, items: mixGenreTitles(series, movies?.items ?? []) };
    }));
    sections.push(...batch);
  }
  return { sections, partial };
}
