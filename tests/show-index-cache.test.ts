import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseSavedShowIndex } from "../src/lib/online-shows";
import { loadVidSparkShows } from "../src/lib/sources/online-shows";

test("saved TV catalogues validate dates and records before being reused", () => {
  const now = Date.now(), item = { tmdb: 123, title: "Known show", updated: "2026-11-15 10:00:00" };
  assert.deepEqual(parseSavedShowIndex({ version: 1, savedAt: now, items: [item, item, { tmdb: -1, title: "Invalid" }] }, now)?.items, [item]);
  assert.equal(parseSavedShowIndex({ version: 1, savedAt: now + 1, items: [item] }, now), null);
  assert.equal(parseSavedShowIndex({ version: 1, savedAt: now - 31 * 86_400_000, items: [item] }, now), null);
  assert.equal(parseSavedShowIndex({ version: 1, savedAt: now, items: [] }, now), null);
});

test("a fresh TV snapshot avoids a network crawl and an older snapshot survives provider timeouts", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sidflix-show-cache-"));
  const filename = path.join(directory, "shows.json"), originalFetch = globalThis.fetch;
  const item = { tmdb: 123, title: "Known show", updated: "2026-11-15 10:00:00" };
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw Error("Simulated provider timeout"); };
  try {
    await writeFile(filename, JSON.stringify({ version: 1, savedAt: Date.now(), items: [item] }));
    assert.deepEqual(await loadVidSparkShows(filename), [item]);
    assert.equal(calls, 0, "opening Sidflix should reuse a fresh catalogue immediately");
    await writeFile(filename, JSON.stringify({ version: 1, savedAt: Date.now() - 7 * 60 * 60 * 1000, items: [item] }));
    assert.deepEqual(await loadVidSparkShows(filename), [item]);
    assert.equal(calls, 1);
    await writeFile(filename, "invalid JSON");
    assert.deepEqual(await loadVidSparkShows(filename), [], "an unavailable provider must not throw inside the cached home-page source");
  } finally {
    globalThis.fetch = originalFetch;
    if (path.dirname(directory) === path.resolve(tmpdir()) && path.basename(directory).startsWith("sidflix-show-cache-")) await rm(directory, { recursive: true, force: true });
  }
});
