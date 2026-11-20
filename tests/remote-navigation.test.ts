import assert from "node:assert/strict";
import { test } from "node:test";
import { adjacentRow, directionalTarget, remoteKey } from "../src/lib/remote-navigation";

test("TV arrow, OK and Back keys work with browser names and common remote key codes", () => {
  assert.equal(remoteKey({ key: "ArrowDown" }), "down");
  assert.equal(remoteKey({ key: "Enter" }), "ok");
  assert.equal(remoteKey({ key: "Select" }), "ok");
  assert.equal(remoteKey({ key: "Unidentified", keyCode: 23 }), "ok");
  assert.equal(remoteKey({ key: "Unidentified", keyCode: 20 }), "down");
  assert.equal(remoteKey({ key: "Unidentified", keyCode: 10009 }), "back");
  assert.equal(remoteKey({ key: "Unidentified", keyCode: 461 }), "back");
  assert.equal(remoteKey({ key: "x" }), null);
});

test("episode focus moves to the next row even when that row is below the viewport", () => {
  const boxes = Array.from({ length: 20 }, (_, i) => ({ left: 40, top: i * 120 - 600, width: 600, height: 110 }));
  assert.equal(directionalTarget(boxes, 10, "down"), 11);
  assert.equal(directionalTarget(boxes, 10, "up"), 9);
  assert.equal(directionalTarget(boxes, 19, "down"), -1);
  assert.equal(directionalTarget(boxes, 0, "up"), -1);
});

test("remote focus favours a card in the same row and stays inside directional boundaries", () => {
  const boxes = [{ left: 0, top: 0, width: 100, height: 160 }, { left: 120, top: 0, width: 100, height: 160 }, { left: 0, top: 200, width: 100, height: 160 }, { left: 120, top: 200, width: 100, height: 160 }];
  assert.equal(directionalTarget(boxes, 0, "right"), 1);
  assert.equal(directionalTarget(boxes, 0, "down"), 2);
  assert.equal(directionalTarget(boxes, 3, "left"), 2);
  assert.equal(directionalTarget(boxes, 0, "left"), -1);
  assert.equal(directionalTarget(boxes, -1, "down"), 0);
  assert.equal(directionalTarget([], -1, "down"), -1);
});

test("Down selects the immediately lower loading row before a more horizontally aligned later card", () => {
  const row = { left: 0, top: 100, width: 1200, height: 400 };
  const boxes = [
    { left: 0, top: 540, width: 1200, height: 140 },
    { left: 0, top: 750, width: 180, height: 280 },
    { left: 200, top: 750, width: 180, height: 280 },
    { left: 0, top: 20, width: 100, height: 40 },
  ];
  assert.deepEqual(adjacentRow(boxes, row, "down"), [0]);
  assert.deepEqual(adjacentRow(boxes, row, "up"), [3]);
  assert.deepEqual(adjacentRow([], row, "down"), []);
});
