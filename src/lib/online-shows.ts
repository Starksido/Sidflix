import type { FilmTitle, SeriesTitle } from "@/lib/catalog";
import { readSearchSignals, titleMatchRank } from "@/lib/search-relevance";
import { classifyGenres } from "@/lib/genres";

export type ShowSort = "popular" | "updated" | "name";
export type ShowRecord = { tmdb: number; title: string; updated: string };
export function parseSavedShowIndex(value: unknown, now: number): { items: ShowRecord[]; savedAt: number } | null {
  const data = record(value);
  if (data.version !== 1 || !Array.isArray(data.items) || typeof data.savedAt !== "number" || !Number.isFinite(data.savedAt) || data.savedAt > now || now - data.savedAt > 30 * 86_400_000) return null;
  const parsed = parseShowFeed({ result: true, last_page: 1, data: data.items.map(raw => {
    const row = record(raw);
    return { tmdbid: row.tmdb, orig_title: row.title, last_update: row.updated, type: "tv" };
  }) });
  return parsed.items.length ? { items: parsed.items, savedAt: data.savedAt } : null;
}
export type OnlineShowPage = { items: SeriesTitle[]; page: number; totalPages: number; totalResults: number };
export type OnlineShowGuide = { show: SeriesTitle; seasons: { number: number; name: string; count: number }[]; season: number; episodes: FilmTitle[] };
export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function positiveId(value: unknown): number {
  const id = typeof value === "string" && /^[0-9]+$/.test(value) ? Number(value) : value;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1) throw new Error("Invalid identifier");
  return id;
}
export function showFilters(params: URLSearchParams) {
  const page = Number(params.get("page") ?? 1), sort = params.get("sort") ?? "popular";
  if (!Number.isSafeInteger(page) || page < 1 || page > 5000 || !["popular", "updated", "name"].includes(sort)) throw new Error("Invalid show filters");
  return { page, sort: sort as ShowSort, query: (params.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 80) };
}
export function parseShowFeed(value: unknown): { items: ShowRecord[]; pages: number } {
  const data = record(value);
  if (data.result !== true || !Array.isArray(data.data) || !Number.isSafeInteger(data.last_page) || (data.last_page as number) < 1 || (data.last_page as number) > 500) throw new Error("Unexpected TV catalogue");
  const seen = new Set<number>(), items: ShowRecord[] = [];
  for (const raw of data.data) {
    const entry = record(raw);
    try {
      const tmdb = positiveId(entry.tmdbid);
      if (entry.type !== "tv" || typeof entry.orig_title !== "string" || !entry.orig_title.trim() || seen.has(tmdb)) continue;
      seen.add(tmdb);
      items.push({ tmdb, title: entry.orig_title.trim().slice(0, 140), updated: typeof entry.last_update === "string" && /^\d{4}-\d{2}-\d{2} [\d:]+$/.test(entry.last_update) ? entry.last_update : "" });
    } catch { /* Skip malformed provider records, not the rest of the catalogue. */ }
  }
  return { items, pages: data.last_page as number };
}
const normal = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function selectShows(index: ShowRecord[], page: number, sort: ShowSort, query: string, size = 20) {
  const phrase = normal(query), terms = phrase.split(" ").filter(Boolean);
  let items = index.filter(item => terms.every(term => normal(item.title).includes(term)));
  if (sort === "updated") items = items.toSorted((a, b) => b.updated.localeCompare(a.updated));
  if (sort === "name") items = items.toSorted((a, b) => a.title.localeCompare(b.title));
  if (phrase) items = items.toSorted((a, b) => titleMatchRank(a.title, query) - titleMatchRank(b.title, query));
  const totalResults = items.length, totalPages = Math.max(1, Math.ceil(totalResults / size));
  const current = Math.min(page, totalPages);
  return { items: items.slice((current - 1) * size, current * size), page: current, totalPages, totalResults };
}
function image(value: unknown, size: string) {
  return typeof value === "string" && /^\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(value) ? `https://image.tmdb.org/t/p/${size}${value}` : undefined;
}
export function makeOnlineShow(entry: ShowRecord, metadata: unknown): SeriesTitle {
  const data = record(metadata), year = typeof data.first_air_date === "string" ? Number(data.first_air_date.slice(0, 4)) : NaN;
  const anime = data.original_language === "ja" && ((Array.isArray(data.genre_ids) && data.genre_ids.includes(16)) || (Array.isArray(data.genres) && data.genres.some(genre => record(genre).id === 16)));
  return { id: `online-tv-${entry.tmdb}`, kind: "series", niche: anime ? "anime" : "indie", maturity: "16+", title: entry.title,
    year: year >= 1880 && year <= 2100 ? year : null,
    seasons: Number.isSafeInteger(data.number_of_seasons) ? Math.max(0, Math.min(1000, data.number_of_seasons as number)) : 0,
    episodeMinutes: null, synopsis: typeof data.overview === "string" ? data.overview.slice(0, 1200) : "A show listed in VidSpark’s online catalogue.",
    searchSignals: readSearchSignals(data),
    genres: classifyGenres(data, "tv"),
    art: { from: "#426283", to: "#181329", image: { poster: image(data.poster_path, "w500"), backdrop: image(data.backdrop_path, "w1280") } },
    source: { label: "VidSpark", href: "https://vidspark.to/" }, remote: { provider: "vidspark", tmdb: entry.tmdb } };
}
export function showSeasons(metadata: unknown, today: string) {
  const data = record(metadata);
  return (Array.isArray(data.seasons) ? data.seasons : []).flatMap(raw => {
    const season = record(raw), number = season.season_number;
    if (!Number.isSafeInteger(number) || (number as number) < 0 || (number as number) > 1000 ||
      typeof season.episode_count !== "number" || season.episode_count < 1 || typeof season.air_date !== "string" || season.air_date > today) return [];
    return [{ number: number as number, name: number === 0 ? "Specials" : `Season ${number}`, count: season.episode_count }];
  }).sort((a, b) => a.number - b.number);
}
export function makeOnlineEpisodes(show: SeriesTitle, season: number, metadata: unknown, today: string): FilmTitle[] {
  const data = record(metadata);
  if (!Array.isArray(data.episodes)) throw new Error("Unexpected episode guide");
  const seen = new Set<number>();
  return data.episodes.flatMap(raw => {
    const ep = record(raw), number = ep.episode_number;
    if (ep.season_number !== season || !Number.isSafeInteger(number) || (number as number) < 1 || seen.has(number as number) ||
      typeof ep.air_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ep.air_date) || ep.air_date > today) return [];
    seen.add(number as number);
    const name = typeof ep.name === "string" && ep.name.trim() ? ep.name.trim().slice(0, 160) : `Episode ${number}`;
    return [{ id: `${show.id}-s${season}-e${number}`, kind: "film" as const, title: `${show.title} · S${season} E${number}`, niche: show.niche, maturity: show.maturity,
      year: Number(ep.air_date.slice(0, 4)), minutes: typeof ep.runtime === "number" && ep.runtime > 0 && ep.runtime < 1000 ? ep.runtime : null,
      synopsis: typeof ep.overview === "string" ? ep.overview.slice(0, 1200) : "", art: show.art, source: show.source,
      genres: show.genres,
      remote: { provider: "vidspark" as const, tmdb: show.remote!.tmdb, mediaType: "tv" as const },
      episode: { seriesId: show.id, seriesTitle: show.title, season, number: number as number, name } }];
  }).sort((a, b) => a.episode!.number - b.episode!.number);
}
