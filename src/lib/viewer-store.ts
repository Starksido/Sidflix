"use client";

import { useSyncExternalStore } from "react";
import { migrateWatching } from "@/lib/viewer-profile";
import { beginTasteSession, finishTasteSession, recordTastePlayback } from "@/lib/recommendation-store";
import type { ViewingRecord } from "@/lib/recommendations";
import { enterPlaybackView, exitPlaybackView } from "@/lib/playback-view";
import {
  archiveIdentifier,
  isAllowed,
  profiles,
  seedWatching,
  type Maturity,
  type Playable,
  type Profile,
  type Title,
  type WatchEntry,
  type FilmTitle,
  type SeriesTitle,
} from "@/lib/catalog";

// Per-browser viewer state: active profile and each profile's watch progress.
// Kept in localStorage until accounts and a watch-history table exist.

type ViewerState = {
  profiles: Profile[];
  activeProfileId: string;
  watching: Record<string, WatchEntry[]>;
  remoteAutoNext: boolean;
};

type Notice = { id: number; message: string; undo?: () => void };

const STORAGE_KEY = "sidflix:viewer:v1";
let accountId: string | null = null;
let accountName: string | null = null;
const storageKey = () => `sidflix:viewer:v2:${encodeURIComponent(accountId ?? "device")}`;

const initialState: ViewerState = {
  profiles,
  activeProfileId: profiles[0].id,
  watching: seedWatching,
  remoteAutoNext: true,
};

let state: ViewerState | null = null;
let notice: Notice | null = null;
let nowPlaying: Playable | null = null;
let selectedSeries: SeriesTitle | null = null;
let episodeQueue: FilmTitle[] = [];
let noticeId = 0;
const listeners = new Set<() => void>();

