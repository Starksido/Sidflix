import assert from "node:assert/strict";
import { test } from "node:test";
import { alternativePlayerUrl, backupThemeSignal, PLAYER_ACCENT, vidSparkBackupUrl } from "../src/lib/player-settings";

test("supported backup players receive their own colour parameter, preserving episode and resume position", () => {
  const alternative = new URL(alternativePlayerUrl(155));
  assert.equal(alternative.origin, "https://web.nxsha.app");
  assert.equal(alternative.searchParams.get("server"), "AwsPly-[Multi-Lang]");
  assert.equal(alternative.searchParams.get("color"), `#${PLAYER_ACCENT}`);
  const backup = new URL(vidSparkBackupUrl(1622, { season: 1, number: 2 }, 126.5));
  assert.equal(backup.origin, "https://cdn.vidspark.to"); assert.equal(backup.pathname, "/tv/1622/1/2");
  assert.equal(backup.searchParams.get("theme"), PLAYER_ACCENT); assert.equal(backup.searchParams.get("startAt"), "126");
  assert.equal(new URL(vidSparkBackupUrl(155, undefined, NaN)).searchParams.has("startAt"), false);
});

test("theme handoff rejects other windows, ads, malformed progress and unsupported players", () => {
  const signal = { source: "vidspark-player", event: "playerstatus", currentTime: 12, duration: 2500, paused: false };
  assert.deepEqual(backupThemeSignal(signal, "https://cdn.vidspark.to", true), { time: 12, playing: true });
  assert.deepEqual(backupThemeSignal(signal, "https://vidspark.to", true), { time: 12, playing: true });
  assert.equal(backupThemeSignal(signal, "https://cdn.vidspark.to", false), null);
  assert.equal(backupThemeSignal(signal, "https://other.example", true), null);
  for (const patch of [{ source: "advert" }, { event: "ended" }, { duration: 30 }, { currentTime: Infinity }, { currentTime: 2600 }, { paused: "false" }]) assert.equal(backupThemeSignal({ ...signal, ...patch }, "https://cdn.vidspark.to", true), null);
});
