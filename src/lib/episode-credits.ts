import { record } from "@/lib/online-shows";

export type CreditMarker = { start: number; end: number };

/** Accept only a published marker for the exact episode, without a later scene. */
export function parseCreditMarker(value: unknown, imdb: string, season: number, episode: number): CreditMarker | null {
  const data = record(value), outro = record(data.outro);
  if (data.imdb_id !== imdb || data.media_type !== "tv" || data.is_movie !== false || data.season !== season || data.episode !== episode ||
    data.no_outro === true || data.post_credits != null) return null;
  const start = outro.start_sec, end = outro.end_sec, confidence = outro.confidence, votes = outro.submission_count;
  if (typeof start !== "number" || !Number.isFinite(start) || typeof end !== "number" || !Number.isFinite(end) ||
    start < 90 || start < end / 2 || end - start < 5 || end - start > 900 ||
    typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0.9 || confidence > 1 ||
    !Number.isSafeInteger(votes) || (votes as number) < 1) return null;
  return { start, end };
}

/** Different edits can have different credit timings. Never scale or guess a marker. */
export function atEpisodeCredits(marker: CreditMarker | null, time: number, duration: number) {
  return Boolean(marker && Number.isFinite(time) && Number.isFinite(duration) && duration >= 180 &&
    Math.abs(marker.end - duration) <= 5 && time >= marker.start && time < duration);
}

/** A seek or a newly loaded player alone must not trigger a transition. */
export function advancedPlayback(previous: number | null, time: number) {
  return previous !== null && time > previous && time - previous <= 15;
}
