import assert from "node:assert/strict";
import { test } from "node:test";
import { animeFilters, makeAnimeTitle, parseAnimeFeed, selectAnime } from "../src/lib/anime";
import { makeOnlineEpisodes } from "../src/lib/online-shows";

const raw = { id: 1, name: "Naruto", original_name: "ナルト", original_language: "ja", genre_ids: [16, 10759], first_air_date: "2002-10-03", poster_path: "/poster.jpg", popularity: 90, vote_average: 8.3, vote_count: 5000 };
const provider = { tmdb: 1, title: "Naruto", updated: "2026-01-01 00:00:00" };

test("anime parsing excludes adult, non-Japanese, non-animation, duplicate and malformed records", () => {
  const page = parseAnimeFeed({ results: [raw, raw, { ...raw, id: 2, adult: true }, { ...raw, id: 3, original_language: "en" }, { ...raw, id: 4, genre_ids: [18] }, { ...raw, id: "bad" }, null], total_pages: 275 });
  assert.equal(page.items.length, 1);
  assert.equal(page.pages, 275);
  const title = makeAnimeTitle(page.items[0], provider, { number_of_seasons: 4 });
  assert.equal(title.niche, "anime");
  assert.deepEqual(title.remote, { provider: "vidspark", tmdb: 1 });
  assert.equal(title.seasons, 4);
  assert.equal(title.art.image?.poster, "https://image.tmdb.org/t/p/w500/poster.jpg");
  assert.equal(title.searchSignals?.votes, 5000);
  assert.throws(() => parseAnimeFeed({ results: [], total_pages: 501 }));
});

test("anime searches the complete classified catalogue including original/provider names and lists only provider titles", () => {
  const rows = parseAnimeFeed({ results: [raw, { ...raw, id: 2, name: "Naruto Shippuden" }, { ...raw, id: 3, name: "Unavailable Anime" }], total_pages: 1 }).items;
  const providers = [provider, { ...provider, tmdb: 2, title: "Naruto: Shippuuden" }];
  assert.equal(selectAnime(rows, providers, 1, "popular", "").totalResults, 2);
  assert.equal(selectAnime(rows, providers, 1, "popular", "ナルト").totalResults, 2);
  assert.equal(selectAnime(rows, providers, 1, "popular", "Shippuuden").records[0].tmdb, 2);
  assert.equal(selectAnime(rows, providers, 1, "popular", "Naruto").records[0].tmdb, 1);
  assert.equal(selectAnime(rows, providers, 99, "popular", "", 1).page, 2);
});

test("anime sorting uses popularity, vote-supported ratings, provider updates and alphabetical titles", () => {
  const rows = parseAnimeFeed({ results: [raw, { ...raw, id: 2, name: "A Series", popularity: 100, vote_average: 10, vote_count: 1 }], total_pages: 1 }).items;
  const providers = [provider, { ...provider, tmdb: 2, updated: "2026-11-15 00:00:00" }];
  assert.equal(selectAnime(rows, providers, 1, "popular", "").records[0].tmdb, 2);
  assert.equal(selectAnime(rows, providers, 1, "top-rated", "").records[0].tmdb, 1);
  assert.equal(selectAnime(rows, providers, 1, "updated", "").records[0].tmdb, 2);
  assert.equal(selectAnime(rows, providers, 1, "name", "").records[0].tmdb, 2);
  assert.equal(animeFilters(new URLSearchParams("sort=top-rated&q=Naruto%20%20Shippuden")).query, "Naruto Shippuden");
  for (const filters of ["page=0", "page=1.2", "sort=arbitrary"]) assert.throws(() => animeFilters(new URLSearchParams(filters)));
});

test("anime episode playback keeps the anime identity and excludes future episodes", () => {
  const row = parseAnimeFeed({ results: [raw], total_pages: 1 }).items[0];
  const show = makeAnimeTitle(row, provider);
  const episodes = makeOnlineEpisodes(show, 1, { episodes: [{ episode_number: 1, season_number: 1, air_date: "2002-10-03", runtime: 24 }, { episode_number: 2, season_number: 1, air_date: "2099-01-01" }] }, "2026-11-15");
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].niche, "anime");
  assert.equal(episodes[0].remote?.mediaType, "tv");
});
