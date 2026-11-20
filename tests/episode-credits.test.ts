import assert from "node:assert/strict";
import { test } from "node:test";
import { advancedPlayback, atEpisodeCredits, parseCreditMarker } from "../src/lib/episode-credits";
import { vidSparkUrl } from "../src/lib/player-settings";

const data = { imdb_id: "tt2741602", media_type: "tv", is_movie: false, season: 1, episode: 1,
  outro: { start_sec: 2672, end_sec: 2709, confidence: 1, submission_count: 1 }, post_credits: null, no_outro: false };
const parse = (value: unknown) => parseCreditMarker(value, "tt2741602", 1, 1);

test("credit markers belong to the exact episode and never skip a known post-credit scene", () => {
  assert.deepEqual(parse(data), { start: 2672, end: 2709 });
  for (const changed of [{ imdb_id: "tt0903747" }, { season: 2 }, { episode: 2 }, { media_type: "movie" },
    { is_movie: true }, { no_outro: true }, { outro: null }, { post_credits: { start_sec: 2690, end_sec: 2700 } }]) {
    assert.equal(parse({ ...data, ...changed }), null);
  }
});

test("credit markers reject malformed timings and weak or invalid confidence", () => {
  for (const changed of [{ start_sec: NaN }, { end_sec: Infinity }, { start_sec: -1 }, { start_sec: 20 },
    { start_sec: 2708 }, { start_sec: 1200 }, { confidence: 0.7 }, { confidence: NaN },
    { confidence: Infinity }, { confidence: 1.1 }, { submission_count: 0 }, { submission_count: 1.5 }]) {
    assert.equal(parse({ ...data, outro: { ...data.outro, ...changed } }), null);
  }
});

test("early auto-next uses matching episode credit times, never a fixed remaining time", () => {
  const marker = parse(data);
  assert.equal(atEpisodeCredits(marker, 2619, 2709), false, "90 seconds remaining is not a credit marker");
  assert.equal(atEpisodeCredits(marker, 2671, 2709), false);
  assert.equal(atEpisodeCredits(marker, 2672, 2709), true);
  assert.equal(atEpisodeCredits(marker, 2675, 2750), false, "different edit or runtime");
  assert.equal(atEpisodeCredits(marker, 2709, 2709), false);
  assert.equal(atEpisodeCredits(null, 2675, 2709), false, "missing markers wait for ended");
  assert.equal(atEpisodeCredits(marker, NaN, 2709), false);
  assert.equal(atEpisodeCredits(marker, 2675, Infinity), false);
  assert.equal(atEpisodeCredits({ start: 70, end: 80 }, 71, 80), false, "short advert");
  assert.equal(atEpisodeCredits({ start: 1100, end: 1200 }, 1100, 1200), true, "different credit length uses its own marker");
});

test("loading and seeking alone do not count as advancing playback", () => {
  assert.equal(advancedPlayback(null, 2672), false);
  assert.equal(advancedPlayback(20, 2672), false);
  assert.equal(advancedPlayback(2672, 2672), false);
  assert.equal(advancedPlayback(2672, 2600), false);
  assert.equal(advancedPlayback(2672, 2673), true);
});

test("both movie and episode players receive the shared sky-blue theme", () => {
  assert.equal(vidSparkUrl(155), "https://vidspark.to/movie/155?theme=72CEFA");
  assert.equal(vidSparkUrl(46952, { season: 1, number: 2 }), "https://vidspark.to/tv/46952/1/2?theme=72CEFA");
});
