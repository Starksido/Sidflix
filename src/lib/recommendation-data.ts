import { emptyPreferences, moods, recommendationKey, type RecommendationPreferences } from "@/lib/recommendations";
import { genreDefinitions } from "@/lib/genres";
import type { Title } from "@/lib/catalog";

/** Data also crosses the account API; reconstruct a bounded snapshot with safe artwork/IDs. */
export function sanitizeTasteTitle(value: unknown): Title | null {
  if (!value || typeof value !== "object") return null;
  const t = value as Title;
  const archive = t.kind === "film" && typeof t.id === "string" && /^ia-[A-Za-z0-9._-]{1,160}$/.test(t.id);
  if (!(t.kind === "film" || t.kind === "series") || typeof t.id !== "string" || t.id.length > 180 || typeof t.title !== "string"
    || !["anime", "indie"].includes(t.niche) || !["all", "7+", "13+", "16+"].includes(t.maturity)
    || !archive && (!t.remote || !Number.isSafeInteger(t.remote.tmdb) || t.remote.tmdb < 1)) return null;
  const image = (url: unknown) => typeof url === "string" && (/^https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]+\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(url) || /^https:\/\/archive\.org\/services\/img\/[a-zA-Z0-9._-]+$/.test(url)) ? url : undefined;
  const base = { id: t.id, title: t.title.slice(0, 180), niche: t.niche, maturity: t.maturity,
    synopsis: typeof t.synopsis === "string" ? t.synopsis.slice(0, 1200) : "",
    year: typeof t.year === "number" && Number.isInteger(t.year) && t.year >= 1880 && t.year <= 2100 ? t.year : null,
    genres: Array.isArray(t.genres) ? t.genres.filter(key => genreDefinitions.some(g => g.key === key)) : [],
    art: { from: "#426283", to: "#181329", image: { poster: image(t.art?.image?.poster), backdrop: image(t.art?.image?.backdrop) } } };
  if (t.kind === "series") return { ...base, kind: "series", seasons: Number.isInteger(t.seasons) ? Math.max(0, Math.min(1000, t.seasons)) : 0,
    episodeMinutes: null, remote: { provider: "vidspark", tmdb: t.remote!.tmdb } };
  let episode = undefined;
  if (t.episode && typeof t.episode.seriesId === "string" && typeof t.episode.seriesTitle === "string" && typeof t.episode.name === "string"
    && Number.isInteger(t.episode.season) && t.episode.season >= 0 && t.episode.season <= 1000 && Number.isInteger(t.episode.number) && t.episode.number >= 1 && t.episode.number <= 10000) {
    episode = { seriesId: t.episode.seriesId.slice(0, 180), seriesTitle: t.episode.seriesTitle.slice(0, 180), name: t.episode.name.slice(0, 180), season: t.episode.season, number: t.episode.number };
  }
  if (t.remote?.mediaType === "tv" && !episode) return null;
  return { ...base, kind: "film", minutes: typeof t.minutes === "number" && t.minutes > 0 && t.minutes <= 1000 ? t.minutes : null, episode,
    remote: t.remote ? { provider: "vidspark", tmdb: t.remote.tmdb, mediaType: t.remote.mediaType === "tv" ? "tv" : "movie" } : undefined };
}

export function parsePreferences(value: unknown): RecommendationPreferences {
  if (!value || typeof value !== "object") return { ...emptyPreferences };
  const data = value as Partial<RecommendationPreferences>;
  const history = (Array.isArray(data.history) ? data.history : []).slice(0, 300).flatMap(item => {
    if (!item || typeof item.itemId !== "string" || typeof item.workKey !== "string") return [];
    const title = sanitizeTasteTitle(item.title);
    if (!title || title.id !== item.itemId || recommendationKey(title) !== item.workKey
      || !Number.isFinite(item.duration) || item.duration < 1 || item.duration > 86400
      || !Number.isFinite(item.watchedSeconds) || item.watchedSeconds < 0
      || !Number.isFinite(item.lastWatchedAt) || typeof item.completed !== "boolean"
      || !Number.isInteger(item.hour) || item.hour < 0 || item.hour > 23) return [];
    return [{ ...item, title, watchedSeconds: Math.min(item.watchedSeconds, item.duration * 2), position: Number.isFinite(item.position) ? Math.max(0, Math.min(item.duration, item.position)) : 0 }];
  });
  const feedback = Object.fromEntries(Object.entries(data.feedback && typeof data.feedback === "object" ? data.feedback : {}).slice(-300).flatMap(([key, item]) => {
    const title = sanitizeTasteTitle(item?.title);
    return title && recommendationKey(title) === key && ["like", "dislike", "hide"].includes(item.value) && Number.isFinite(item.at) ? [[key, { ...item, title }]] : [];
  }));
  const mood = data.mood && /^\d{4}-\d{2}-\d{2}$/.test(data.mood.day) && moods.some(m => m.id === data.mood?.value) ? data.mood : null;
  return { history, feedback, mood, seasonal: data.seasonal !== false, trending: data.trending !== false,
    hemisphere: ["auto", "north", "south", "equatorial"].includes(data.hemisphere ?? "") ? data.hemisphere! : "auto" };
}
