import "server-only";
import { cacheLife } from "next/cache";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeAnimeTitle, parseAnimeFeed, selectAnime, type AnimeRecord, type AnimeSort, type AnimePage } from "@/lib/anime";
import { record } from "@/lib/online-shows";
import { getShowMetadata, getVidSparkShows, requestTmdb } from "@/lib/sources/online-shows";

const snapshotPath = path.join(process.cwd(), "data", "anime-catalogue.json");
const DAY = 24 * 60 * 60 * 1000;

async function discoveryPage(page: number) {
  "use cache";
  cacheLife("hours");
  return parseAnimeFeed(await requestTmdb(`discover/tv?with_genres=16&with_original_language=ja&include_adult=false&sort_by=popularity.desc&page=${page}`));
}

async function readSnapshot(): Promise<{ records: AnimeRecord[]; refreshedAt: number } | null> {
  try {
    const data = record(JSON.parse(await readFile(snapshotPath, "utf8")));
    if (data.version !== 1 || typeof data.refreshedAt !== "number" || !Number.isFinite(data.refreshedAt) || data.refreshedAt > Date.now() || !Array.isArray(data.rows)) return null;
    const records = parseAnimeFeed({ results: data.rows, total_pages: 1 }).items;
    return records.length ? { records, refreshedAt: data.refreshedAt } : null;
  } catch { return null; }
}

/** Complete classification index; provider membership is checked separately on each browse. */
async function getAnimeIndex() {
  "use cache";
  cacheLife("hours");
  const saved = await readSnapshot();
  if (saved && Date.now() - saved.refreshedAt < DAY) return { ...saved, stale: false };
  try {
    const first = await discoveryPage(1), records = [...first.items];
    for (let start = 2; start <= first.pages; start += 8) {
      const pages = await Promise.all(Array.from({ length: Math.min(8, first.pages - start + 1) }, (_, offset) => discoveryPage(start + offset)));
      pages.forEach(page => records.push(...page.items));
    }
    const unique = [...new Map(records.map(row => [row.tmdb, row])).values()], refreshedAt = Date.now();
    if (!unique.length) throw new Error("Empty anime index");
    try {
      await mkdir(path.dirname(snapshotPath), { recursive: true });
      const temp = `${snapshotPath}.${process.pid}.${refreshedAt}.tmp`;
      await writeFile(temp, JSON.stringify({ version: 1, refreshedAt, rows: unique.map(row => row.metadata) }));
      await rename(temp, snapshotPath);
    } catch { console.warn("[anime] Catalogue snapshot could not be saved."); }
    return { records: unique, refreshedAt, stale: false };
  } catch (error) {
    if (saved) return { ...saved, stale: true };
    throw error;
  }
}

export async function getOnlineAnime(page = 1, sort: AnimeSort = "popular", query = ""): Promise<AnimePage> {
  const [index, providers] = await Promise.all([getAnimeIndex(), getVidSparkShows()]);
  const selected = selectAnime(index.records, providers, page, sort, query);
  const items = [];
  for (let start = 0; start < selected.records.length; start += 5) {
    const batch = await Promise.all(selected.records.slice(start, start + 5).map(async row => {
      const details = await getShowMetadata(row.tmdb).catch(() => null);
      return record(details).adult === true ? null : makeAnimeTitle(row, selected.providers.get(row.tmdb)!, details);
    }));
    items.push(...batch.filter(row => row !== null));
  }
  return { items, page: selected.page, totalResults: selected.totalResults, totalPages: selected.totalPages, refreshedAt: index.refreshedAt, stale: index.stale };
}
