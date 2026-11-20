import assert from "node:assert/strict";
import { test } from "node:test";
import type { FilmTitle, SeriesTitle, Title } from "../src/lib/catalog";
import { rankSearchResults, readSearchSignals, searchTitleKey, titleMatchRank } from "../src/lib/search-relevance";
import { parseOnlineMoviePage } from "../src/lib/online-movies";
import { makeOnlineShow } from "../src/lib/online-shows";

const art = { from: "#000", to: "#111", image: { poster: "/poster.jpg" } };
const show: SeriesTitle = { id: "online-tv-46952", title: "The Blacklist", kind: "series", niche: "indie", maturity: "16+", synopsis: "", year: 2013, seasons: 10, episodeMinutes: 43, art, remote: { provider: "vidspark", tmdb: 46952 } };
const film: FilmTitle = { id: "movie", title: "Blacklist", kind: "film", niche: "indie", maturity: "16+", synopsis: "", year: 2003, minutes: 90, art };

test("Blacklist prioritizes the identified 2013 series over films, bare records and related titles", () => {
  const items: Title[] = [film, { ...film, id: "doc", title: "The Hollywood Blacklist" }, { ...show, id: "bare", title: "Blacklist", year: null, seasons: 0, art: { from: "#000", to: "#111" } }, show];
  for (const query of ["blacklist", "The Blacklist", " BLACKLIST "]) {
    const result = rankSearchResults(items, query);
    assert.equal(result[0].id, show.id);
    assert.equal(result.at(-1)?.id, "doc");
    assert.equal(result.length, items.length);
  }
  assert.equal(items[0], film, "ranking must not mutate source order");
});

test("exact films outrank related series and full shows outrank episode filenames", () => {
  const episode: FilmTitle = { ...film, id: "episode", title: "The Blacklist S01E01 1080p", episode: { seriesId: show.id, seriesTitle: show.title, season: 1, number: 1, name: "Pilot" } };
  const spinOff: SeriesTitle = { ...show, id: "spin-off", title: "The Blacklist: Redemption" };
  assert.deepEqual(rankSearchResults([episode, spinOff, film, show], "blacklist").map(title => title.id), [show.id, film.id, spinOff.id, episode.id]);
  const dune: FilmTitle = { ...film, id: "dune", title: "Dune" };
  const prophecy: SeriesTitle = { ...show, id: "prophecy", title: "Dune: Prophecy" };
  assert.equal(rankSearchResults([prophecy, dune], "dune")[0].id, "dune");
});

test("ranking respects word boundaries, punctuation, accents and provider tie order", () => {
  assert.equal(titleMatchRank("The Blacklist", "blacklist"), 0);
  assert.equal(titleMatchRank("Blacklisted", "blacklist"), 4);
  assert.equal(titleMatchRank("The Blacklist: Redemption", "blacklist"), 1);
  assert.equal(titleMatchRank("Arthur and the Blacklist", "blacklist"), 2);
  assert.equal(searchTitleKey("Amélie’s Story"), "amelies story");
  const equal = [show, { ...show, id: "other-source" }];
  assert.deepEqual(rankSearchResults(equal, "blacklist").map(title => title.id), [show.id, "other-source"]);
  assert.deepEqual(rankSearchResults(equal, ""), equal);
});

test("equally relevant movies and shows rank by popularity, vote volume and reliable ratings", () => {
  const popular = { ...film, id: "popular", searchSignals: { popularity: 90, rating: 8.2, votes: 10000 } };
  const obscure = { ...film, id: "obscure", searchSignals: { popularity: 1, rating: 10, votes: 1 } };
  assert.equal(rankSearchResults([obscure, popular], "blacklist")[0].id, "popular");
  const betterRated = { ...popular, id: "better-rated", searchSignals: { ...popular.searchSignals, rating: 9 } };
  assert.equal(rankSearchResults([popular, betterRated], "blacklist")[0].id, "better-rated");
  const popularShow = { ...show, searchSignals: { popularity: 100, rating: 7.6, votes: 9000 } };
  assert.equal(rankSearchResults([popular, popularShow], "blacklist")[0].id, "popular");
  assert.equal(rankSearchResults([popular, { ...popularShow, title: "The Blacklist: Redemption", searchSignals: { popularity: 10000, rating: 10, votes: 100000 } }], "blacklist")[0].id, "popular", "popularity must not defeat an exact title match");
});

test("ranking signals reject malformed numbers and metadata adapters preserve valid signals", () => {
  assert.deepEqual(readSearchSignals({ popularity: Infinity, vote_average: 11, vote_count: -1 }), { popularity: 0, rating: 0, votes: 0 });
  assert.deepEqual(readSearchSignals({ popularity: "99", vote_average: NaN, vote_count: 1.5 }), { popularity: 0, rating: 0, votes: 0 });
  assert.deepEqual(readSearchSignals({ popularity: 42.5, vote_average: 8.3, vote_count: 6000 }), { popularity: 42.5, rating: 8.3, votes: 6000 });
  const metadata = { popularity: 42.5, vote_average: 8.3, vote_count: 6000 };
  const movie = parseOnlineMoviePage({ results: [{ id: 1, title: "Example", ...metadata }] }).items[0];
  const series = makeOnlineShow({ tmdb: 1, title: "Example", updated: "" }, metadata);
  assert.deepEqual(movie.searchSignals, { popularity: 42.5, rating: 8.3, votes: 6000 });
  assert.deepEqual(series.searchSignals, movie.searchSignals);
});
