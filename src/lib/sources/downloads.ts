import "server-only";
import { DOWNLOAD_TITLES, type DownloadItem, type DownloadVariant } from "@/lib/download-catalog";

export const MAX_DOWNLOAD_BYTES = 2_147_483_648;
export type ResolvedDownload = DownloadVariant & { url: string };
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const size = (value: unknown) => { const n = Number(value); return Number.isSafeInteger(n) && n > 0 && n <= MAX_DOWNLOAD_BYTES ? n : null; };
export function isDownloadUrlAllowed(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") &&
      (["video.blender.org", "upload.wikimedia.org", "archive.org"].includes(url.hostname) || /^(?:ia|dn)\d+\.(?:us|ca|eu)\.archive\.org$/.test(url.hostname));
  } catch { return false; }
}
/** Every redirect is checked; the caller can never supply an arbitrary fetch URL. */
export async function fetchDownloadSource(url: string, init: RequestInit = {}): Promise<Response> {
  for (let hop = 0; hop < 5; hop++) {
    if (!isDownloadUrlAllowed(url)) throw new Error("Download address is not allowed");
    const response = await fetch(url, { ...init, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location"); await response.body?.cancel();
    if (!location) throw new Error("Missing download redirect");
    url = new URL(location, url).href;
  }
  throw new Error("Too many download redirects");
}
export function parseBlenderDownloads(value: unknown, uuid: string): ResolvedDownload[] {
  const data = record(value);
  if (data.downloadEnabled !== true || !Array.isArray(data.files)) return [];
  return data.files.flatMap(raw => {
    const file = record(raw), resolution = record(file.resolution), quality = resolution.id, bytes = size(file.size);
    if (![240, 360, 480, 720, 1080].includes(Number(quality)) || typeof quality !== "number" || !bytes || file.hasVideo !== true) return [];
    return [{ id: `blender-${quality}`, label: `${quality}p`, bytes, mime: "video/mp4" as const, url: `https://video.blender.org/download/web-videos/${uuid}-${quality}.mp4` }];
  }).sort((a, b) => b.bytes - a.bytes).filter((item, index, all) => all.findIndex(other => other.id === item.id) === index);
}
export function parseArchiveDownloads(value: unknown): ResolvedDownload[] {
  const data = record(value), metadata = record(data.metadata);
  if (data.is_dark || metadata.nodownload || !Array.isArray(data.files)) return [];
  const file = data.files.map(record).find(file => file.name === "BigBuckBunny_512kb.mp4"), bytes = size(file?.size);
  return bytes ? [{ id: "archive-240", label: "240p", bytes, mime: "video/mp4", url: "https://archive.org/download/BigBuckBunny_328/BigBuckBunny_512kb.mp4" }] : [];
}
const cache = new Map<string, { until: number; promise: Promise<ResolvedDownload[]> }>();
export async function resolveDownloadVariants(id: string): Promise<ResolvedDownload[]> {
  if (!DOWNLOAD_TITLES.some(item => item.id === id)) return [];
  const previous = cache.get(id); if (previous && previous.until > Date.now()) return previous.promise;
  const promise = (async () => {
    if (id === "caminandes-llama-drama") return [{ id: "commons-480", label: "480p", bytes: 4749930, mime: "video/webm" as const,
      url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/d/d0/Caminandes-_Llama_Drama_-_Short_Movie.ogv/Caminandes-_Llama_Drama_-_Short_Movie.ogv.480p.vp9.webm" }];
    const url = id === "big-buck-bunny" ? "https://archive.org/metadata/BigBuckBunny_328" : "https://video.blender.org/api/v1/videos/23f3ef79-15dc-44c5-aa45-cf92e78a4509";
    const response = await fetchDownloadSource(url, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error("Download options unavailable");
    const data: unknown = await response.json();
    return id === "big-buck-bunny" ? parseArchiveDownloads(data) : parseBlenderDownloads(data, "23f3ef79-15dc-44c5-aa45-cf92e78a4509");
  })();
  cache.set(id, { until: Date.now() + 15 * 60_000, promise });
  promise.catch(() => { if (cache.get(id)?.promise === promise) cache.delete(id); });
  return promise;
}
export async function getDownloadCatalogue(): Promise<DownloadItem[]> {
  const results = await Promise.allSettled(DOWNLOAD_TITLES.map(async title => {
    const variants = await resolveDownloadVariants(title.id);
    return { ...title, variants: variants.map(({ id, label, bytes, mime }) => ({ id, label, bytes, mime })) };
  }));
  return results.flatMap(result => result.status === "fulfilled" && result.value.variants.length ? [result.value] : []);
}
