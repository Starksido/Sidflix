"use client";

import { useSyncExternalStore } from "react";
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
} from "@/lib/catalog";

// Per-browser viewer state: active profile and each profile's watch progress.
// Kept in localStorage until accounts and a watch-history table exist.

type ViewerState = {
  activeProfileId: string;
  watching: Record<string, WatchEntry[]>;
};

type Notice = { id: number; message: string; undo?: () => void };

const STORAGE_KEY = "sidflix:viewer:v1";

const initialState: ViewerState = {
  activeProfileId: profiles[0].id,
  watching: seedWatching,
};

let state: ViewerState | null = null;
let notice: Notice | null = null;
let nowPlaying: Playable | null = null;
let noticeId = 0;
const listeners = new Set<() => void>();

function load(): ViewerState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<ViewerState>;
    const activeProfileId = profiles.some((p) => p.id === parsed.activeProfileId)
      ? parsed.activeProfileId!
      : initialState.activeProfileId;
    return { activeProfileId, watching: { ...seedWatching, ...parsed.watching } };
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
    if (event.key !== STORAGE_KEY) return;
    state = load();
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
  nowPlaying = null;
  emit();
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
  const { activeProfileId } = useViewerState();
  return profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
}

export function useIsAllowed(maturity: Maturity): boolean {
  return isAllowed(maturity, useActiveProfile().maxMaturity);
}

export function switchProfile(profileId: string) {
  const current = getState();
  if (current.activeProfileId === profileId) return;
  setState({ ...current, activeProfileId: profileId });
}

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
  const { activeProfileId } = getState();

  if (title.kind === "channel" && title.twitchLogin) {
    nowPlaying = title;
    emit();
    return;
  }
  if (title.kind === "live" || title.kind === "channel") {
    notify(`${title.title} is ready to watch once the live player is built.`);
    return;
  }

  // Library and Archive films play here; set before updateWatching so its emit opens the player.
  const playsHere = title.kind === "film" && (title.video !== undefined || archiveIdentifier(title) !== null);
  if (playsHere) nowPlaying = title;

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
