import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Maturity, SeriesTitle } from "@/lib/catalog";
import { artFromSeed, clip, fetchJson } from "@/lib/sources/util";

// Anime metadata and artwork from TMDB. Required notice (shown in the footer):
// "This product uses the TMDB API but is not endorsed or certified by TMDB."

const API = "https://api.themoviedb.org/3";
const IMAGES = "https://image.tmdb.org/t/p";

type DiscoverResponse = { results: { id: number }[] };

type TvDetails = {
  id: number;
  name: string;
  overview: string;
  first_air_date?: string;
  number_of_seasons?: number;
  episode_run_time?: number[];
  last_episode_to_air?: { runtime?: number | null } | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  content_ratings?: { results: { iso_3166_1: string; rating: string }[] };
};

// US TV Parental Guidelines. Unrated titles get the strictest bucket so
// kids profiles never see something nobody has rated.
const usRating: Record<string, Maturity> = {
  "TV-Y": "all",
  "TV-G": "all",
  "TV-Y7": "7+",
  "TV-PG": "7+",
  "TV-14": "13+",
  "TV-MA": "16+",
};

function request(path: string, key: string) {
  // Accepts either a v3 API key or a v4 read access token (a JWT).
  const bearer = key.startsWith("eyJ");
  const url = new URL(`${API}${path}`);
  url.searchParams.set("language", "en-US");
  if (!bearer) url.searchParams.set("api_key", key);
  return fetchJson<unknown>(url.toString(), {
    headers: bearer ? { Authorization: `Bearer ${key}` } : undefined,
  });
}

function toTitle(tv: TvDetails): SeriesTitle | null {
  if (!tv.overview || !tv.poster_path) return null;
  const rating = tv.content_ratings?.results.find((r) => r.iso_3166_1 === "US")?.rating;
  return {
    id: `tmdb-tv-${tv.id}`,
    kind: "series",
    title: tv.name,
    niche: "anime",
    maturity: (rating && usRating[rating]) || "16+",
    year: Number(tv.first_air_date?.slice(0, 4)) || new Date().getFullYear(),
    seasons: tv.number_of_seasons || 1,
    episodeMinutes: tv.episode_run_time?.[0] || tv.last_episode_to_air?.runtime || 24,
    synopsis: clip(tv.overview, 220),
    art: {
      ...artFromSeed(tv.name),
      image: {
        poster: `${IMAGES}/w500${tv.poster_path}`,
        backdrop: tv.backdrop_path ? `${IMAGES}/w1280${tv.backdrop_path}` : undefined,
      },
    },
    source: { label: "TMDB", href: `https://www.themoviedb.org/tv/${tv.id}` },
  };
}

/** Popular Japanese animated series, or null when TMDB_API_KEY is not set. */
export async function getAnimeFromTmdb(limit = 12): Promise<SeriesTitle[] | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("source:tmdb");

  const key = process.env.TMDB_API_KEY;
  if (!key) return null;

  const discover = (await request(
    "/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&include_adult=false&vote_count.gte=50",
    key,
  )) as DiscoverResponse;

  const details = await Promise.all(
    discover.results
      .slice(0, limit + 4)
      .map((r) => request(`/tv/${r.id}?append_to_response=content_ratings`, key) as Promise<TvDetails>),
  );

  return details
    .map(toTitle)
    .filter((t) => t !== null)
    .slice(0, limit);
}