function load(): ViewerState {
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) {
      // Only the device profile owns legacy data. Never copy it into a signed-in account.
      const legacy = accountId === null ? JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") : null;
      return { ...initialState, profiles: accountName ? [{ ...profiles[0], name: accountName }] : profiles,
        watching: legacy ? migrateWatching(legacy.watching, legacy.activeProfileId) : seedWatching };
    }
    const parsed = JSON.parse(raw) as Partial<ViewerState>;
    const savedProfiles = Array.isArray(parsed.profiles) ? parsed.profiles.filter(p => p && typeof p.id === "string" && typeof p.name === "string" && p.name.trim() && ["all", "7+", "13+", "16+"].includes(p.maxMaturity) && /^#[0-9a-f]{6}$/i.test(p.color)).slice(0, 8) : profiles;
    const available = savedProfiles.length ? savedProfiles : profiles;
    const watching = Object.fromEntries(available.map(profile => [profile.id, Array.isArray(parsed.watching?.[profile.id]) ? parsed.watching![profile.id].filter(e => e && typeof e.titleId === "string" && Number.isFinite(e.progress) && e.progress >= 0 && e.progress <= 1) : []]));
    return { profiles: available, activeProfileId: available.some(p => p.id === parsed.activeProfileId) ? parsed.activeProfileId! : available[0].id,
      watching, remoteAutoNext: typeof parsed.remoteAutoNext === "boolean" ? parsed.remoteAutoNext : true };
  } catch {
    return initialState;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function setState(next: ViewerState) {
  state = next;
  try {
    window.localStorage.setItem(storageKey(), JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota): keep in-memory state only.
  }
  emit();
}

function getState(): ViewerState {
  if (!state) state = load();
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== storageKey()) return;
    state = load();
    exitPlaybackView();
    nowPlaying = null; selectedSeries = null; episodeQueue = [];
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function notify(message: string, undo?: () => void) {
  notice = { id: ++noticeId, message, undo };
  emit();
}

export function dismissNotice(id: number) {
  if (notice?.id !== id) return;
  notice = null;
  emit();
}

export function useNowPlaying(): Playable | null {
  return useSyncExternalStore(
    subscribe,
    () => nowPlaying,
    () => null,
  );
}

export function closePlayer() {
  if (!nowPlaying) return;
  if (nowPlaying.kind === "film") finishTasteSession(viewerIdentity(), nowPlaying.id);
  nowPlaying = null;
  exitPlaybackView();
  emit();
}

export function useSelectedSeries() {
  return useSyncExternalStore(subscribe, () => selectedSeries, () => null);
}

export function closeSeries() { selectedSeries = null; emit(); }

export function useEpisodeQueue() {
  return useSyncExternalStore(subscribe, () => episodeQueue, () => EMPTY_QUEUE);
}
const EMPTY_QUEUE: FilmTitle[] = [];

export function setEpisodeQueue(episodes: FilmTitle[], currentId: string) {
  if (nowPlaying?.id !== currentId) return;
  if (nowPlaying.kind === "film" && nowPlaying.episode && !episodes.some((episode) => episode.id === currentId)) return;
  episodeQueue = episodes;
  emit();
}

export function playEpisodes(episodes: FilmTitle[], id: string) {
  const episode = episodes.find((item) => item.id === id);
  if (!episode) return;
  selectedSeries = null;
  episodeQueue = episodes;
  playTitle(episode);
}

export function savedProgress(id: string): number {
  const current = getState();
  const progress = current.watching[current.activeProfileId]?.find((entry) => entry.titleId === id)?.progress ?? 0;
  return progress < 0.97 ? progress : 0;
}

/** Native videos report actual progress, unlike cross-origin embeds. */
export function savePlayback(title: FilmTitle, progress: number, durationSeconds?: number) {
  if (!Number.isFinite(progress)) return;
  const { activeProfileId, watching, profiles: available } = getState();
  if (nowPlaying?.id !== title.id || !isAllowed(title.maturity, available.find((profile) => profile.id === activeProfileId)!.maxMaturity)) return;
  recordTastePlayback(viewerIdentity(), title, progress, durationSeconds ?? (title.minutes ?? 0) * 60);
  if (!watching[activeProfileId]?.some((entry) => entry.titleId === title.id)) {
    if (title.remote && nowPlaying?.id === title.id && progress > 0 && progress < 0.97) {
      updateWatching(activeProfileId, (entries) => [{ titleId: title.id, title, progress,
        season: title.episode?.season, episode: title.episode?.number }, ...entries.filter(entry =>
        !(title.episode && entry.title?.kind === "film" && entry.title.episode?.seriesId === title.episode.seriesId))]);
    }
    return;
  }
  updateWatching(activeProfileId, (entries) => progress >= 0.97
    ? entries.filter((entry) => entry.titleId !== title.id)
    : entries.map((entry) => entry.titleId === title.id ? { ...entry, progress: Math.max(0, progress) } : entry));
}

export function useViewerState(): ViewerState {
  return useSyncExternalStore(subscribe, getState, () => initialState);
}

export function useNotice(): Notice | null {
  return useSyncExternalStore(
    subscribe,
    () => notice,
    () => null,
  );
}

export function useActiveProfile(): Profile {
  return useSyncExternalStore(subscribe, () => {
    const current = getState();
    return current.profiles.find(profile => profile.id === current.activeProfileId) ?? current.profiles[0];
  }, () => initialState.profiles[0]);
}

export function useProfiles() { return useSyncExternalStore(subscribe, () => getState().profiles, () => initialState.profiles); }
function viewerIdentity() { return JSON.stringify([accountId ?? "device", getState().activeProfileId]); }
export function currentViewerIdentity() { return viewerIdentity(); }
export function useViewerIdentity() {
  return useSyncExternalStore(subscribe, viewerIdentity, () => JSON.stringify(["device", initialState.activeProfileId]));
}

/** Session identity only selects browser storage; server access still requires server-side auth. */
export function setViewerAccount(account: { id: string; name: string } | null) {
  const next = account?.id ?? null;
  if (accountId === next) return;
  accountId = next; accountName = account?.name ?? null;
  exitPlaybackView();
  nowPlaying = null; selectedSeries = null; episodeQueue = []; notice = null;
  state = load(); emit();
}

export function hydrateAccountWatching(history: ViewingRecord[]) {
  if (!accountId || nowPlaying) return;
  const current = getState(), seen = new Set<string>();
  const entries = history.filter(item => {
    if (seen.has(item.workKey)) return false;
    seen.add(item.workKey);
    return !item.completed && item.position > 0 && item.position / item.duration < .97;
  }).map(item => ({ titleId: item.title.id, title: item.title, progress: item.position / item.duration,
    season: item.title.kind === "film" ? item.title.episode?.season : undefined,
    episode: item.title.kind === "film" ? item.title.episode?.number : undefined }));
  setState({ ...current, watching: { ...current.watching, [current.activeProfileId]: entries } });
}

export function useIsAllowed(maturity: Maturity): boolean {
  return isAllowed(maturity, useActiveProfile().maxMaturity);
}

export function switchProfile(profileId: string) {
  const current = getState();
  if (current.activeProfileId === profileId || !current.profiles.some(profile => profile.id === profileId)) return;
  exitPlaybackView();
  nowPlaying = null; selectedSeries = null; episodeQueue = [];
  setState({ ...current, activeProfileId: profileId });
}

export function setRemoteAutoNext(value: boolean) { setState({ ...getState(), remoteAutoNext: value }); }

function updateWatching(
  profileId: string,
  update: (entries: WatchEntry[]) => WatchEntry[],
) {
  const current = getState();
  const entries = current.watching[profileId] ?? [];
  setState({
    ...current,
    watching: { ...current.watching, [profileId]: update(entries) },
  });
}

/**
 * Starts or resumes a title for the active profile. Twitch channels and Internet
 * Archive films open in the player dialog. The embedded players don't report
 * progress, so films and series record about a tenth of the runtime as watched and
 * move to the front of Continue watching.
 */
export function playTitle(title: Title) {
  const titleId = title.id;
  const { activeProfileId, profiles: available } = getState();

  if (!isAllowed(title.maturity, available.find((profile) => profile.id === activeProfileId)!.maxMaturity)) return;
  const playable = title.kind === "film" && Boolean(title.remote || title.local || title.video || archiveIdentifier(title));
  if (playable && !nowPlaying) enterPlaybackView();
  if (nowPlaying?.kind === "film") finishTasteSession(viewerIdentity(), nowPlaying.id);
  if (title.kind === "series" && (title.episodes || title.remote)) {
    selectedSeries = title;
    emit();
    return;
  }
  if (title.kind === "film" && title.local) {
    beginTasteSession(viewerIdentity(), title.id);
    if (!episodeQueue.some((episode) => episode.id === title.id)) episodeQueue = [];
    nowPlaying = title;
    updateWatching(activeProfileId, (entries) => {
      const existing = entries.find((entry) => entry.titleId === title.id);
      const rest = entries.filter((entry) => entry.titleId !== title.id &&
        !(title.episode && entry.title?.kind === "film" && entry.title.episode?.seriesId === title.episode.seriesId));
      return [{ titleId: title.id, title, progress: existing?.progress ?? 0,
        season: title.episode?.season, episode: title.episode?.number }, ...rest];
    });
    return;
  }

  if (title.kind === "film" && title.remote) {
    beginTasteSession(viewerIdentity(), title.id);
    if (!title.episode || !episodeQueue.some(episode => episode.id === title.id)) episodeQueue = [];
    nowPlaying = title;
    emit();
    return;
  }

  if (title.kind === "tv-channel" || (title.kind === "channel" && title.twitchLogin)) {
    nowPlaying = title;
    emit();
    return;
  }
  if (title.kind === "live" || title.kind === "channel") {
    notify(title.kind === "live" ? "This event is unavailable to watch. Explore Live TV for sports coverage."
      : "This channel is unavailable right now.");
    return;
  }

  // Library and Archive films play here; set before updateWatching so its emit opens the player.
  const playsHere = title.kind === "film" && (title.video !== undefined || archiveIdentifier(title) !== null);
  if (playsHere) { nowPlaying = title; beginTasteSession(viewerIdentity(), title.id); }

  updateWatching(activeProfileId, (entries) => {
    const existing = entries.find((e) => e.titleId === titleId);
    const rest = entries.filter((e) => e.titleId !== titleId);
    if (!existing) {
      const started: WatchEntry =
        title.kind === "series"
          ? { titleId, progress: 0.1, season: 1, episode: 1, title }
          : { titleId, progress: 0.1, title };
      return [started, ...rest];
    }
    const progress = existing.progress + 0.1;
    if (progress < 0.97) return [{ ...existing, progress, title }, ...rest];
    // Finished: series move on to the next episode, films leave the row.
    if (title.kind === "series" && existing.episode !== undefined) {
      return [{ ...existing, progress: 0.02, episode: existing.episode + 1, title }, ...rest];
    }
    return rest;
  });

  if (!playsHere) notify(`Saved your place in ${title.title}.`);
}

export function removeFromWatching(title: Title) {
  const titleId = title.id;
  const { activeProfileId, watching } = getState();
  const entries = watching[activeProfileId] ?? [];
  const index = entries.findIndex((e) => e.titleId === titleId);
  if (index === -1) return;
  const removed = entries[index];

  updateWatching(activeProfileId, (list) => list.filter((e) => e.titleId !== titleId));

  notify(`Removed ${title.title} from Continue watching.`, () => {
    updateWatching(activeProfileId, (list) => {
      if (list.some((e) => e.titleId === titleId)) return list;
      const restored = [...list];
      restored.splice(Math.min(index, restored.length), 0, removed);
      return restored;
    });
  });
}
