"use client";

import { useSyncExternalStore } from "react";
import { emptyPreferences, observePlayback, recommendationKey, type Mood, type PlaybackSample, type RecommendationPreferences, type TasteFeedback } from "@/lib/recommendations";
import { parsePreferences } from "@/lib/recommendation-data";
import type { FilmTitle, Title } from "@/lib/catalog";
import { localClock } from "@/lib/recommendation-context";
import type { TastePatch } from "@/lib/account-taste";
import { isVisibleInBrowse } from "@/lib/library-visibility";

const prefix = "sidflix:taste:v1:";
const cache = new Map<string, RecommendationPreferences>();
const samples = new Map<string, PlaybackSample>();
const listeners = new Set<() => void>();
const lastWrites = new Map<string, number>();
type SyncStatus = "loading" | "ready" | "saving" | "offline";
type Cloud = { identity: string; userId: string; status: SyncStatus; queue: TastePatch[]; running: boolean; controller: AbortController };
let cloud: Cloud | null = null;
const pendingKey = (identity: string) => tasteStorageKey(identity) + ":pending";
function persistQueue(ref: Cloud) {
  try { localStorage.setItem(pendingKey(ref.identity), JSON.stringify(ref.queue)); } catch {}
}
async function flush(ref: Cloud) {
  if (cloud !== ref || ref.running || !ref.queue.length) return;
  ref.running = true; ref.status = "saving"; emit();
  try {
    while (ref.queue.length && cloud === ref) {
      const patch = ref.queue[0];
      const response = await fetch("/api/recommendations/preferences", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: ref.userId, patch }), signal: ref.controller.signal });
      if (!response.ok) throw Error("Sync unavailable");
      const result = await response.json();
      if (cloud !== ref || result.accountId !== ref.userId) return;
      if (ref.queue[0] === patch) ref.queue.shift();
      persistQueue(ref);
      if (!ref.queue.length && result.preferences) save(ref.identity, parsePreferences(result.preferences));
    }
    ref.status = "ready";
  } catch { if (cloud === ref) ref.status = "offline"; }
  finally { ref.running = false; if (cloud === ref) emit(); }
}
function enqueue(identity: string, patch: TastePatch) {
  const ref = cloud;
  if (!ref || ref.identity !== identity) return;
  const replace = patch.type === "progress" ? ref.queue.findIndex((queued, index) => index > (ref.running ? 0 : -1) && queued.type === "progress"
    && (queued.history[0] as { itemId?: string })?.itemId === (patch.history[0] as { itemId?: string })?.itemId) : -1;
  if (replace >= 0) ref.queue[replace] = patch; else ref.queue.push(patch);
  persistQueue(ref); void flush(ref);
}

export function connectRecommendationAccount(identity: string, userId: string, onHistory: (history: RecommendationPreferences["history"]) => void) {
  cloud?.controller.abort();
  let queue: TastePatch[] = [];
  try { const parsed = JSON.parse(localStorage.getItem(pendingKey(identity)) ?? "[]"); if (Array.isArray(parsed)) queue = parsed.slice(-100); } catch {}
  const ref: Cloud = { identity, userId, status: "loading", queue, running: false, controller: new AbortController() }; cloud = ref; emit();
  const refresh = async () => {
    if (cloud !== ref || ref.running) return;
    if (ref.queue.length) { await flush(ref); return; }
    try {
      const response = await fetch("/api/recommendations/preferences", { credentials: "same-origin", cache: "no-store", signal: ref.controller.signal });
      if (!response.ok) throw Error("Account unavailable");
      const result = await response.json();
      if (cloud !== ref || result.accountId !== userId || ref.queue.length || ref.running) return;
      const p = parsePreferences(result.preferences);
      save(identity, p); onHistory(p.history); ref.status = "ready"; emit();
    } catch { if (cloud === ref) { ref.status = "offline"; emit(); } }
  };
  void refresh();
  const focus = () => {
    // A history refresh can wait while the player is using the connection.
    if (document.visibilityState === "visible" && !document.querySelector("dialog[open] iframe, dialog[open] video")) void refresh();
  };
  const leaving = () => {
    const entry = cache.get(identity)?.history[0];
    if (entry && entry.lastWatchedAt > (lastWrites.get(identity) ?? 0)) {
      enqueue(identity, { type: "progress", history: [entry] });
      if (cloud === ref && ref.queue.length === 1) void fetch("/api/recommendations/preferences", { method: "POST", credentials: "same-origin", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: userId, patch: ref.queue[0] }) }).catch(() => {});
    }
  };
  const timer = setInterval(focus, 30_000);
  window.addEventListener("focus", focus); window.addEventListener("online", focus);
  document.addEventListener("visibilitychange", focus);
  window.addEventListener("pagehide", leaving);
  return () => { clearInterval(timer); window.removeEventListener("focus", focus); window.removeEventListener("online", focus); document.removeEventListener("visibilitychange", focus); window.removeEventListener("pagehide", leaving);
    ref.controller.abort(); if (cloud === ref) { cloud = null; emit(); } };
}
export function useRecommendationSync(identity: string) { return useSyncExternalStore(subscribe, () => cloud?.identity === identity ? cloud.status : "loading", () => "loading" as SyncStatus); }

