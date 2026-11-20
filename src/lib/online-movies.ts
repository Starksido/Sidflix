import type { FilmTitle } from "@/lib/catalog";
import { readSearchSignals } from "@/lib/search-relevance";
import { classifyGenres } from "@/lib/genres";

export type MovieSort = "popular" | "top-rated" | "now-playing";
export type OnlineMoviePage = { items: FilmTitle[]; page: number; totalPages: number; totalResults: number };

export function onlineMovieParams(input: { page?: string | null; sort?: string | null; query?: string | null }) {
  const page = Number(input.page ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > 500) throw new Error("Page must be between 1 and 500");
  const sort = input.sort ?? "popular";
  if (sort !== "popular" && sort !== "top-rated" && sort !== "now-playing") throw new Error("Unknown movie sort");
  return { page, sort: sort as MovieSort, query: (input.query ?? "").trim().replace(/\s+/g, " ").slice(0, 80) };
}

/** Treat all remote metadata as untrusted; never use supplied player URLs. */
export function parseOnlineMoviePage(value: unknown): OnlineMoviePage {
  if (!value || typeof value !== "object" || !Array.isArray((value as { results?: unknown }).results)) throw new Error("Unexpected movie catalogue response");
  const data = value as Record<string, unknown>;
  const items: FilmTitle[] = [];
  const seen = new Set<number>();
  for (const entry of data.results as unknown[]) {
    if (!entry || typeof entry !== "object") continue;
    const movie = entry as Record<string, unknown>;
    if (!Number.isSafeInteger(movie.id) || (movie.id as number) < 1 || movie.adult === true ||
      typeof movie.title !== "string" || !movie.title.trim() || seen.has(movie.id as number)) continue;
    const id = movie.id as number;
    seen.add(id);
    const image = (path: unknown, size: string) => typeof path === "string" && /^\/[a-zA-Z0-9_-]+\.(?:jpg|png|webp)$/.test(path)
      ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;
    const year = typeof movie.release_date === "string" ? Number(movie.release_date.slice(0, 4)) : NaN;
    items.push({ id: `online-${id}`, kind: "film", title: movie.title.trim().slice(0, 100), niche: "indie",
      // TMDB's adult=false flag is not an age certificate. Keep unrated entries off child profiles.
      maturity: "16+", year: year >= 1880 && year <= 2100 ? year : null, minutes: null,
      synopsis: typeof movie.overview === "string" ? movie.overview.trim().slice(0, 1200) : "Film details from the online catalogue.",
      art: { from: "#54708e", to: "#12152c", image: { poster: image(movie.poster_path, "w500"), backdrop: image(movie.backdrop_path, "w1280") } },
      searchSignals: readSearchSignals(movie),
      genres: classifyGenres(movie, "movie"),
      remote: { provider: "vidspark", tmdb: id }, source: { label: "TMDB", href: `https://www.themoviedb.org/movie/${id}` } });
  }
  return { items, page: typeof data.page === "number" && Number.isSafeInteger(data.page) && data.page >= 1 && data.page <= 500 ? data.page : 1,
    totalPages: typeof data.total_pages === "number" && Number.isSafeInteger(data.total_pages) ? Math.max(1, Math.min(500, data.total_pages)) : 1,
    totalResults: typeof data.total_results === "number" && Number.isSafeInteger(data.total_results) ? Math.max(0, data.total_results) : items.length };
}
