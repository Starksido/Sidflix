export type RemoteKey = "up" | "down" | "left" | "right" | "ok" | "back" | null;
export function remoteKey(event: { key: string; keyCode?: number }): RemoteKey {
  const names: Record<string, RemoteKey> = { ArrowUp: "up", Up: "up", ArrowDown: "down", Down: "down", ArrowLeft: "left", Left: "left", ArrowRight: "right", Right: "right", Enter: "ok", Select: "ok", Accept: "ok", OK: "ok", Escape: "back", BrowserBack: "back", GoBack: "back", Backspace: "back" };
  return names[event.key] ?? ({ 37: "left", 38: "up", 39: "right", 40: "down", 19: "up", 20: "down", 21: "left", 22: "right", 13: "ok", 23: "ok", 4: "back", 461: "back", 10009: "back" } as Record<number, RemoteKey>)[event.keyCode ?? 0] ?? null;
}
export type FocusBox = { left: number; top: number; width: number; height: number };
/** Limit vertical rail movement to the immediately adjacent visual band. */
export function adjacentRow(boxes: FocusBox[], row: FocusBox, direction: "up" | "down") {
  const gaps = boxes.map(box => direction === "down" ? box.top - row.top - row.height : row.top - box.top - box.height);
  const nearest = Math.min(...gaps.filter(gap => gap >= -4));
  return gaps.flatMap((gap, index) => gap >= -4 && gap <= nearest + 32 ? [index] : []);
}
export function directionalTarget(boxes: FocusBox[], current: number, direction: "up" | "down" | "left" | "right") {
  if (!boxes.length) return -1;
  if (current < 0 || current >= boxes.length) return 0;
  const origin = boxes[current], x = origin.left + origin.width / 2, y = origin.top + origin.height / 2;
  let best = -1, score = Infinity;
  boxes.forEach((box, index) => {
    if (index === current) return;
    const dx = box.left + box.width / 2 - x, dy = box.top + box.height / 2 - y;
    const horizontal = direction === "left" || direction === "right";
    const distance = direction === "right" ? dx : direction === "left" ? -dx : direction === "down" ? dy : -dy;
    if (distance <= 2) return;
    const cross = Math.abs(horizontal ? dy : dx);
    const beam = horizontal ? box.top < origin.top + origin.height && box.top + box.height > origin.top : box.left < origin.left + origin.width && box.left + box.width > origin.left;
    const candidate = distance + cross * 2 + (beam ? 0 : 400);
    if (candidate < score) { score = candidate; best = index; }
  });
  return best;
}
