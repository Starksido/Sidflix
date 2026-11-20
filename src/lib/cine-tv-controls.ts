import type { FilmTitle } from "@/lib/catalog";
import { record } from "@/lib/online-shows";
import { CINE_TV_ORIGIN } from "@/lib/player-settings";

export type CineTvState = { time: number; duration: number; paused: boolean; volume: number; muted: boolean; rate: number; ready: boolean; error: boolean };
export const INITIAL_CINE_STATE: CineTvState = { time: 0, duration: 0, paused: true, volume: 1, muted: false, rate: 1, ready: false, error: false };
export type CineTvSignal = { event: "play" | "pause" | "timeupdate" | "seeked" | "ended"; time: number; duration: number };
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Only this mounted episode's frame may acknowledge or update TV controls. */
export function readCineTvMessage(value: unknown, origin: string, currentFrame: boolean, title: FilmTitle, previous: CineTvState): { state: CineTvState; signal?: CineTvSignal } | null {
  if (!currentFrame || origin !== CINE_TV_ORIGIN || title.remote?.mediaType !== "tv" || !title.episode) return null;
  const data = record(value);
  for (const [key, expected] of [["tmdbId", title.remote.tmdb], ["season", title.episode.season], ["episode", title.episode.number]] as const) {
    if (data[key] !== undefined && String(data[key]) !== String(expected)) return null;
  }
  if (data.mediaType !== undefined && data.mediaType !== "tv") return null;
  const runtime = (duration: unknown): duration is number => finite(duration) && duration >= 180 && (!title.minutes || Math.abs(duration - title.minutes * 60) <= Math.max(300, title.minutes * 60 * .35));
  const state = { ...previous };
  if (data.type === "cinesrc:error") return { state: { ...state, error: true } };
  if (data.type === "cinesrc:loadedmetadata" || data.type === "cinesrc:response" && data.command === "getDuration") {
    const duration = data.type === "cinesrc:response" ? data.result : data.duration;
    if (!runtime(duration)) return null;
    return { state: { ...state, duration, ready: true, error: false } };
  }
  if (data.type === "cinesrc:response") {
    if (data.command === "getPaused" && typeof data.result === "boolean") state.paused = data.result;
    else if (data.command === "getMuted" && typeof data.result === "boolean") state.muted = data.result;
    else if (data.command === "getVolume" && finite(data.result) && data.result >= 0 && data.result <= 1) state.volume = data.result;
    else if (data.command === "getPlaybackRate" && finite(data.result) && data.result >= .25 && data.result <= 2) state.rate = data.result;
    else return null;
    return { state };
  }
  if (data.type === "cinesrc:volumechange" && finite(data.volume) && data.volume >= 0 && data.volume <= 1 && typeof data.muted === "boolean") return { state: { ...state, volume: data.volume, muted: data.muted } };
  if (data.type === "cinesrc:ratechange" && finite(data.playbackRate) && data.playbackRate >= .25 && data.playbackRate <= 2) return { state: { ...state, rate: data.playbackRate } };
  if (["cinesrc:timeupdate", "cinesrc:seeked"].includes(String(data.type))) {
    if (!runtime(data.duration) || !finite(data.currentTime) || data.currentTime < 0 || data.currentTime > data.duration + 2) return null;
    state.time = data.currentTime; state.duration = data.duration; state.ready = true; state.error = false;
    return { state, signal: { event: data.type === "cinesrc:seeked" || state.paused ? "seeked" : "timeupdate", time: state.time, duration: state.duration } };
  }
  if (!state.ready) return null;
  if (data.type === "cinesrc:play" || data.type === "cinesrc:pause") {
    state.paused = data.type === "cinesrc:pause";
    return { state, signal: { event: state.paused ? "pause" : "play", time: state.time, duration: state.duration } };
  }
  if (data.type === "cinesrc:ended" && state.time >= state.duration - 3) return { state: { ...state, paused: true }, signal: { event: "ended", time: state.duration, duration: state.duration } };
  return null;
}
