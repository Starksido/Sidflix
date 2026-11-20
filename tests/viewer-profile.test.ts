import assert from "node:assert/strict";
import { test } from "node:test";
import { profiles, seedWatching, type WatchEntry } from "../src/lib/catalog";
import { migrateWatching } from "../src/lib/viewer-profile";

test("only sydo is available and new profiles have no fabricated progress", () => {
  assert.deepEqual(profiles.map(profile => ({ id: profile.id, name: profile.name })), [{ id: "sydo", name: "sydo" }]);
  assert.deepEqual(seedWatching, { sydo: [] });
});

test("profile consolidation preserves real history and prioritizes existing sydo then the active legacy profile", () => {
  const a: WatchEntry = { titleId: "local-movie", progress: .4 };
  const b: WatchEntry = { titleId: "online-tv-46952-s1-e1", progress: .5 };
  const histories = { sam: [a, { ...b, progress: .2 }], amani: [b], sydo: [{ ...a, progress: .8 }] };
  assert.deepEqual(migrateWatching(histories, "amani"), { sydo: [{ ...a, progress: .8 }, b] });
  assert.equal(histories.sam[0].progress, .4, "migration must not mutate saved input");
});

test("sample history is removed while real plays of the same films are retained", () => {
  const real: WatchEntry = { titleId: "sintel", progress: .6, title: { id: "sintel", kind: "film", title: "Sintel", niche: "indie", maturity: "all", synopsis: "", year: 2010, minutes: 15, art: { from: "#000", to: "#111" } } };
  assert.deepEqual(migrateWatching({ sam: [{ titleId: "steel-bloom", progress: .6 }, real, null, { titleId: "bad", progress: Infinity }] }, "sam"), { sydo: [real] });
  assert.deepEqual(migrateWatching(null, "sam"), { sydo: [] });
});
