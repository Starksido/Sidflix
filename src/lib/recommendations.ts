import { isAllowed, type FilmTitle, type Maturity, type Title } from "@/lib/catalog";
import { genreDefinitions, type GenreKey } from "@/lib/genres";
import { isVisibleInBrowse } from "@/lib/library-visibility";
import { localClock, seasonalThemes, type Hemisphere, type RecommendationTheme } from "@/lib/recommendation-context";

export const moods = [
  { id: "auto", label: "For me", genres: [] },
  { id: "comfort", label: "Something cosy", genres: ["comedy", "animation", "romance"] },
  { id: "excited", label: "An adrenaline rush", genres: ["action", "adventure", "crime"] },
  { id: "curious", label: "Make me curious", genres: ["documentary", "historical-biopic", "science-fiction"] },
  { id: "heartfelt", label: "All the feelings", genres: ["romance", "drama", "musical"] },
  { id: "escape", label: "Take me somewhere", genres: ["fantasy", "adventure", "science-fiction"] },
  { id: "tense", label: "Keep me guessing", genres: ["mystery", "horror", "crime"] },
] as const satisfies readonly { id: string; label: string; genres: readonly GenreKey[] }[];
export type Mood = typeof moods[number]["id"];
export type ViewingRecord = {
  itemId: string; workKey: string; title: Title; watchedSeconds: number; duration: number;
  completed: boolean; lastWatchedAt: number; hour: number; position: number;
};
export type TasteFeedback = { value: "like" | "dislike" | "hide"; title: Title; at: number };
export type RecommendationPreferences = {
  history: ViewingRecord[];
  feedback: Record<string, TasteFeedback>;
  mood: { day: string; value: Mood } | null;
  seasonal: boolean;
  trending: boolean;
  hemisphere: Hemisphere;
};
export const emptyPreferences: RecommendationPreferences = { history: [], feedback: {}, mood: null, seasonal: true, trending: true, hemisphere: "auto" };
export type PlaybackSample = { time: number; position: number };
export type RecommendedTitle = { title: Title; score: number; reason: string };

/** One identity per work, even across different catalogue aliases and individual episodes. */
export function recommendationKey(title: Title): string {
  if (title.kind === "series" && title.remote) return `tv:${title.remote.tmdb}`;
  if (title.kind === "film") {
    if (title.remote) return `${title.remote.mediaType === "tv" ? "tv" : "movie"}:${title.remote.tmdb}`;
    if (title.episode) return title.episode.seriesId;
  }
  return title.id;
}

