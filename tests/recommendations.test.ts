import assert from "node:assert/strict";
import { test } from "node:test";
import type { FilmTitle, SeriesTitle, Title } from "../src/lib/catalog";
import { emptyPreferences, observePlayback, recommendationKey, recommendTitles, type RecommendationPreferences, type ViewingRecord } from "../src/lib/recommendations";
import { localClock, seasonalThemes } from "../src/lib/recommendation-context";
import { parsePreferences } from "../src/lib/recommendation-data";

const now = Date.parse("2026-07-15T18:00:00Z");
function movie(id: number, genre: "crime" | "romance" | "comedy" | "horror" = "crime"): FilmTitle {
  return { id: `online-${id}`, kind: "film", title: `Film ${id}`, niche: "indie", maturity: "16+", year: 2020, minutes: 100,
    genres: [genre], synopsis: "A story.", art: { from: "#123", to: "#456" }, remote: { provider: "vidspark", tmdb: id },
    searchSignals: { popularity: 40, rating: 7.5, votes: 1000 } };
}
function viewed(title: FilmTitle, overrides: Partial<ViewingRecord> = {}): ViewingRecord {
  return { itemId: title.id, workKey: recommendationKey(title), title, watchedSeconds: 1500, duration: 6000,
    position: 1500, completed: false, lastWatchedAt: now - 86_400_000, hour: 20, ...overrides };
}
function rank(items: Title[], preferences: RecommendationPreferences = { ...emptyPreferences }) {
  return recommendTitles({ items, preferences, now, timeZone: "Africa/Nairobi", accountSeed: "account-a", maxMaturity: "16+", count: 8 });
}

test("separate tastes change the first recommendation, even with the same catalogue", () => {
  const items = [movie(1, "crime"), movie(2, "romance"), movie(3, "comedy")];
  const crime = { ...emptyPreferences, seasonal: false, history: [viewed(movie(100, "crime"))] };
  const romance = { ...emptyPreferences, seasonal: false, history: [viewed(movie(101, "romance"))] };
  assert.equal(rank(items, crime)[0].title.id, "online-1");
  assert.equal(rank(items, romance)[0].title.id, "online-2");
  assert.match(rank(items, crime)[0].reason, /Film 100/);
});

test("daily mood changes the picks and expires on the viewer's local date", () => {
  const items = [movie(1, "crime"), movie(2, "romance"), movie(3, "comedy"), movie(4, "horror")];
  const p: RecommendationPreferences = { ...emptyPreferences, seasonal: false, mood: { day: "2026-07-15", value: "heartfelt" } };
  assert.equal(rank(items, p)[0].title.id, "online-2");
  const expired = { ...p, mood: { ...p.mood!, day: "2026-07-14" } };
  assert.deepEqual(rank(items, expired), rank(items, { ...p, mood: null }));
  assert.equal(localClock(Date.parse("2026-07-15T22:00Z"), "Africa/Nairobi").day, "2026-07-16");
});

test("seeking, rewinding, resuming late and sitting paused do not manufacture viewing time", () => {
  const title = movie(10), p = { ...emptyPreferences };
  assert.equal(observePlayback(p, title, 5000, 6000, now, "UTC"), p);
  assert.equal(observePlayback(p, title, 5000, 6000, now, "UTC", { time: now - 1000, position: 10 }), p);
  assert.equal(observePlayback(p, title, 10, 6000, now, "UTC", { time: now - 1000, position: 10 }), p);
  assert.equal(observePlayback(p, title, 10, 6000, now, "UTC", { time: now - 1000, position: 100 }), p);
  const updated = observePlayback(p, title, 40, 6000, now, "UTC", { time: now - 10_000, position: 30 });
  assert.equal(updated.history[0].watchedSeconds, 10);
  assert.equal(p.history.length, 0);
});