export function tasteStorageKey(identity: string) { return prefix + encodeURIComponent(identity); }
function get(identity: string) {
  let value = cache.get(identity);
  if (!value) {
    try { value = parsePreferences(JSON.parse(localStorage.getItem(tasteStorageKey(identity)) ?? "null")); }
    catch { value = emptyPreferences; }
    cache.set(identity, value);
  }
  return value;
}
function emit() { for (const listener of listeners) listener(); }
function save(identity: string, value: RecommendationPreferences) {
  cache.set(identity, value);
  try { localStorage.setItem(tasteStorageKey(identity), JSON.stringify(value)); } catch { /* In-memory fallback. */ }
  emit();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(prefix)) { cache.clear(); samples.clear(); emit(); }
  };
  window.addEventListener("storage", storage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", storage); };
}
export function useRecommendationPreferences(identity: string) {
  return useSyncExternalStore(subscribe, () => get(identity), () => emptyPreferences);
}
export function updateRecommendationOptions(identity: string, patch: Partial<Pick<RecommendationPreferences, "seasonal" | "trending" | "hemisphere">>) {
  save(identity, { ...get(identity), ...patch });
  enqueue(identity, { type: "options", ...patch });
}
export function setDailyMood(identity: string, value: Mood, now: number, timeZone: string) {
  save(identity, { ...get(identity), mood: { day: localClock(now, timeZone).day, value } });
  enqueue(identity, { type: "mood", day: localClock(now, timeZone).day, value });
}
export function setTasteFeedback(identity: string, title: Title, value: TasteFeedback["value"] | null) {
  const current = get(identity), feedback = { ...current.feedback }, key = recommendationKey(title);
  if (value === null) delete feedback[key];
  else feedback[key] = { title, value, at: Date.now() };
  save(identity, { ...current, feedback: Object.fromEntries(Object.entries(feedback).sort((a, b) => a[1].at - b[1].at).slice(-300)) });
  enqueue(identity, { type: "feedback", title, value });
}
export function resetRecommendations(identity: string) {
  for (const key of samples.keys()) if (key.startsWith(identity + "|")) samples.delete(key);
  save(identity, { ...emptyPreferences });
  enqueue(identity, { type: "reset" });
}
export function beginTasteSession(identity: string, titleId: string) { samples.delete(`${identity}|${titleId}`); }
export function finishTasteSession(identity: string, titleId: string) {
  const entry = cache.get(identity)?.history.find(item => item.itemId === titleId);
  if (entry && cloud?.identity === identity) enqueue(identity, { type: "progress", history: [entry] });
  samples.delete(`${identity}|${titleId}`);
}
export function recordTastePlayback(identity: string, title: FilmTitle, progress: number, duration: number) {
  if (cloud?.identity !== identity || cloud.status === "loading" || !isVisibleInBrowse(title)) return;
  const now = Date.now(), key = `${identity}|${title.id}`, previous = samples.get(key), position = progress * duration;
  if (![position, duration].every(Number.isFinite) || duration <= 0) return;
  const current = get(identity);
  const next = observePlayback(current, title, position, duration, now, Intl.DateTimeFormat().resolvedOptions().timeZone, previous);
  samples.set(key, { time: now, position });
  if (next === current) return;
  cache.set(identity, next);
  // Persist periodically and on completion, rather than rewriting history each video frame.
  if (now - (lastWrites.get(identity) ?? 0) >= 10_000 || progress >= .97) {
    lastWrites.set(identity, now);
    save(identity, next);
    const entry = next.history.find(item => item.itemId === title.id);
    if (entry) enqueue(identity, { type: "progress", history: [entry] });
  }
}
