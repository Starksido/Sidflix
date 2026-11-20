import assert from "node:assert/strict";
import { test } from "node:test";
import type { FilmTitle } from "../src/lib/catalog";
import { parseVidSparkMovieEvent } from "../src/lib/remote-movie-events";

const title: FilmTitle = { id: "online-123", title: "Test film", kind: "film", niche: "indie", year: 2020, minutes: 100, maturity: "16+", synopsis: "", art: { from: "#000", to: "#111" }, remote: { provider: "vidspark", tmdb: 123 } };
const progress = { source: "vidspark-player", event: "timeupdate", currentTime: 100, duration: 6000, tmdb: 123 };
test("movie history only accepts matching main-programme messages from the current provider frame", () => {
  assert.equal(parseVidSparkMovieEvent(progress, "https://vidspark.to", true, title)?.time, 100);
  assert.equal(parseVidSparkMovieEvent(progress, "https://attacker.example", true, title), null);
  assert.equal(parseVidSparkMovieEvent(progress, "https://vidspark.to", false, title), null);
  assert.equal(parseVidSparkMovieEvent({ ...progress, tmdb: 456 }, "https://vidspark.to", true, title), null);
  assert.equal(parseVidSparkMovieEvent({ ...progress, currentTime: 10, duration: 30 }, "https://vidspark.to", true, title), null);
  assert.equal(parseVidSparkMovieEvent({ ...progress, event: "ended" }, "https://vidspark.to", true, title), null);
  assert.ok(parseVidSparkMovieEvent({ ...progress, event: "ended", currentTime: 6000 }, "https://vidspark.to", true, title));
});
