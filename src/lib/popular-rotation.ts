/** Shared three-day windows, starting at midnight in Nairobi on 17 November 2026. */
export const POPULAR_ROTATION_START = Date.UTC(2026, 10, 16, 21);
export const POPULAR_ROTATION_MS = 3 * 24 * 60 * 60 * 1000;

export function popularRotation(now: number) {
  const cycle = Math.max(0, Math.floor((now - POPULAR_ROTATION_START) / POPULAR_ROTATION_MS));
  return { cycle, page: 1 + cycle % 3, nextAt: POPULAR_ROTATION_START + (cycle + 1) * POPULAR_ROTATION_MS };
}

/** Keep both movies and shows near the top instead of putting every film first. */
export function mixPopularTitles<T extends { id: string }>(movies: readonly T[], shows: readonly T[]): T[] {
  const seen = new Set<string>(), items: T[] = [];
  for (let index = 0; index < Math.max(movies.length, shows.length); index++) {
    for (const title of [movies[index], shows[index]]) {
      if (title && !seen.has(title.id)) { seen.add(title.id); items.push(title); }
    }
  }
  return items;
}
