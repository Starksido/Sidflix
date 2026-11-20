import assert from "node:assert/strict";
import { test } from "node:test";
import { episodeAutoplay } from "../src/lib/episode-autoplay";

test("an episode that finishes loading after the iframe starts when its player becomes ready", () => {
  const sent: string[] = [];
  const next = episodeAutoplay(command => sent.push(command.action), 0);
  next.poll(0); next.poll(1000); next.poll(6000);
  assert.deepEqual(sent, ["getStatus", "getStatus", "getStatus"]);
  next.observe({ event: "playerstatus", paused: true, time: 0 }, 6500);
  assert.equal(sent.at(-1), "play");
  next.observe({ event: "playerstatus", paused: false, time: 0 }, 7000);
  const count = sent.length;
  next.poll(8000);
  assert.equal(sent.length, count);
  assert.equal(next.active, false);
});

test("autoplay respects pause, does not count a saved position as playback, and expires", () => {
  const sent: string[] = [];
  const next = episodeAutoplay(command => sent.push(command.action), 0);
  next.observe({ event: "timeupdate", time: 100 }, 500);
  assert.equal(next.active, true);
  next.observe({ event: "playerstatus", paused: true, time: 100 }, 1000);
  next.observe({ event: "playerstatus", paused: true, time: 100 }, 1100);
  assert.deepEqual(sent, ["play"], "duplicate status messages do not flood play commands");
  next.observe({ event: "pause", time: 100 }, 2000);
  next.observe({ event: "playerstatus", paused: true, time: 100 }, 4000);
  assert.deepEqual(sent, ["play"], "manual pause cancels the startup request");
  const expired = episodeAutoplay(command => sent.push(command.action), 0);
  expired.poll(120_000);
  expired.observe({ event: "playerstatus", paused: true, time: 0 }, 121_000);
  assert.deepEqual(sent, ["play"]);
});