test("completion remains in taste history but completed films and current watches leave discovery picks", () => {
  const title = movie(10);
  const initial = { ...emptyPreferences, history: [viewed(title, { watchedSeconds: 5700 })] };
  const updated = observePlayback(initial, title, 5999, 6000, now, "UTC", { time: now - 10_000, position: 5989 });
  assert.equal(updated.history[0].completed, true);
  assert.equal(updated.history[0].watchedSeconds, 5710);
  assert.ok(!rank([title, movie(11)], updated).some(pick => pick.title.id === title.id));
  assert.ok(!rank([title, movie(11)], initial).some(pick => pick.title.id === title.id));
});

test("episode and catalogue aliases share one identity and do not fill the row with episodes", () => {
  const show: SeriesTitle = { ...movie(20), id: "online-tv-20", kind: "series", seasons: 2, episodeMinutes: 45, remote: { provider: "vidspark", tmdb: 20 } };
  const episode: FilmTitle = { ...movie(20), id: "online-tv-20-s1-e1", episode: { seriesId: show.id, seriesTitle: "Show 20", season: 1, number: 1, name: "Pilot" }, remote: { provider: "vidspark", tmdb: 20, mediaType: "tv" } };
  assert.equal(recommendationKey(show), recommendationKey(episode));
  assert.equal(rank([show, { ...show, id: "anime-alias-20" }, episode]).length, 1);
});

test("dislikes, hidden local files, placeholders, future titles and maturity restrictions are respected", () => {
  const hidden = movie(1), local = { ...movie(2), id: "lib-secret", local: true }, future = { ...movie(3), year: 2090 };
  const placeholder = { ...movie(4), remote: undefined };
  const p: RecommendationPreferences = { ...emptyPreferences, feedback: { [recommendationKey(hidden)]: { value: "dislike", title: hidden, at: now } } };
  assert.deepEqual(rank([hidden, local, future, placeholder], p), []);
  assert.equal(recommendTitles({ items: [movie(5)], preferences: p, now, timeZone: "UTC", accountSeed: "kid", maxMaturity: "7+" }).length, 0);
});

test("cold start is deterministic, vote confidence matters and an empty catalogue is safe", () => {
  const voted = { ...movie(1), searchSignals: { popularity: 40, rating: 8.5, votes: 5000 } };
  const oneVote = { ...movie(2), searchSignals: { popularity: 40, rating: 9.9, votes: 1 } };
  const p = { ...emptyPreferences, seasonal: false };
  assert.equal(rank([oneVote, voted], p)[0].title.id, voted.id);
  assert.deepEqual(rank([oneVote, voted], p), rank([oneVote, voted], p));
  assert.deepEqual(rank([], p), []);
});

test("seasonal windows handle New Year, hemispheres, explicit event expiry and neutral time zones", () => {
  assert.ok(seasonalThemes(Date.parse("2026-12-25T18:00Z"), "UTC", "north").some(t => t.label === "Festive favourites"));
  assert.ok(seasonalThemes(Date.parse("2027-01-02T18:00Z"), "UTC", "south").some(t => t.label === "A fresh start"));
  assert.ok(seasonalThemes(now, "UTC", "north").some(t => t.label === "Summer escapes"));
  assert.ok(seasonalThemes(now, "UTC", "south").some(t => t.label === "Cosy evenings"));
  const event = { starts: "2026-07-01", ends: "2026-07-14", label: "Expired event", genres: ["crime" as const] };
  assert.ok(!seasonalThemes(now, "Africa/Nairobi", "auto", [event]).some(t => t.label === event.label));
  assert.doesNotThrow(() => localClock(now, "invalid/time-zone"));
});

test("stored account data is bounded and unsafe artwork, ids and malformed records are discarded", () => {
  const title = { ...movie(1), art: { from: "#000", to: "#111", image: { poster: "https://attacker.example/track.png" } } };
  const parsed = parsePreferences({ history: [viewed(title), { ...viewed(movie(2)), watchedSeconds: Infinity }], hemisphere: "invalid" });
  assert.equal(parsed.history.length, 1);
  assert.equal(parsed.history[0].title.art.image?.poster, undefined);
  assert.equal(parsed.hemisphere, "auto");
});
