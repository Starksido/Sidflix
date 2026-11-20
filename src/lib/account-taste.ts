import "server-only";
import { accountDatabase as db } from "@/lib/account-database";
import { parsePreferences, sanitizeTasteTitle } from "@/lib/recommendation-data";
import { emptyPreferences, moods, recommendationKey, type RecommendationPreferences } from "@/lib/recommendations";

export type TastePatch = { type: "progress"; history: unknown[] } | { type: "feedback"; title: unknown; value: "like" | "dislike" | "hide" | null }
  | { type: "mood"; day: string; value: string } | { type: "options"; seasonal?: boolean; trending?: boolean; hemisphere?: string } | { type: "reset" };
export class InvalidTastePatch extends Error {}

export function readAccountTaste(userId: string): { preferences: RecommendationPreferences; resetAt: number } {
  const row = db.prepare("SELECT data, reset_at FROM account_taste WHERE user_id = ?").get(userId);
  return row ? { preferences: parsePreferences(JSON.parse(String(row.data))), resetAt: Number(row.reset_at) } : { preferences: { ...emptyPreferences }, resetAt: 0 };
}

/** A short synchronous transaction merges one change without overwriting another device. */
export function patchAccountTaste(userId: string, patch: TastePatch, now = Date.now()) {
  db.exec("BEGIN IMMEDIATE");
  try {
    let { preferences: current, resetAt } = readAccountTaste(userId);
    if (patch.type === "reset") { current = { ...emptyPreferences }; resetAt = now; }
    else if (patch.type === "progress") {
      if (!Array.isArray(patch.history) || patch.history.length > 10) throw new InvalidTastePatch();
      const entries = parsePreferences({ history: patch.history }).history;
      if (!entries.length) throw new InvalidTastePatch();
      const merged = new Map(current.history.map(item => [item.itemId, item]));
      for (const item of entries) {
        if (item.lastWatchedAt <= resetAt) continue;
        const previous = merged.get(item.itemId);
        const latest = previous && previous.lastWatchedAt > item.lastWatchedAt ? previous : item;
        merged.set(item.itemId, { ...latest, lastWatchedAt: Math.min(now, latest.lastWatchedAt),
          watchedSeconds: Math.max(previous?.watchedSeconds ?? 0, item.watchedSeconds), completed: previous?.completed === true || item.completed });
      }
      current = { ...current, history: [...merged.values()].sort((a, b) => b.lastWatchedAt - a.lastWatchedAt).slice(0, 300) };
    } else if (patch.type === "feedback") {
      const title = sanitizeTasteTitle(patch.title);
      if (!title || patch.value !== null && !["like", "dislike", "hide"].includes(patch.value)) throw new InvalidTastePatch();
      const key = recommendationKey(title), feedback = { ...current.feedback };
      if (patch.value === null) delete feedback[key]; else feedback[key] = { title, value: patch.value, at: now };
      current = { ...current, feedback: Object.fromEntries(Object.entries(feedback).sort((a, b) => a[1].at - b[1].at).slice(-300)) };
    } else if (patch.type === "mood") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.day) || !moods.some(mood => mood.id === patch.value)) throw new InvalidTastePatch();
      current = { ...current, mood: { day: patch.day, value: patch.value as NonNullable<RecommendationPreferences["mood"]>["value"] } };
    } else if (patch.type === "options") {
      if (patch.seasonal !== undefined && typeof patch.seasonal !== "boolean" || patch.trending !== undefined && typeof patch.trending !== "boolean"
        || patch.hemisphere !== undefined && !["auto", "north", "south", "equatorial"].includes(patch.hemisphere)) throw new InvalidTastePatch();
      current = { ...current, ...(patch.seasonal !== undefined ? { seasonal: patch.seasonal } : {}), ...(patch.trending !== undefined ? { trending: patch.trending } : {}),
        ...(patch.hemisphere !== undefined ? { hemisphere: patch.hemisphere as RecommendationPreferences["hemisphere"] } : {}) };
    } else throw new InvalidTastePatch();
    db.prepare("INSERT INTO account_taste (user_id, data, reset_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, reset_at = excluded.reset_at, updated_at = excluded.updated_at")
      .run(userId, JSON.stringify(current), resetAt, now);
    db.exec("COMMIT");
    return current;
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}
