import "server-only";
import { cacheLife } from "next/cache";
import { parseOnlineMoviePage, type MovieSort, type OnlineMoviePage } from "@/lib/online-movies";
import { fetchJson } from "@/lib/sources/util";

export async function getOnlineMovies(page = 1, sort: MovieSort = "popular", query = ""): Promise<OnlineMoviePage> {
  "use cache";
  cacheLife("minutes");
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("Online movie catalogue is not configured");
  const route = query ? "search/movie" : `movie/${sort === "top-rated" ? "top_rated" : sort === "now-playing" ? "now_playing" : "popular"}`;
  const url = new URL(`https://api.themoviedb.org/3/${route}`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("language", "en-US");
  url.searchParams.set("include_adult", "false");
  if (query) url.searchParams.set("query", query);
  const bearer = key.startsWith("eyJ");
  if (!bearer) url.searchParams.set("api_key", key);
  return parseOnlineMoviePage(await fetchJson(url.toString(), bearer ? { headers: { Authorization: `Bearer ${key}` } } : undefined));
}
