import type { FilmTitle } from "@/lib/catalog";
import { record } from "@/lib/online-shows";

export function parseVidSparkMovieEvent(value: unknown, origin: string, currentFrame: boolean, title: FilmTitle) {
  if (!currentFrame || !["https://vidspark.to", "https://cdn.vidspark.to"].includes(origin) || !title.remote || title.remote.mediaType === "tv") return null;
  const data = record(value), time = data.currentTime, duration = data.duration;
  if (data.source !== "vidspark-player" || !["timeupdate", "play", "pause", "seeked", "ended"].includes(data.event as string)
    || typeof time !== "number" || !Number.isFinite(time) || time < 0 || typeof duration !== "number" || !Number.isFinite(duration) || duration < 180 || time > duration + 2) return null;
  if (title.minutes && Math.abs(duration - title.minutes * 60) > Math.max(300, title.minutes * 60 * .35)) return null;
  if ([data.tmdb, data.tmdbId].some(id => id !== undefined && String(id) !== String(title.remote!.tmdb))) return null;
  if (data.event === "ended" && time < duration - 3) return null;
  return { event: data.event as "timeupdate" | "play" | "pause" | "seeked" | "ended", time, duration };
}
