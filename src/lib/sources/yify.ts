import "server-only";
import type { Title } from "@/lib/catalog";
import { artFromSeed } from "@/lib/sources/util";

const YTS_BASE_URL = process.env.YTS_API_URL ?? 'https://yts.mx/api/v2';
const SEARCH_LIMIT = 10;

interface YtsTorrent {
  url: string;
  hash: string;
  quality: string;
  type: string;
  size: string;
  size_bytes: number;
  seeds: number;
  peers: number;
}

interface YtsMovie {
  id: number;
  title: string;
  year: number;
  rating: number;
  runtime: number;
  genres?: string[];
  summary?: string;
  synopsis?: string;
  description_full?: string;
  medium_cover_image?: string;
  large_cover_image?: string;
  torrents?: YtsTorrent[];
}

interface YtsListResponse {
  status: 'ok' | 'error';
  status_message: string;
  data: {
    movie_count: number;
    movies?: YtsMovie[]; // omitted entirely when there are no results
  };
}

// Typed mapper: if Title gains or renames a required field, TypeScript
// flags it here instead of the old `as Title[]` cast silently hiding it.
function toTitle(movie: YtsMovie): Title {
  return {
    id: `yify-${movie.id}`,
    kind: "film",
    title: movie.title,
    niche: "indie",
    maturity: "16+",
    year: movie.year,
    minutes: movie.runtime,
    synopsis: movie.synopsis || movie.description_full || movie.summary || '',
    art: artFromSeed(`yify-${movie.id}`),
  };
}

/**
 * Returns [] for an empty query or no matches, and null when the
 * upstream request fails (picked up by settle() in search.ts).
 */
export async function searchYifyMovies(
  searchQuery: string
): Promise<Title[] | null> {
  const query = searchQuery.trim();
  if (!query) return [];

  const params = new URLSearchParams({
    query_term: query,
    limit: String(SEARCH_LIMIT),
  });
  const url = `${YTS_BASE_URL}/list_movies.json?${params}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error(`YTS API responded with HTTP ${res.status}`);
      return null;
    }

    const json = (await res.json()) as YtsListResponse;

    if (json.status !== 'ok') {
      console.error(`YTS API error: ${json.status_message}`);
      return null;
    }

    const movies = json.data?.movies ?? [];

    // YTS occasionally returns the same movie twice; keep ids unique for React keys
    const seen = new Set<number>();
    return movies
      .filter((movie) => !seen.has(movie.id) && seen.add(movie.id))
      .map(toTitle);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.name === 'TimeoutError'
          ? 'request timed out'
          : error.message
        : String(error);
    console.error(`Error communicating with YTS API: ${message}`);
    return null;
  }
}
