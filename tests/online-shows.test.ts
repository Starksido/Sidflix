import assert from "node:assert/strict";
import { test } from "node:test";
import { makeOnlineEpisodes, makeOnlineShow, parseShowFeed, selectShows, showFilters, showSeasons } from "../src/lib/online-shows";
import { parseTvPlayerEvent } from "../src/lib/remote-tv-events";

test("provider TV index rejects malformed and duplicate entries and never trusts supplied playback URLs", () => {
  const raw = { type: "tv", tmdbid: "153312", orig_title: "Tulsa King", last_update: "2026-11-13 11:44:40", embed_url: "https://bad.example/" };
  const page = parseShowFeed({ result: true, last_page: 39, data: [raw, raw, { ...raw, tmdbid: "url" }, { ...raw, tmdbid: "1", type: "movie" }] });
  assert.deepEqual(page, { pages: 39, items: [{ tmdb: 153312, title: "Tulsa King", updated: "2026-11-13 11:44:40" }] });
  assert.throws(() => parseShowFeed({ result: false, data: [] }));
  assert.throws(() => parseShowFeed({ result: true, data: [], last_page: Infinity }));
  const show = makeOnlineShow(page.items[0], { first_air_date: "2022-11-13", number_of_seasons: 4, poster_path: "/poster.jpg", backdrop_path: "https://bad.example/image.jpg" });
  assert.deepEqual(show.remote, { provider: "vidspark", tmdb: 153312 });
  assert.equal(show.art.image?.poster, "https://image.tmdb.org/t/p/w500/poster.jpg");
  assert.equal(show.art.image?.backdrop, undefined);
});

test("full-catalogue TV search matches every word, handles punctuation, sorting and page bounds", () => {
  const index = [{ tmdb: 1, title: "Wolf King", updated: "2026-01-01 00:00:00" }, { tmdb: 2, title: "Tulsa King", updated: "2026-11-13 00:00:00" }, { tmdb: 3, title: "Grey s Anatomy", updated: "" }];
  assert.deepEqual(selectShows(index, 1, "popular", "Tulsa King").items.map(item => item.tmdb), [2]);
  assert.deepEqual(selectShows(index, 1, "popular", "Grey’s Anatomy").items.map(item => item.tmdb), [3]);
  assert.equal(selectShows(index, 1, "updated", "").items[0].tmdb, 2);
  assert.equal(selectShows(index, 50, "popular", "", 2).page, 2);
  assert.equal(showFilters(new URLSearchParams("q=Tulsa%20%20King&page=2")).query, "Tulsa King");
  for (const filter of ["page=0", "page=1.5", "sort=https://bad.example"]) assert.throws(() => showFilters(new URLSearchParams(filter)));
});

test("episode guides preserve special season zero and exclude future, duplicate and mismatched episodes", () => {
  const show = makeOnlineShow({ tmdb: 153312, title: "Tulsa King", updated: "" }, {});
  assert.deepEqual(showSeasons({ seasons: [{ season_number: 0, episode_count: 2, air_date: "2025-01-01" }, { season_number: 1, episode_count: 9, air_date: "2022-11-13" }, { season_number: 5, episode_count: 10, air_date: "2027-01-01" }] }, "2026-11-15").map(s => s.number), [0, 1]);
  const ep = { episode_number: 1, season_number: 1, air_date: "2022-11-13", name: "Go West", runtime: 42 };
  const episodes = makeOnlineEpisodes(show, 1, { episodes: [ep, ep, { ...ep, episode_number: 2, air_date: "2027-01-01" }, { ...ep, season_number: 2, episode_number: 3 }] }, "2026-11-15");
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].remote?.mediaType, "tv");
  assert.equal(episodes[0].episode?.seriesId, show.id);
  assert.equal(episodes[0].local, undefined);
});

test("TV playback messages reject wrong origins/windows, unrelated episodes, adverts and premature completion", () => {
  const show = makeOnlineShow({ tmdb: 153312, title: "Tulsa King", updated: "" }, {});
  const [title] = makeOnlineEpisodes(show, 1, { episodes: [{ episode_number: 1, season_number: 1, air_date: "2022-11-13", runtime: 42 }] }, "2026-11-15");
  const message = { source: "vidspark-player", event: "timeupdate", currentTime: 10, duration: 2501 };
  assert.ok(parseTvPlayerEvent(message, "https://vidspark.to", true, title));
  assert.ok(parseTvPlayerEvent(message, "https://cdn.vidspark.to", true, title));
  assert.equal(parseTvPlayerEvent(message, "https://vidspark.to.bad.example", true, title), null);
  assert.equal(parseTvPlayerEvent(message, "https://vidspark.to", false, title), null);
  assert.equal(parseTvPlayerEvent({ ...message, episode: 2 }, "https://vidspark.to", true, title), null);
  assert.equal(parseTvPlayerEvent({ ...message, duration: 40 }, "https://vidspark.to", true, title), null);
  assert.equal(parseTvPlayerEvent({ ...message, event: "ended" }, "https://vidspark.to", true, title), null);
  assert.equal(parseTvPlayerEvent({ ...message, currentTime: Infinity }, "https://vidspark.to", true, title), null);
  assert.ok(parseTvPlayerEvent({ ...message, event: "ended", currentTime: 2501 }, "https://vidspark.to", true, title));
  assert.ok(parseTvPlayerEvent({ ...message, event: "playerstatus", paused: true }, "https://vidspark.to", true, title));
  assert.equal(parseTvPlayerEvent({ ...message, event: "playerstatus", paused: "true" }, "https://vidspark.to", true, title), null);
  assert.equal(parseTvPlayerEvent({ ...message, event: "playerstatus", paused: true, duration: 0 }, "https://vidspark.to", true, title), null);
});
