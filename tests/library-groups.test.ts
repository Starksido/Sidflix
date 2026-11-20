import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { test } from "node:test";
import type { FilmTitle } from "../src/lib/catalog";
import { adjacentEpisodes, groupLibrary, isRecentlyAdded, RECENTLY_ADDED_MS } from "../src/lib/library-groups";
import { episodeFromTitle } from "../src/lib/local-media";
import { rememberAdded } from "../src/lib/library-added";
import { embeddedSubtitleStreams } from "../src/lib/media-subtitles";

function film(id: string, title: string, addedAt = 100): FilmTitle {
  return { id, title, addedAt, episode: episodeFromTitle(title), kind: "film", local: true,
    year: null, minutes: null, niche: "indie", maturity: "16+", art: { from: "#000", to: "#333" }, synopsis: title };
}

test("one show card, ordered seasons, duplicate releases and cross-season navigation", () => {
  const items = [film("a", "The Show S02E01", 200), film("b", "The Show S01E10"),
    film("c", "The Show S01E02 A Beginning"), film("d", "The Show S01E02 Other Release", 300),
    film("e", "Another Show S01E01"), film("f", "A Movie")];
  const grouped = groupLibrary(items);
  assert.equal(grouped.length, 3);
  const show = grouped.find((item) => item.title === "The Show")!;
  assert.equal(show.kind, "series");
  if (show.kind !== "series") return;
  assert.equal(show.seasons, 2);
  assert.equal(show.addedAt, 300, "a new episode/release refreshes the show's arrival date");
  assert.deepEqual(show.episodes!.map((episode) => episode.id), ["c", "b", "a"]);
  assert.equal(adjacentEpisodes(show.episodes!, "b").next?.id, "a");
  assert.equal(adjacentEpisodes(show.episodes!, "a").next, undefined);
  assert.equal(adjacentEpisodes(show.episodes!, "c").previous, undefined);
  assert.equal(adjacentEpisodes(show.episodes!, "missing").next, undefined);
  assert.equal(items[2].episode!.name, "A Beginning");
});

test("Recently added expires at seven days, without removing the title", () => {
  const added = 1000;
  assert.equal(isRecentlyAdded(added, added + RECENTLY_ADDED_MS - 1), true);
  assert.equal(isRecentlyAdded(added, added + RECENTLY_ADDED_MS), false);
  assert.equal(isRecentlyAdded(added, added + RECENTLY_ADDED_MS + 1), false);
  assert.equal(isRecentlyAdded(undefined, added), false);
  assert.equal(isRecentlyAdded(added + 1, added), false);
  assert.equal(groupLibrary([film("movie", "Movie", added)]).length, 1);
});

test("discovery dates survive later scans and restarts; only new files receive a new date", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sidflix-added-"));
  const original = process.env.LOCAL_MEDIA_INDEX_PATH;
  process.env.LOCAL_MEDIA_INDEX_PATH = path.join(directory, "added.json");
  try {
    const first = `local-${"a".repeat(32)}`;
    const next = `local-${"b".repeat(32)}`;
    await rememberAdded([first], 1000);
    const stored = await rememberAdded([first, next], 2000);
    assert.equal(stored[first], 1000);
    assert.equal(stored[next], 2000);
    assert.deepEqual(JSON.parse(await readFile(process.env.LOCAL_MEDIA_INDEX_PATH, "utf8")), stored);
  } finally {
    if (original === undefined) delete process.env.LOCAL_MEDIA_INDEX_PATH;
    else process.env.LOCAL_MEDIA_INDEX_PATH = original;
    await rm(directory, { recursive: true, force: true });
  }
});

test("subtitle probing lists text tracks and omits picture-only subtitles", () => {
  assert.deepEqual(embeddedSubtitleStreams("  Stream #0:2(eng): Subtitle: subrip (default)\n  Stream #0:3(swa): Subtitle: ass\n  Stream #0:4: Subtitle: hdmv_pgs_subtitle\n"),
    [{ stream: 2, language: "eng" }, { stream: 3, language: "swa" }]);
});
