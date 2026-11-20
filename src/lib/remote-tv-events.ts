import type { FilmTitle } from "@/lib/catalog";
import { record } from "@/lib/online-shows";

/** Only the selected provider frame may update progress or finish an episode. */
export function parseTvPlayerEvent(value: unknown, origin: string, currentFrame: boolean, title: FilmTitle) {
  if (!currentFrame || !["https://vidspark.to", "https://cdn.vidspark.to"].includes(origin) || title.remote?.mediaType !== "tv" || !title.episode) return null;
  const data = record(value);
  if (data.source !== "vidspark-player" || !["play", "pause", "timeupdate", "seeked", "ended", "playerstatus"].includes(data.event as string)) return null;
  if (data.event === "playerstatus" && typeof data.paused !== "boolean") return null;
  const time = data.currentTime, duration = data.duration;
  if (typeof time !== "number" || !Number.isFinite(time) || time < 0 || typeof duration !== "number" || !Number.isFinite(duration) || duration < 180 || time > duration + 2) return null;
  if (title.minutes && Math.abs(duration - title.minutes * 60) > Math.max(300, title.minutes * 60 * 0.35)) return null;
  for (const [key, expected] of [["tmdb", title.remote.tmdb], ["tmdbId", title.remote.tmdb], ["season", title.episode.season], ["episode", title.episode.number]] as const) {
    if (data[key] !== undefined && String(data[key]) !== String(expected)) return null;
  }
  if (data.event === "ended" && time < duration - 3) return null;
  return { event: data.event as "play" | "pause" | "timeupdate" | "seeked" | "ended" | "playerstatus", time, duration, ...(data.event === "playerstatus" ? { paused: data.paused as boolean } : {}) };
}

/** Alternative history messages must identify this exact show and episode. */
export function parseAlternativeTvEvent(value: unknown, origin: string, currentFrame: boolean, title: FilmTitle) {
  if (!currentFrame || origin !== "https://web.nxsha.app" || title.remote?.mediaType !== "tv" || !title.episode) return null;
  const data = record(value), media = record(data.media), playback = record(data.playback);
  if (data.type !== "nxsha:history" || data.version !== 1 || data.historyId !== title.id || record(data.capabilities).progress !== true ||
    media.type !== "tv" || String(media.id) !== String(title.remote.tmdb) || media.season !== title.episode.season || media.episode !== title.episode.number ||
    !["progress", "play", "pause", "seeked", "ended"].includes(String(data.event)) || typeof playback.paused !== "boolean" || typeof playback.ended !== "boolean") return null;
  const time = playback.currentTime, duration = playback.duration;
  if (typeof time !== "number" || !Number.isFinite(time) || time < 0 || typeof duration !== "number" || !Number.isFinite(duration) || duration < 180 || time > duration + 2) return null;
  if (title.minutes && Math.abs(duration - title.minutes * 60) > Math.max(300, title.minutes * 60 * 0.35)) return null;
  const event = data.event === "progress" ? (playback.ended ? "ended" : playback.paused ? "pause" : "timeupdate") : data.event as "play" | "pause" | "seeked" | "ended";
  if (event === "ended" && time < duration - 3) return null;
  return { event, time, duration };
}
