import "server-only";
import { cacheLife } from "next/cache";
import { genreDefinitions } from "@/lib/genres";
import { getGenreSections, getGenreShowIndex } from "@/lib/sources/genres";
import { requestTmdb } from "@/lib/sources/online-shows";
import { getOnlineMovies } from "@/lib/sources/online-movies";
import { parseOnlineMoviePage } from "@/lib/online-movies";
import { record } from "@/lib/online-shows";
import { recommendationKey } from "@/lib/recommendations";
import type { Title } from "@/lib/catalog";

/** Shared discovery pool only. Private ranking/history never enter this cache. */
export async function getRecommendationCatalog() {
  "use cache";
  cacheLife("hours");
  const [shows, sections, movies, topRated, trend] = await Promise.all([
    getGenreShowIndex().catch(() => null), getGenreSections().catch(() => null),
    getOnlineMovies(1, "popular", "").catch(() => null), getOnlineMovies(1, "top-rated", "").catch(() => null),
    requestTmdb("trending/all/week").then(record).catch(() => null),
  ]);
  const selected = new Map<string, Title>();
  const add = (title: Title) => { if (!selected.has(recommendationKey(title))) selected.set(recommendationKey(title), title); };
  const trendingKeys: string[] = [];
  const rows = Array.isArray(trend?.results) ? trend.results.map(record) : [];
  const trendingMovies = parseOnlineMoviePage({ results: rows.filter(row => row.media_type === "movie") }).items;
  trendingMovies.forEach(title => { add(title); trendingKeys.push(recommendationKey(title)); });
  for (const row of rows.filter(row => row.media_type === "tv")) {
    const show = shows?.items.find(title => title.remote?.tmdb === row.id);
    if (show) { add(show); trendingKeys.push(recommendationKey(show)); }
  }
  for (const genre of genreDefinitions) {
    shows?.items.filter(title => title.genres?.includes(genre.key)).slice(0, 40).forEach(add);
  }
  shows?.items.slice(0, 240).forEach(add);
  sections?.sections.flatMap(section => section.items).forEach(add);
  movies?.items.forEach(add); topRated?.items.forEach(add);
  return { items: [...selected.values()].slice(0, 1000), trendingKeys, generatedAt: Date.now(),
    partial: !shows || !sections || !movies || !trend || shows.partial || sections.partial };
}
