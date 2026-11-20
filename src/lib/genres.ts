import type { FilmTitle, SeriesTitle, Title } from "@/lib/catalog";

export const genreDefinitions = [
  { key: "action", label: "Action", movieId: 28, tvIds: [10759] },
  { key: "adventure", label: "Adventure", movieId: 12, tvIds: [10759] },
  { key: "animation", label: "Animation", movieId: 16, tvIds: [16] },
  { key: "comedy", label: "Comedy", movieId: 35, tvIds: [35] },
  { key: "crime", label: "Crime", movieId: 80, tvIds: [80] },
  { key: "documentary", label: "Documentary", movieId: 99, tvIds: [99] },
  { key: "drama", label: "Drama", movieId: 18, tvIds: [18] },
  { key: "fantasy", label: "Fantasy", movieId: 14, tvIds: [10765] },
  { key: "historical-biopic", label: "Historical / Biopic", movieId: 36, tvIds: [36] },
  { key: "horror", label: "Horror", movieId: 27, tvIds: [27] },
  { key: "musical", label: "Musical", movieId: null, tvIds: [] },
  { key: "mystery", label: "Mystery", movieId: 9648, tvIds: [9648] },
  { key: "romance", label: "Romance", movieId: 10749, tvIds: [10749] },
  { key: "science-fiction", label: "Science Fiction", movieId: 878, tvIds: [10765] },
] as const;
export type GenreKey = typeof genreDefinitions[number]["key"];
export type GenreTitle = FilmTitle | SeriesTitle;
export type GenreSort = "popular" | "top-rated";
export type GenrePage = { items: GenreTitle[]; page: number; totalPages: number; totalResults: number; partial: boolean };
export type GenreSection = { key: GenreKey; label: string; items: GenreTitle[] };

export function genreDefinition(key: string) { return genreDefinitions.find(genre => genre.key === key); }

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

const keywordGroups: Partial<Record<GenreKey, string[]>> = {
  "historical-biopic": ["historical", "historical drama", "historical fiction", "historical figure", "period drama", "biography", "biographical", "biopic"],
  horror: ["horror", "horror comedy", "supernatural horror", "psychological horror", "body horror", "folk horror", "slasher", "zombie", "zombie apocalypse"],
  musical: ["musical", "musical comedy", "musical drama", "stage musical", "musical theatre", "song and dance"],
  romance: ["romance", "romantic comedy", "romantic drama", "teen romance", "love story"],
};

/** Source genre tags plus explicit keywords; never infer genres from a title's words. */
export function classifyGenres(value: unknown, type: "movie" | "tv"): GenreKey[] {
  const data = object(value);
  const ids = new Set((Array.isArray(data.genre_ids) ? data.genre_ids : Array.isArray(data.genres) ? data.genres.map(genre => object(genre).id) : []).filter(id => typeof id === "number" && Number.isSafeInteger(id)));
  const keywords = object(data.keywords);
  const rawWords = Array.isArray(keywords.results) ? keywords.results : Array.isArray(keywords.keywords) ? keywords.keywords : [];
  const words = new Set(rawWords.map(row => object(row).name).filter((word): word is string => typeof word === "string").map(word => word.trim().toLowerCase()));
  return genreDefinitions.filter(genre => {
    const direct = type === "movie" ? genre.movieId !== null && ids.has(genre.movieId) : genre.tvIds.some(id => ids.has(id));
    return direct || keywordGroups[genre.key]?.some(word => words.has(word));
  }).map(genre => genre.key);
}

export function genreFilters(params: URLSearchParams) {
  const page = Number(params.get("page") ?? 1), type = params.get("type") ?? "shows", sort = params.get("sort") ?? "popular";
  if (!Number.isSafeInteger(page) || page < 1 || page > 500 || !["shows", "movies"].includes(type) || !["popular", "top-rated"].includes(sort)) throw new Error("Invalid genre filters");
  return { page, type: type as "shows" | "movies", sort: sort as GenreSort };
}

export function sortGenreTitles<T extends Title>(items: T[], sort: GenreSort): T[] {
  const rating = (title: Title) => { const s = title.searchSignals; return s && s.votes > 0 && s.rating > 0 ? (s.rating * s.votes + 6.5 * 250) / (s.votes + 250) : -1; };
  return items.toSorted((a, b) => sort === "top-rated" ? rating(b) - rating(a) || (b.searchSignals?.votes ?? 0) - (a.searchSignals?.votes ?? 0) : (b.searchSignals?.popularity ?? 0) - (a.searchSignals?.popularity ?? 0) || (b.searchSignals?.votes ?? 0) - (a.searchSignals?.votes ?? 0));
}

export function selectGenreShows(items: SeriesTitle[], genre: GenreKey, page: number, sort: GenreSort, size = 20): GenrePage {
  const selected = sortGenreTitles(items.filter(title => title.genres?.includes(genre)), sort);
  const totalResults = selected.length, totalPages = Math.max(1, Math.ceil(totalResults / size)), current = Math.min(page, totalPages);
  return { items: selected.slice((current - 1) * size, current * size), page: current, totalPages, totalResults, partial: false };
}

export function mixGenreTitles(shows: SeriesTitle[], movies: FilmTitle[], count = 12): GenreTitle[] {
  const items: GenreTitle[] = [], seen = new Set<string>();
  for (let index = 0; index < Math.max(shows.length, movies.length) && items.length < count; index++) {
    for (const title of [shows[index], movies[index]]) {
      if (title && !seen.has(title.id) && items.length < count) { items.push(title); seen.add(title.id); }
    }
  }
  return items;
}
