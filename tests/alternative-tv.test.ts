import assert from "node:assert/strict";
import { test } from "node:test";
import type { FilmTitle } from "../src/lib/catalog";
import { alternativeTvPlayerUrl, PLAYER_ACCENT } from "../src/lib/player-settings";
import { parseAlternativeTvEvent } from "../src/lib/remote-tv-events";

const title: FilmTitle = { id: "online-tv-84958-s1-e2", kind: "film", title: "Loki · S1 E2", niche: "indie", maturity: "16+", year: 2021, minutes: 54,
  synopsis: "", art: { from: "#000", to: "#111" }, remote: { provider: "vidspark", tmdb: 84958, mediaType: "tv" },
  episode: { seriesId: "online-tv-84958", seriesTitle: "Loki", season: 1, number: 2, name: "The Variant" } };
const message = { type: "nxsha:history", version: 1, event: "progress", historyId: title.id, capabilities: { progress: true, seek: true },
  media: { type: "tv", id: "84958", season: 1, episode: 2 }, playback: { currentTime: 15, duration: 3285.7, paused: false, ended: false } };
const parse = (value: unknown) => parseAlternativeTvEvent(value, "https://web.nxsha.app", true, title);

test("TV alternative selects the exact episode, English, blue controls and the current parent on LAN", () => {
  const url = new URL(alternativeTvPlayerUrl(84958, title.episode!, "http://192.168.100.6:3000", title.id));
  assert.equal(url.origin, "https://web.nxsha.app"); assert.equal(url.pathname, "/embed/tv/84958/1/2");
  for (const [key, value] of Object.entries({ server: "CastVid", lang: "en", autoplay: "1", color: `#${PLAYER_ACCENT}`, autoplayNext: "false", history: "1", parent_origin: "http://192.168.100.6:3000", history_id: title.id })) assert.equal(url.searchParams.get(key), value);
});

test("validated alternative progress and real episode endings reach the existing auto-next flow", () => {
  assert.deepEqual(parse(message), { event: "timeupdate", time: 15, duration: 3285.7 });
  assert.equal(parse({ ...message, playback: { ...message.playback, paused: true } })?.event, "pause");
  assert.equal(parse({ ...message, event: "seeked" })?.event, "seeked");
  assert.equal(parse({ ...message, event: "ended", playback: { ...message.playback, currentTime: 3285.7, ended: true } })?.event, "ended");
  assert.equal(parse({ ...message, playback: { ...message.playback, currentTime: 3285.7, ended: true } })?.event, "ended");
});

test("other frames, episodes, adverts, malformed positions and premature endings cannot advance the queue", () => {
  assert.equal(parseAlternativeTvEvent(message, "https://web.nxsha.app.bad.example", true, title), null);
  assert.equal(parseAlternativeTvEvent(message, "https://web.nxsha.app", false, title), null);
  for (const patch of [{ version: 2 }, { type: "nxsha:episode" }, { event: "unsupported" }, { historyId: "another-episode" }, { capabilities: { progress: false } },
    { media: { ...message.media, episode: 1 } }, { media: { ...message.media, id: "1622" } }, { media: { ...message.media, season: 2 } },
    { playback: { ...message.playback, duration: 30 } }, { playback: { ...message.playback, duration: 10000 } },
    { playback: { ...message.playback, currentTime: Infinity } }, { playback: { ...message.playback, currentTime: -1 } },
    { playback: { ...message.playback, paused: "false" } }, { event: "ended" }, { playback: { ...message.playback, ended: true } }]) assert.equal(parse({ ...message, ...patch }), null);
});
