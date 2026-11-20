import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyGenres, genreDefinitions, genreFilters, mixGenreTitles, selectGenreShows } from "../src/lib/genres";
import { makeOnlineShow } from "../src/lib/online-shows";
import { parseOnlineMoviePage } from "../src/lib/online-movies";

test("all fourteen requested sections are defined including Horror and Romance", () => {
  assert.equal(genreDefinitions.length, 14);
  assert.equal(new Set(genreDefinitions.map(genre => genre.key)).size, 14);
  assert.ok(genreDefinitions.some(genre => genre.key === "horror"));
  assert.ok(genreDefinitions.some(genre => genre.key === "romance"));
  assert.ok(genreDefinitions.some(genre => genre.key === "musical"));
  assert.ok(genreDefinitions.some(genre => genre.key === "historical-biopic"));
});

test("genres use source tags and explicit keywords instead of guessing from names", () => {
  assert.deepEqual(classifyGenres({ genres: [{ id: 80 }, { id: 18 }, { id: 9648 }] }, "tv"), ["crime", "drama", "mystery"]);
  assert.deepEqual(classifyGenres({ genre_ids: [27, 10749] }, "movie"), ["horror", "romance"]);
  assert.deepEqual(classifyGenres({ name: "Horror Romance Musical", genre_ids: [18] }, "tv"), ["drama"]);
  assert.deepEqual(classifyGenres({ genre_ids: [10402], keywords: { keywords: [{ name: "concert" }] } }, "movie"), []);
  assert.deepEqual(classifyGenres({ genres: [{ id: 18 }], keywords: { results: [{ name: "psychological horror" }, { name: "romance" }, { name: "musical" }, { name: "biography" }] } }, "tv"), ["drama", "historical-biopic", "horror", "musical", "romance"]);
  assert.deepEqual(classifyGenres({ genre_ids: [10759, 10765] }, "tv"), ["action", "adventure", "fantasy", "science-fiction"]);
  assert.deepEqual(classifyGenres({ genre_ids: ["27", Infinity], keywords: { results: [null, { name: 1 }] } }, "tv"), []);
});

test("movie and show adapters retain multiple genre memberships", () => {
  const show = makeOnlineShow({ tmdb: 46952, title: "The Blacklist", updated: "" }, { genres: [{ id: 80 }, { id: 18 }, { id: 9648 }] });
  assert.deepEqual(show.genres, ["crime", "drama", "mystery"]);
  const film = parseOnlineMoviePage({ results: [{ id: 1, title: "Film", genre_ids: [28, 12, 878] }] }).items[0];
  assert.deepEqual(film.genres, ["action", "adventure", "science-fiction"]);
});

test("genre show browsing filters the full index and paginates with reliable rating order", () => {
  const base = makeOnlineShow({ tmdb: 1, title: "Horror A", updated: "" }, { genres: [{ id: 27 }], popularity: 100, vote_average: 10, vote_count: 1 });
  const popular = { ...base, id: "popular", searchSignals: { popularity: 90, rating: 8.5, votes: 10000 } };
  const romance = { ...base, id: "romance", genres: ["romance" as const] };
  assert.equal(selectGenreShows([base, popular, romance], "horror", 1, "popular", 1).items[0].id, base.id);
  assert.equal(selectGenreShows([base, popular, romance], "horror", 1, "top-rated", 1).items[0].id, popular.id);
  assert.equal(selectGenreShows([base, popular, romance], "horror", 99, "popular", 1).page, 2);
  assert.equal(selectGenreShows([base, popular, romance], "romance", 1, "popular").totalResults, 1);
  assert.equal(genreFilters(new URLSearchParams("type=movies&sort=top-rated&page=2")).page, 2);
  for (const params of ["page=0", "page=501", "type=local", "sort=unknown"]) assert.throws(() => genreFilters(new URLSearchParams(params)));
});

test("genre rails mix films and series without repeated cards", () => {
  const show = makeOnlineShow({ tmdb: 1, title: "Show", updated: "" }, {});
  const movie = parseOnlineMoviePage({ results: [{ id: 2, title: "Movie" }] }).items[0];
  assert.deepEqual(mixGenreTitles([show, show], [movie, movie]).map(title => title.id), [show.id, movie.id]);
});
