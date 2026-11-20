import type { WatchEntry } from "@/lib/catalog";

// Sample progress was shipped with the original demo profiles. Real plays carry
// a title snapshot; keep those even when somebody watched a former sample title.
const sampleIds = new Set(["steel-bloom", "quiet-harbour", "afterglow-rail", "ronin-exe", "what-the-river-kept", "salt-and-saffron", "hollow-moon-academy", "small-hours", "lantern-street", "ninth-floor-dojo", "kitsune-delivery", "sintel", "paper-comet", "big-buck-bunny", "skyward-brass"]);

/** Consolidate existing browser progress into the one personal profile. */
export function migrateWatching(value: unknown, previousProfileId: unknown): Record<string, WatchEntry[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { sydo: [] };
  const histories = value as Record<string, unknown>;
  const active = typeof previousProfileId === "string" ? previousProfileId : "sam";
  const keys = [...new Set(["sydo", active, ...Object.keys(histories)])];
  const entries = new Map<string, WatchEntry>();
  for (const key of keys) {
    const history = histories[key];
    if (!Array.isArray(history)) continue;
    for (const raw of history) {
      if (!raw || typeof raw !== "object" || typeof raw.titleId !== "string" || typeof raw.progress !== "number" || !Number.isFinite(raw.progress) || raw.progress < 0 || raw.progress > 1) continue;
      if (sampleIds.has(raw.titleId) && !raw.title) continue;
      if (!entries.has(raw.titleId)) entries.set(raw.titleId, raw as WatchEntry);
    }
  }
  return { sydo: [...entries.values()] };
}
