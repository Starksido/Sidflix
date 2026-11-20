import "server-only";
import { cacheLife } from "next/cache";
import { fetchJson } from "@/lib/sources/util";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeOnlineEpisodes, makeOnlineShow, parseSavedShowIndex, parseShowFeed, positiveId, record, selectShows, showSeasons, type OnlineShowGuide, type OnlineShowPage, type ShowRecord, type ShowSort } from "@/lib/online-shows";

const snapshotPath = path.join(process.cwd(), "data", "tv-provider-index.json");

export class ShowNotListed extends Error {}
export async function getVidSparkShows(): Promise<ShowRecord[]> {
  "use cache";
  cacheLife("minutes");
  return loadVidSparkShows();
}
export async function loadVidSparkShows(snapshotFile = snapshotPath): Promise<ShowRecord[]> {
  const saved = await readFile(/* turbopackIgnore: true */ snapshotFile, "utf8").then(text => parseSavedShowIndex(JSON.parse(text), Date.now())).catch(() => null);
  if (saved && Date.now() - saved.savedAt < 6 * 60 * 60 * 1000) return saved.items;
  try {
  const load = async (page: number) => parseShowFeed(await fetchJson(`https://vidspark.to/api/discover/tv?resultsPerPage=100&ordering=views&direction=desc&page=${page}`));
  const first = await load(1), items = [...first.items];
  for (let start = 2; start <= first.pages; start += 5) {
    const pages = await Promise.all(Array.from({ length: Math.min(5, first.pages - start + 1) }, (_, i) => load(start + i)));
    pages.forEach(page => items.push(...page.items));
  }
  const unique = [...new Map(items.map(item => [item.tmdb, item])).values()];
  if (!unique.length) throw new Error("Empty TV index");
  try {
    await mkdir(path.dirname(snapshotFile), { recursive: true });
    const temp = `${snapshotFile}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temp, JSON.stringify({ version: 1, savedAt: Date.now(), items: unique }));
    await rename(temp, snapshotFile);
  } catch { console.warn("[shows] TV snapshot could not be saved."); }
  return unique;
  } catch {
    console.warn("[shows] TV service unavailable; retaining the last known catalogue.");
    return saved?.items ?? [];
  }
}
export async function requestTmdb(route: string): Promise<unknown> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TV artwork and episode guides are not configured");
  const url = new URL(`https://api.themoviedb.org/3/${route}`), bearer = key.startsWith("eyJ");
  if (!bearer) url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  return fetchJson(url.toString(), bearer ? { headers: { Authorization: `Bearer ${key}` } } : undefined);
}
export async function getShowMetadata(id: number): Promise<unknown> {
  "use cache";
  cacheLife("hours");
  return requestTmdb(`tv/${positiveId(id)}`);
}
async function getSeasonMetadata(id: number, season: number): Promise<unknown> {
  "use cache";
  cacheLife("minutes");
  return requestTmdb(`tv/${positiveId(id)}/season/${season}`);
}
export async function getOnlineShows(page = 1, sort: ShowSort = "popular", query = ""): Promise<OnlineShowPage> {
  const index = await getVidSparkShows();
  if (!index.length) throw new Error("TV catalogue temporarily unavailable");
  const selected = selectShows(index, page, sort, query);
  const items = [];
  for (let start = 0; start < selected.items.length; start += 5) {
    const batch = await Promise.all(selected.items.slice(start, start + 5).map(async entry => {
      const metadata = await getShowMetadata(entry.tmdb).catch(() => null);
      return record(metadata).adult === true ? null : makeOnlineShow(entry, metadata);
    }));
    items.push(...batch.filter(item => item !== null));
  }
  return { ...selected, items };
}
export async function getOnlineShowGuide(id: number, requestedSeason?: number): Promise<OnlineShowGuide> {
  const index = await getVidSparkShows();
  if (!index.length) throw new Error("TV catalogue temporarily unavailable");
  const entry = index.find(item => item.tmdb === id);
  if (!entry) throw new ShowNotListed("Show is not listed by VidSpark");
  const metadata = await getShowMetadata(id);
  if (record(metadata).adult === true) throw new ShowNotListed("Show not available");
  const show = makeOnlineShow(entry, metadata), today = new Date().toISOString().slice(0, 10), seasons = showSeasons(metadata, today);
  const season = requestedSeason ?? seasons.find(item => item.number > 0)?.number ?? seasons[0]?.number ?? 1;
  if (!seasons.some(item => item.number === season)) throw new ShowNotListed("Season not available");
  return { show, seasons, season, episodes: makeOnlineEpisodes(show, season, await getSeasonMetadata(id, season), today) };
}
