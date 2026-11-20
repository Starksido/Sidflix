/** Shared playback accent, matching the Sidflix wordmark. */
export const PLAYER_ACCENT = "72CEFA";
export type TvPlaybackProvider = "standard" | "alternative" | "tv";
export const CINE_TV_ORIGIN = "https://cinesrc.st";

export function cineTvPlayerUrl(id: number, episode: { season: number; number: number }) {
  const params = new URLSearchParams({ s: String(episode.season), e: String(episode.number), color: `#${PLAYER_ACCENT}`, autoplay: "true", autonext: "false", autoskip: "false", controls: "false" });
  return `${CINE_TV_ORIGIN}/embed/tv/${id}?${params}`;
}

export function vidSparkUrl(id: number, episode?: { season: number; number: number }) {
  const path = episode ? `tv/${id}/${episode.season}/${episode.number}` : `movie/${id}`;
  return `https://vidspark.to/${path}?theme=${PLAYER_ACCENT}`;
}

/** The provider's wrapper drops custom colours; target the same selected backend. */
export function alternativePlayerUrl(id: number) {
  const params = new URLSearchParams({ server: "AwsPly-[Multi-Lang]", autoplay: "1", color: `#${PLAYER_ACCENT}` });
  return `https://web.nxsha.app/embed/movie/${id}?${params}`;
}

/** Direct TV embed with English preferred and episode changes owned by Sidflix. */
export function alternativeTvPlayerUrl(id: number, episode: { season: number; number: number }, parentOrigin: string, historyId: string) {
  const url = new URL(alternativePlayerUrl(id));
  url.pathname = `/embed/tv/${id}/${episode.season}/${episode.number}`;
  // The multi-language default inserts a betting promotion into its video.
  url.searchParams.set("server", "CastVid");
  url.searchParams.set("lang", "en");
  url.searchParams.set("autoplayNext", "false");
  url.searchParams.set("disable_dl_button", "true");
  url.searchParams.set("history", "1");
  url.searchParams.set("parent_origin", parentOrigin);
  url.searchParams.set("history_id", historyId);
  return url.href;
}

export function vidSparkBackupUrl(id: number, episode?: { season: number; number: number }, startAt = 0) {
  const url = new URL(vidSparkUrl(id, episode)); url.hostname = "cdn.vidspark.to";
  if (Number.isFinite(startAt) && startAt > 0) url.searchParams.set("startAt", String(Math.floor(startAt)));
  return url.href;
}

/** Only a selected, supported player may supply a position for a colour handoff. */
export function backupThemeSignal(value: unknown, origin: string, currentFrame: boolean) {
  if (!currentFrame || !["https://vidspark.to", "https://cdn.vidspark.to"].includes(origin) || !value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.source !== "vidspark-player" || !["playerstatus", "play", "pause", "timeupdate"].includes(String(data.event))) return null;
  const time = data.currentTime, duration = data.duration;
  if (typeof time !== "number" || !Number.isFinite(time) || time < 0 || typeof duration !== "number" || !Number.isFinite(duration) || duration < 180 || time > duration + 2) return null;
  if (data.event === "playerstatus" && typeof data.paused !== "boolean") return null;
  return { time, playing: data.event === "play" || data.event === "playerstatus" && data.paused === false };
}
