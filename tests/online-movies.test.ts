import assert from "node:assert/strict";
import { test } from "node:test";
import { onlineMovieParams, parseOnlineMoviePage } from "../src/lib/online-movies";
import { parseTrialPlayerEvent } from "../src/lib/movie-trial";

test("online catalogue creates remote films without local paths or arbitrary player URLs", () => {
  const entry = { id: 27205, title: "Inception", release_date: "2010-07-16", overview: "Dreams within dreams.", poster_path: "/poster.jpg", backdrop_path: "https://bad.example/photo.jpg", embed_url: "https://bad.example/player" };
  const page = parseOnlineMoviePage({ page: 2, total_pages: 700, total_results: 14000, results: [entry, entry,
    { ...entry, id: 1, adult: true }, { ...entry, id: "2" }, { ...entry, id: -1 }, null] });
  assert.equal(page.items.length, 1);
  const film = page.items[0];
  assert.deepEqual(film.remote, { provider: "vidspark", tmdb: 27205 });
  assert.equal(film.local, undefined);
  assert.equal(film.video, undefined);
  assert.equal(film.art.image?.poster, "https://image.tmdb.org/t/p/w500/poster.jpg");
  assert.equal(film.art.image?.backdrop, undefined);
  assert.equal(film.maturity, "16+");
  assert.equal(page.totalPages, 500);
  const invalidCounts = parseOnlineMoviePage({ results: [], page: NaN, total_pages: Infinity, total_results: -1 });
  assert.deepEqual(invalidCounts, { items: [], page: 1, totalPages: 1, totalResults: 0 });
  assert.throws(() => parseOnlineMoviePage({ results: "not an array" }));
});

test("online browsing limits pages and normalizes full-database search", () => {
  assert.deepEqual(onlineMovieParams({ page: "2", sort: "top-rated", query: "  The   Dark Knight " }), { page: 2, sort: "top-rated", query: "The Dark Knight" });
  for (const page of ["0", "501", "1.5", "not a page"]) assert.throws(() => onlineMovieParams({ page }));
  assert.throws(() => onlineMovieParams({ sort: "custom-url" }));
});

test("remote player requires a matching known identifier when only TMDB is known", () => {
  const message = { type: "PLAYER_EVENT", data: { player_info: { tmdb: 27205, imdb: "tt1375666", mediaType: "movie" }, player_status: "playing", player_progress: 10, player_duration: 8880 } };
  assert.ok(parseTrialPlayerEvent(message, "https://vidsrc.sh", true, { tmdb: 27205 }));
  assert.equal(parseTrialPlayerEvent(message, "https://vidsrc.sh", true, { tmdb: 155 }), null);
  assert.equal(parseTrialPlayerEvent({ ...message, data: { ...message.data, player_info: { imdb: "tt1375666", mediaType: "movie" } } }, "https://vidsrc.sh", true, { tmdb: 27205 }), null);
});
