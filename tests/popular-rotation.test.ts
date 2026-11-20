import assert from "node:assert/strict";
import { test } from "node:test";
import { mixPopularTitles, popularRotation, POPULAR_ROTATION_MS, POPULAR_ROTATION_START } from "../src/lib/popular-rotation";

test("popular picks change exactly every three days on a shared schedule", () => {
  const start = POPULAR_ROTATION_START, span = POPULAR_ROTATION_MS;
  assert.equal(new Date(start).toISOString(), "2026-11-16T21:00:00.000Z");
  assert.equal(popularRotation(start).page, 1);
  assert.deepEqual(popularRotation(start + span - 1), popularRotation(start));
  assert.deepEqual(popularRotation(start + span), { cycle: 1, page: 2, nextAt: start + span * 2 });
  assert.equal(popularRotation(start + span * 2).page, 3);
  assert.equal(popularRotation(start + span * 3).page, 1);
  assert.equal(popularRotation(start - 1).page, 1);
});

test("popular picks mix both collections, preserve source order and survive a missing source", () => {
  const movies = [{ id: "movie-1" }, { id: "movie-2" }], shows = [{ id: "show-1" }];
  assert.deepEqual(mixPopularTitles(movies, shows).map(item => item.id), ["movie-1", "show-1", "movie-2"]);
  assert.deepEqual(mixPopularTitles([], shows), shows);
  assert.deepEqual(mixPopularTitles(movies, []), movies);
  assert.deepEqual(mixPopularTitles(movies, [movies[0]]), movies);
  assert.equal(movies.length, 2);
});
