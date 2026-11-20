import assert from "node:assert/strict";
import { test } from "node:test";
import { MOVIE_TRIAL_ORIGIN, parseTrialAvailability, parseTrialPlayerEvent, trialEmbedUrl, trialMovies } from "../src/lib/movie-trial";

const movie = trialMovies[0];
const message = { type: "PLAYER_EVENT", data: { player_info: { imdb: movie.imdb, tmdb: String(movie.tmdb), mediaType: "movie" },
  player_status: "playing", player_progress: 42, player_duration: 8880 } };

test("trial availability validates the requested film instead of trusting an embed URL", () => {
  const info = { status_code: 200, type: "movie", imdb_id: movie.imdb, tmdb_id: String(movie.tmdb), quality: "1080p", embed_url: "https://untrusted.example/" };
  assert.deepEqual(parseTrialAvailability(info, movie), { quality: "1080p" });
  assert.equal(new URL(trialEmbedUrl(movie)).origin, MOVIE_TRIAL_ORIGIN);
  for (const invalid of [null, [], { ...info, imdb_id: "tt0816692" }, { ...info, tmdb_id: "155" }, { status_code: 404 }]) {
    assert.equal(parseTrialAvailability(invalid, movie), null);
  }
});

test("trial player messages reject other origins, windows, films and malformed progress", () => {
  assert.equal(parseTrialPlayerEvent(message, "https://vidsrc.sh.attacker.example", true, movie), null);
  assert.equal(parseTrialPlayerEvent(message, MOVIE_TRIAL_ORIGIN, false, movie), null);
  assert.equal(parseTrialPlayerEvent(message, MOVIE_TRIAL_ORIGIN, true, trialMovies[1]), null);
  for (const patch of [{ player_progress: NaN }, { player_progress: -1 }, { player_progress: 99999 }, { player_duration: 30 },
    { player_status: "ready" }, { player_info: { ...message.data.player_info, tmdb: "155" } }]) {
    assert.equal(parseTrialPlayerEvent({ ...message, data: { ...message.data, ...patch } }, MOVIE_TRIAL_ORIGIN, true, movie), null);
  }
});

test("trial player accepts finite movie progress and documented pause events", () => {
  assert.deepEqual(parseTrialPlayerEvent(message, MOVIE_TRIAL_ORIGIN, true, movie), { status: "playing", progress: 42, duration: 8880 });
  assert.equal(parseTrialPlayerEvent({ ...message, data: { ...message.data, player_status: "paused" } }, MOVIE_TRIAL_ORIGIN, true, movie)?.status, "paused");
});
