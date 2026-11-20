import assert from "node:assert/strict";
import { test } from "node:test";
import { artworkQuery, chooseArtwork } from "../src/lib/artwork-match";
import { episodeFromTitle } from "../src/lib/local-media";
import { groupLibrary } from "../src/lib/library-groups";
import type { FilmTitle } from "../src/lib/catalog";

test("artwork matches title punctuation, release year and known title variants", () => {
  const films = [
    { id: 1, title: "The Running Man", release_date: "1987-11-13", poster_path: "/older.jpg", popularity: 100 },
    { id: 2, title: "The Running Man", release_date: "2025-11-12", poster_path: "/newer.jpg", popularity: 1 },
  ];
  assert.equal(chooseArtwork(films, "The Running Man", 2025)?.id, 2);
  assert.equal(chooseArtwork(films, "The Running Man", 2000), null);
  assert.equal(chooseArtwork(films, "Other Movie", 2025), null);
  assert.equal(chooseArtwork([{ id: 3, title: "Now You See Me: Now You Don't", release_date: "2025-01-01", poster_path: "/a.jpg" }],
    "Now You See Me Now You Dont", 2025)?.id, 3);
  assert.equal(chooseArtwork([{ id: 4, title: "The Fantastic 4: First Steps", release_date: "2025-01-01", poster_path: "/b.jpg" }],
    "The Fantastic Four First Steps", 2025)?.id, 4);
  assert.deepEqual(artworkQuery("F1 The Movie"), { query: "F1" });
  assert.equal(chooseArtwork([
    { id: 5, name: "The Office", first_air_date: "2001-01-01", poster_path: "/uk.jpg", popularity: 100 },
    { id: 6, name: "The Office", first_air_date: "2005-01-01", poster_path: "/us.jpg", popularity: 1 },
  ], "The Office Extended Cut", null)?.id, 6);
});

test("Telegram year variants share one show and promotional handles are not episode names", () => {
  const a = episodeFromTitle("IT Welcome to Derry 2025 S01E04 @Mitchtv")!;
  const b = episodeFromTitle("IT Welcome to Derry S01E02 The Thing in the Dark @mitchtv")!;
  assert.equal(a.seriesId, b.seriesId);
  assert.equal(a.seriesTitle, "IT Welcome to Derry");
  assert.equal(a.name, "Episode 4");
  assert.equal(b.name, "The Thing in the Dark");
  assert.equal(episodeFromTitle("Daredevil Born Again S02E01 RuffgSeriesss")?.name, "Episode 1");
  const sample = (id: string, episode: NonNullable<FilmTitle["episode"]>): FilmTitle => ({ id, episode,
    kind: "film", title: episode.seriesTitle, year: null, minutes: null, niche: "indie", maturity: "16+",
    synopsis: "", art: { from: "#000", to: "#111" } });
  const grouped = groupLibrary([sample("a", a), sample("b", b)]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].kind === "series" && grouped[0].episodes?.length, 2);
});
