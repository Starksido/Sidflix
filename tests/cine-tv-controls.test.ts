import assert from "node:assert/strict";
import { test } from "node:test";
import type { FilmTitle } from "../src/lib/catalog";
import { readCineTvMessage, INITIAL_CINE_STATE } from "../src/lib/cine-tv-controls";
import { cineTvPlayerUrl } from "../src/lib/player-settings";

const title: FilmTitle = { id: "online-tv-84958-s1-e2", kind: "film", title: "Loki", niche: "indie", maturity: "16+", year: 2021, minutes: 54, synopsis: "", art: { from: "#000", to: "#111" }, remote: { provider: "vidspark", tmdb: 84958, mediaType: "tv" }, episode: { seriesId: "online-tv-84958", seriesTitle: "Loki", season: 1, number: 2, name: "The Variant" } };
const read = (value: unknown, state = INITIAL_CINE_STATE) => readCineTvMessage(value, "https://cinesrc.st", true, title, state);
const ready = { ...INITIAL_CINE_STATE, duration: 3192, ready: true };

test("TV embed selects the exact episode, keeps the accent and leaves episode navigation to Sidflix", () => {
  const u = new URL(cineTvPlayerUrl(84958, { season: 1, number: 2 }));
  assert.equal(u.origin, "https://cinesrc.st"); assert.equal(u.pathname, "/embed/tv/84958");
  for (const [key, value] of Object.entries({ s: "1", e: "2", color: "#72CEFA", autonext: "false", controls: "false" })) assert.equal(u.searchParams.get(key), value);
});
test("only validated runtime establishes readiness; metadata and getters never count as watch progress", () => {
  assert.equal(read({ type: "cinesrc:loadedmetadata", duration: 3192 })?.state.ready, true);
  assert.equal(read({ type: "cinesrc:loadedmetadata", duration: 3192 })?.signal, undefined);
  assert.equal(read({ type: "cinesrc:response", command: "getDuration", result: 3192 })?.signal, undefined);
  for (const duration of [0, 40, Infinity, 20000]) assert.equal(read({ type: "cinesrc:loadedmetadata", duration }), null);
});
test("play, pause and actual progress acknowledge controls; paused seeking cannot trigger credit transitions", () => {
  const playing = read({ type: "cinesrc:play" }, ready)!;
  assert.equal(playing.state.paused, false);
  assert.equal(read({ type: "cinesrc:timeupdate", currentTime: 20, duration: 3192 }, playing.state)?.signal?.event, "timeupdate");
  assert.equal(read({ type: "cinesrc:timeupdate", currentTime: 20, duration: 3192 }, ready)?.signal?.event, "seeked");
  assert.equal(read({ type: "cinesrc:pause" }, playing.state)?.state.paused, true);
  assert.equal(read({ type: "cinesrc:ended" }, playing.state), null);
  assert.equal(read({ type: "cinesrc:ended" }, { ...playing.state, time: 3191 })?.signal?.event, "ended");
});
test("unrelated frames, wrong episodes, malformed positions and invalid control responses are rejected", () => {
  const message = { type: "cinesrc:timeupdate", currentTime: 20, duration: 3192 };
  assert.equal(readCineTvMessage(message, "https://cinesrc.st.bad.example", true, title, ready), null);
  assert.equal(readCineTvMessage(message, "https://cinesrc.st", false, title, ready), null);
  for (const patch of [{ episode: 1 }, { season: 2 }, { tmdbId: 1622 }, { mediaType: "movie" }, { currentTime: Infinity }, { currentTime: -1 }, { currentTime: 4000 }, { duration: 30 }]) assert.equal(read({ ...message, ...patch }, ready), null);
  for (const result of [-1, 2, Infinity, "0.5"]) assert.equal(read({ type: "cinesrc:response", command: "getVolume", result }, ready), null);
  assert.equal(read({ type: "cinesrc:response", command: "getPaused", result: "false" }, ready), null);
});
