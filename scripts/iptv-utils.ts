import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseIptvPlaylist, playlistLinks, publicStreamUrl } from "../src/lib/iptv-playlist";

export type ChannelChoice = { id: string; label: string; language: string; country: string };
type StoredChannel = { id: string; name: string; language: string; country: string; urls: string[]; logo?: string; checkedAt: string };
const origin = "http://127.0.0.1:3000";

async function playlist(url: string): Promise<{ text: string; url: string }> {
  const response = await fetch(url, { headers: { Origin: origin }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
  const cors = ["*", origin].includes(response.headers.get("access-control-allow-origin") ?? "");
  if (!cors) { await response.body?.cancel(); throw new Error("Playlist has no browser CORS access"); }
  const text = await response.text();
  if (!text.trimStart().startsWith("#EXTM3U")) throw new Error("Not an HLS playlist");
  return { text, url: response.url };
}

export async function probeStream(url: string) {
  let media = await playlist(url);
  for (let depth = 0; media.text.includes("#EXT-X-STREAM-INF:") && depth < 3; depth++) {
    const children = playlistLinks(media.text, media.url);
    if (!children.length) throw new Error("No playable variants");
    media = await playlist(children[0]);
  }
  if (/METHOD=(?:SAMPLE-AES|SAMPLE-AES-CTR)/.test(media.text)) throw new Error("DRM stream not supported");
  const segments = playlistLinks(media.text, media.url);
  if (!segments.length) throw new Error("No video segments");
  const response = await fetch(segments[Math.max(0, segments.length - 2)], {
    headers: { Origin: origin, Range: "bytes=0-2047" }, signal: AbortSignal.timeout(12_000),
  });
  const cors = ["*", origin].includes(response.headers.get("access-control-allow-origin") ?? "");
  if (!response.ok || !cors) { await response.body?.cancel(); throw new Error(`Segment ${response.status}, CORS ${cors}`); }
  const reader = response.body?.getReader();
  const bytes = await reader?.read();
  await reader?.cancel();
  if (!bytes?.value?.length) throw new Error("Empty video segment");
}

async function downloadLogo(id: string, url: string | undefined): Promise<string | undefined> {
  if (!url || !publicStreamUrl(url)) return;
  try {
    const image = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    const mime = image.headers.get("content-type") ?? "";
    if (!image.ok || !/image\/(?:png|jpeg|webp)/.test(mime)) { await image.body?.cancel(); return; }
    const data = new Uint8Array(await image.arrayBuffer());
    if (data.length >= 1024 * 1024) return;
    const extension = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
    await mkdir("public/media-channels", { recursive: true });
    const logo = `/media-channels/${id}.${extension}`;
    await writeFile(path.join("public", logo), data);
    return logo;
  } catch { /* Keep working channels even when artwork cannot be downloaded. */ }
}

export async function syncChannelPlaylist(category: "sports" | "movies", choices: ChannelChoice[]) {
  const playlistUrl = `https://iptv-org.github.io/iptv/categories/${category}.m3u`;
  await mkdir("artifacts/iptv", { recursive: true });
  const response = await fetch(playlistUrl, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Playlist download ${response.status}`);
  const raw = await response.text();
  await writeFile(`artifacts/iptv/${category}.m3u`, raw);
  const entries = parseIptvPlaylist(raw);
  const channels: StoredChannel[] = [];
  const checks: { name: string; feed: string; ok: boolean; reason?: string }[] = [];
  for (const choice of choices) {
    const entry = entries.find((entry) => entry.id === choice.id);
    if (!entry) { checks.push({ name: choice.label, feed: choice.id, ok: false, reason: "Not listed as a browser-compatible HTTPS feed" }); continue; }
    try {
      await probeStream(entry.url);
      const previous = channels.find((channel) => channel.name === choice.label);
      if (previous) previous.urls.push(entry.url);
      else channels.push({ id: `iptv-${choice.id.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        name: choice.label, country: choice.country, language: choice.language, urls: [entry.url], checkedAt: new Date().toISOString() });
      const channel = previous ?? channels[channels.length - 1];
      if (!channel.logo) channel.logo = await downloadLogo(channel.id, entry.logo);
      checks.push({ name: choice.label, feed: choice.id, ok: true });
      console.log(`Passed: ${choice.label} (${choice.id})`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unavailable";
      checks.push({ name: choice.label, feed: choice.id, ok: false, reason });
      console.log(`Skipped: ${choice.label}: ${reason}`);
    }
  }
  await writeFile(`artifacts/iptv/${category}-checks.json`, JSON.stringify(checks, null, 2));
  if (!channels.length) throw new Error("No streams passed; existing channel data retained");
  await mkdir("data", { recursive: true });
  const file = category === "movies" ? "movie-channels" : "sports-channels";
  await writeFile(`data/${file}.json`, JSON.stringify({ source: playlistUrl, channels }, null, 2));
  console.log(JSON.stringify({ checked: checks.length, channels: channels.map((channel) => channel.name) }));
}
