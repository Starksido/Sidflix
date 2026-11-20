"use client";

import { useSyncExternalStore } from "react";
import type { DownloadItem, DownloadVariant } from "@/lib/download-catalog";
import { claimSavedDownload, clearDownloadChunks, commitDownloadChunk, finishOwnedDownload, listSavedDownloads, pauseSavedDownload, queueSavedDownload, removeSavedDownload, type SavedDownload } from "@/lib/downloads-db";

export const DOWNLOAD_VIEWER_KEY = "sidflix:downloads:viewer";
const EMPTY: SavedDownload[] = [];
let jobs: SavedDownload[] = EMPTY, accountId: string | null = null, generation = 0, processing = false;
let current: { key: string; controller: AbortController; promise: Promise<void> } | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => jobs;
export function useSavedDownloads() { return useSyncExternalStore(subscribe, snapshot, () => EMPTY); }
function publish(job: SavedDownload) {
  if (job.accountId !== accountId) return;
  jobs = [job, ...jobs.filter(other => other.key !== job.key)].sort((a, b) => b.createdAt - a.createdAt); listeners.forEach(listener => listener());
}
export async function connectDownloadAccount(account: { id: string; name: string } | null) {
  try { if (account) localStorage.setItem(DOWNLOAD_VIEWER_KEY, JSON.stringify(account)); else localStorage.removeItem(DOWNLOAD_VIEWER_KEY); } catch {}
  if (accountId === (account?.id ?? null)) return;
  const token = ++generation; current?.controller.abort(); accountId = account?.id ?? null; jobs = EMPTY; listeners.forEach(listener => listener());
  try {
    if (!account || typeof indexedDB === "undefined") return;
    const saved = await listSavedDownloads(account.id); if (token !== generation) return;
    jobs = saved.map(job => ["downloading", "pausing", "queued"].includes(job.status) ? { ...job, status: "paused" as const } : job).sort((a, b) => b.createdAt - a.createdAt);
    listeners.forEach(listener => listener());
  } catch { /* The page reports storage errors when a download is requested. */ }
}
export async function enqueueDownload(item: DownloadItem, variant: DownloadVariant) {
  if (!accountId) throw new Error("Please sign in before downloading.");
  if (typeof indexedDB === "undefined") throw new Error("This browser can’t save downloads. Use Save video file instead.");
  const key = `${accountId}:${item.id}:${variant.id}`, previous = jobs.find(job => job.key === key);
  if (previous?.status === "completed" || previous?.status === "downloading" || previous?.status === "queued") return;
  const job: SavedDownload = previous ? { ...previous, status: "queued", error: undefined, lease: undefined } : {
    key, accountId, itemId: item.id, variantId: variant.id, title: item.title, year: item.year, poster: item.poster, quality: variant.label,
    mime: variant.mime, bytes: variant.bytes, downloaded: 0, status: "queued", createdAt: Date.now(),
  };
  const queued = await queueSavedDownload(job); if (!queued) throw new Error("This download is active in another tab."); publish(queued); void processQueue();
}
export async function pauseDownload(key: string) {
  const job = jobs.find(job => job.key === key); if (!job) return;
  if (current?.key === key) { publish({ ...job, status: "pausing" }); current.controller.abort(); await current.promise; }
  else { const paused = await pauseSavedDownload(key); if (paused) publish(paused); }
}
export async function resumeDownload(key: string) {
  const job = jobs.find(job => job.key === key); if (!job || ["pausing", "downloading"].includes(job.status)) return;
  const queued = await queueSavedDownload(job); if (!queued) throw new Error("This download is active in another tab."); publish(queued); void processQueue();
}
export async function deleteDownload(key: string) {
  const owner = accountId;
  if (!jobs.some(job => job.key === key)) return;
  await pauseDownload(key); await removeSavedDownload(key);
  if (owner === accountId) { jobs = jobs.filter(job => job.key !== key); listeners.forEach(listener => listener()); }
}
async function processQueue() {
  if (processing) return; processing = true;
  try {
    for (;;) {
      const next = jobs.filter(job => job.status === "queued").sort((a, b) => a.createdAt - b.createdAt)[0]; if (!next) break;
      const controller = new AbortController(), promise = runDownload(next, controller);
      current = { key: next.key, controller, promise }; await promise; current = null;
    }
  } finally { current = null; processing = false; }
}
async function runDownload(initial: SavedDownload, controller: AbortController) {
  const owner = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  let job = initial, buffers: BlobPart[] = [], buffered = 0;
  const flush = async () => {
    if (!buffered) return;
    job = await commitDownloadChunk(job, new Blob(buffers), owner); buffers = []; buffered = 0; publish(job);
  };
  try {
    const claimed = await claimSavedDownload(job.key, owner);
    if (!claimed) { publish({ ...job, status: "paused", error: "This download is active in another tab." }); return; }
    job = claimed; publish(job);
    // A tab may close after committing the last chunk but before marking completion.
    if (job.downloaded === job.bytes) {
      const finished = await finishOwnedDownload({ ...job, status: "completed", error: undefined }, owner);
      if (finished) publish(finished); return;
    }
    const storage = await navigator.storage?.estimate?.();
    if (storage?.quota && storage.quota - (storage.usage ?? 0) < job.bytes - job.downloaded + 5_000_000) throw new Error("There isn’t enough free space on this device.");
    const offset = job.downloaded;
    const response = await fetch(`/api/downloads/${encodeURIComponent(job.itemId)}/file?quality=${encodeURIComponent(job.variantId)}`, {
      signal: controller.signal, credentials: "same-origin", headers: { ...(offset ? { Range: `bytes=${offset}-` } : {}), ...(offset && job.validator ? { "If-Range": job.validator } : {}) },
    });
    if (!response.ok || !response.body) {
      const error = await response.json().catch(() => null); throw new Error(error?.error ?? "The download couldn’t connect. Please try again.");
    }
    if (response.status === 200 && offset) { await clearDownloadChunks(job, owner); job = { ...job, downloaded: 0 }; publish(job); }
    const remaining = Number(response.headers.get("content-length"));
    if (!Number.isSafeInteger(remaining) || remaining !== job.bytes - job.downloaded || response.status === 206 && response.headers.get("content-range") !== `bytes ${job.downloaded}-${job.bytes - 1}/${job.bytes}`) { await response.body.cancel(); throw new Error("The download changed. Remove it and try again."); }
    const etag = response.headers.get("etag"), modified = response.headers.get("last-modified");
    job = { ...job, validator: etag && !etag.startsWith("W/") ? etag : modified ?? undefined };
    const reader = response.body.getReader();
    try {
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        if (job.downloaded + buffered + value.byteLength > job.bytes) throw new Error("The download exceeded its expected size.");
        buffers.push(new Blob([value])); buffered += value.byteLength;
        if (buffered >= 1024 * 1024) await flush();
      }
      await flush();
      if (job.downloaded !== job.bytes) throw new Error("The connection stopped early. Resume to continue.");
    } finally { await reader.cancel().catch(() => {}); }
    job = { ...job, status: "completed", error: undefined }; const finished = await finishOwnedDownload(job, owner); if (finished) publish(finished);
  } catch (error) {
    try { await flush(); } catch { /* Uncommitted data can be fetched again on resume. */ }
    const message = error instanceof DOMException ? error.name === "QuotaExceededError" ? "This device’s download storage is full." : "The download couldn’t be saved. Please try again." : error instanceof TypeError ? "Connection lost. Resume when you’re back online." : error instanceof Error ? error.message : "The download couldn’t be saved.";
    job = { ...job, status: controller.signal.aborted ? "paused" : "error", error: controller.signal.aborted ? undefined : message };
    const finished = await finishOwnedDownload(job, owner).catch(() => null); if (finished) publish(finished);
  }
}