/** Count elapsed playback, not seek jumps, tab-open time, clicks or fabricated progress. */
export function observePlayback(preferences: RecommendationPreferences, title: FilmTitle, position: number, duration: number, now: number, timeZone: string, previous?: PlaybackSample): RecommendationPreferences {
  if (![position, duration, now].every(Number.isFinite) || duration <= 0 || position < 0 || position > duration + 2) return preferences;
  const elapsed = previous ? (now - previous.time) / 1000 : 0;
  const movement = previous ? position - previous.position : 0;
  const seconds = elapsed > 0 && elapsed <= 60 && movement > 0 && movement <= elapsed * 2.5 + 2 ? Math.min(movement, elapsed * 2) : 0;
  if (seconds === 0) return preferences;
  const existing = preferences.history.find(item => item.itemId === title.id);
  const watchedSeconds = Math.min(duration * 2, (existing?.watchedSeconds ?? 0) + seconds);
  const entry: ViewingRecord = { itemId: title.id, workKey: recommendationKey(title), title,
    watchedSeconds, duration, completed: existing?.completed === true || position >= duration * .97 && watchedSeconds >= Math.min(120, duration * .5),
    lastWatchedAt: now, hour: localClock(now, timeZone).hour, position };
  return { ...preferences, history: [entry, ...preferences.history.filter(item => item.itemId !== title.id)].slice(0, 300) };
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const overlap = (a: readonly string[], b: readonly string[]) => a.filter(item => b.includes(item)).length / Math.max(1, Math.min(a.length, b.length));
function quality(title: Title): number {
  const s = title.searchSignals;
  if (!s) return .45;
  const votes = Math.max(0, s.votes), rating = Math.max(0, Math.min(10, s.rating));
  return clamp(((rating * votes + 6.5 * 250) / (votes + 250) / 10) * .8 + Math.min(1, Math.log1p(Math.max(0, s.popularity)) / 8) * .2);
}
function noise(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return (hash >>> 0) / 4294967295;
}
function themeMatch(title: Title, theme: RecommendationTheme) {
  const text = `${title.title} ${title.synopsis}`.toLowerCase();
  const explicit = theme.words?.some(word => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
  return explicit ? 1 : overlap(title.genres ?? [], theme.genres) * .45;
}

export function recommendTitles(input: {
  items: readonly Title[]; preferences: RecommendationPreferences; accountSeed: string;
  now: number; timeZone: string; maxMaturity: Maturity; trendingKeys?: readonly string[]; count?: number;
}): RecommendedTitle[] {
  const { preferences: p, now, timeZone } = input;
  const { day, hour } = localClock(now, timeZone);
  const mood = moods.find(mood => mood.id === (p.mood?.day === day ? p.mood.value : "auto")) ?? moods[0];
  const themes = p.seasonal ? seasonalThemes(now, timeZone, p.hemisphere) : [];
  const candidates = new Map<string, Title>();
  for (const title of input.items) {
    if (!(title.kind === "film" || title.kind === "series") || title.kind === "film" && title.episode || !isAllowed(title.maturity, input.maxMaturity) || !isVisibleInBrowse(title)) continue;
    if (title.year !== null && title.year > Number(day.slice(0, 4))) continue;
    // No placeholder recommendations, unplayable catalogue stubs or future-dated titles.
    if (!title.remote && !(title.kind === "film" && (title.video || title.id.startsWith("ia-"))) && !(title.kind === "series" && title.episodes?.length)) continue;
    const key = recommendationKey(title);
    if (!candidates.has(key)) candidates.set(key, title);
  }
  const genres = new Map<GenreKey, number>(), formats = new Map<string, number>();
  const sources = new Map<GenreKey, { name: string; weight: number }>();
  const consumed = new Set<string>(), inProgress = new Set<string>();
  const byWork = new Map<string, { weight: number; title: Title }>();
  let animeWeight = 0, totalWeight = 0;
  for (const item of p.history) {
    const title = candidates.get(item.workKey) ?? item.title;
    if (!isAllowed(title.maturity, input.maxMaturity) || !isVisibleInBrowse(title)) continue;
    const recency = 2 ** (-Math.max(0, now - item.lastWatchedAt) / (45 * 86_400_000));
    const interest = Math.min(1.6, Math.log1p(item.watchedSeconds / 180)) * recency;
    const sameTime = Math.abs(hour - item.hour) <= 3 ? 1.1 : 1;
    const old = byWork.get(item.workKey);
    byWork.set(item.workKey, { title, weight: Math.min(3, (old?.weight ?? 0) + interest * sameTime) });
    if (item.completed && item.title.kind === "film" && !item.title.episode) consumed.add(item.workKey);
    if (!item.completed && item.watchedSeconds >= 60 && now - item.lastWatchedAt < 30 * 86_400_000) inProgress.add(item.workKey);
  }
  for (const [key, feedback] of Object.entries(p.feedback)) {
    if (feedback.value === "like" && isAllowed(feedback.title.maturity, input.maxMaturity) && isVisibleInBrowse(feedback.title)) {
      const old = byWork.get(key);
      byWork.set(key, { title: candidates.get(key) ?? feedback.title, weight: Math.min(4, (old?.weight ?? 0) + 2) });
    }
  }
  for (const { title, weight } of byWork.values()) {
    totalWeight += weight;
    const kind = title.kind === "film" && title.episode ? "series" : title.kind;
    formats.set(kind, (formats.get(kind) ?? 0) + weight);
    if (title.niche === "anime") animeWeight += weight;
    for (const genre of title.genres ?? []) {
      const signal = weight / Math.sqrt(title.genres!.length);
      genres.set(genre, (genres.get(genre) ?? 0) + signal);
      if (signal > (sources.get(genre)?.weight ?? 0)) sources.set(genre, { name: title.kind === "film" && title.episode ? title.episode.seriesTitle : title.title, weight: signal });
    }
  }
  for (const feedback of Object.values(p.feedback)) {
    if (feedback.value !== "dislike") continue;
    for (const genre of feedback.title.genres ?? []) genres.set(genre, Math.max(0, (genres.get(genre) ?? 0) - .35));
  }
  const maxGenre = Math.max(.5, ...genres.values()), maxFormat = Math.max(1, ...formats.values());
  const warm = clamp(totalWeight / 2);
  const trending = new Set(p.trending ? input.trendingKeys ?? [] : []);
  const ranked: RecommendedTitle[] = [];
  for (const [key, title] of candidates) {
    const feedback = p.feedback[key];
    if (feedback?.value === "dislike" || feedback?.value === "hide" || consumed.has(key) || inProgress.has(key)) continue;
    const tags = title.genres ?? [];
    const favourite = [...tags].sort((a, b) => (genres.get(b) ?? 0) - (genres.get(a) ?? 0))[0];
    const affinity = tags.length ? tags.reduce((n, genre) => n + (genres.get(genre) ?? 0) / maxGenre, 0) / Math.sqrt(tags.length) : .1;
    const taste = clamp(affinity * .75 + ((formats.get(title.kind) ?? 0) / maxFormat) * .15 + (title.niche === "anime" ? animeWeight / Math.max(1, totalWeight) : 0) * .1);
    const moodFit = overlap(tags, mood.genres);
    const theme = themes.map(theme => ({ theme, match: themeMatch(title, theme) })).sort((a, b) => b.match - a.match)[0];
    const daily = noise(`${input.accountSeed}:${day}:${key}`);
    const score = taste * .52 * warm + quality(title) * (.28 - .12 * warm)
      + moodFit * .22 + (theme?.match ?? 0) * .08 + (trending.has(key) ? .07 : 0) + daily * .035
      + (feedback?.value === "like" ? .12 : 0);
    const genreName = genreDefinitions.find(genre => genre.key === favourite)?.label.toLowerCase();
    const reason = moodFit >= .5 ? mood.label
      : warm > .25 && favourite && (genres.get(favourite) ?? 0) / maxGenre > .5 ? `Because you enjoyed ${sources.get(favourite)?.name ?? genreName}`
        : theme && theme.match > .5 ? theme.theme.label
          : trending.has(key) ? "In the conversation this week"
            : genreName && warm > .25 ? `A new side of ${genreName}` : "Something worth discovering";
    ranked.push({ title, score, reason });
  }
  // Greedy diversity: retain relevance while avoiding one-genre/one-format walls.
  const result: RecommendedTitle[] = [];
  const pool = ranked.sort((a, b) => b.score - a.score || a.title.id.localeCompare(b.title.id));
  while (pool.length && result.length < (input.count ?? 16)) {
    let best = 0, bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const recent = result.slice(-4);
      const similarity = recent.length ? recent.reduce((n, chosen) => n + overlap(pool[i].title.genres ?? [], chosen.title.genres ?? []), 0) / recent.length : 0;
      const formatPenalty = recent.length >= 3 && recent.every(chosen => chosen.title.kind === pool[i].title.kind) ? .045 : 0;
      const score = pool[i].score - similarity * .075 - formatPenalty;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    result.push(pool.splice(best, 1)[0]);
  }
  return result;
}
