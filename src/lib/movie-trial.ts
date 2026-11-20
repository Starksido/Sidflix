export const MOVIE_TRIAL_ORIGIN = "https://vidsrc.sh";

export const trialMovies = [
  { imdb: "tt1375666", tmdb: 27205, title: "Inception", year: 2010, color: "#36515d" },
  { imdb: "tt0816692", tmdb: 157336, title: "Interstellar", year: 2014, color: "#8c724f" },
  { imdb: "tt0468569", tmdb: 155, title: "The Dark Knight", year: 2008, color: "#303e68" },
] as const;

export type TrialMovie = (typeof trialMovies)[number];
type MovieId = { imdb?: string; tmdb: number };

export function trialEmbedUrl(movie: MovieId): string {
  return `${MOVIE_TRIAL_ORIGIN}/embed/movie/${movie.imdb ?? movie.tmdb}?ds_lang=en`;
}

export function trialInfoUrl(movie: MovieId): string {
  return `${MOVIE_TRIAL_ORIGIN}/info/movie/${movie.imdb ?? movie.tmdb}.json`;
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function matchesMovie(value: Record<string, unknown>, movie: MovieId, imdbKey: string, tmdbKey: string): boolean {
  const imdb = value[imdbKey];
  const tmdb = value[tmdbKey];
  const hasImdb = imdb !== undefined && imdb !== null;
  const hasTmdb = tmdb !== undefined && tmdb !== null;
  const tmdbMatches = hasTmdb && (typeof tmdb === "string" || typeof tmdb === "number") && String(tmdb) === String(movie.tmdb);
  return ((hasImdb && movie.imdb !== undefined && imdb === movie.imdb) || tmdbMatches) &&
    (!hasImdb || movie.imdb === undefined || imdb === movie.imdb) && (!hasTmdb || tmdbMatches);
}

/** Availability is a provider claim; this does not confirm that video plays. */
export function parseTrialAvailability(value: unknown, movie: MovieId): { quality: string } | null {
  const data = object(value);
  if (!data || data.status_code !== 200 || data.type !== "movie" || !matchesMovie(data, movie, "imdb_id", "tmdb_id")) return null;
  return { quality: typeof data.quality === "string" ? data.quality.slice(0, 16) : "Unknown" };
}

export type TrialPlayerEvent = {
  status: "playing" | "paused" | "completed" | "seeked";
  progress: number;
  duration: number;
};

/** Ignore other windows, other origins, unrelated films and malformed messages. */
export function parseTrialPlayerEvent(value: unknown, origin: string, fromCurrentFrame: boolean, movie: MovieId): TrialPlayerEvent | null {
  if (origin !== MOVIE_TRIAL_ORIGIN || !fromCurrentFrame) return null;
  const envelope = object(value);
  const data = object(envelope?.data);
  const info = object(data?.player_info);
  if (envelope?.type !== "PLAYER_EVENT" || !data || !info || info.mediaType !== "movie" ||
    !matchesMovie(info, movie, "imdb", "tmdb")) return null;
  const status = data.player_status;
  const progress = data.player_progress;
  const duration = data.player_duration;
  if (status !== "playing" && status !== "paused" && status !== "completed" && status !== "seeked") return null;
  // All three trial titles are feature films. Short ad-video events are not results.
  if (typeof progress !== "number" || !Number.isFinite(progress) || progress < 0 ||
    typeof duration !== "number" || !Number.isFinite(duration) || duration < 3600 || progress > duration + 2) return null;
  return { status, progress, duration };
}
