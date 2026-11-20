import "server-only";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import ffmpeg from "ffmpeg-static";
import type { LocalMedia } from "@/lib/local-media";

export const SEGMENT_SECONDS = 6;
const durations = new Map<string, Promise<number>>();
const pending = new Map<string, Promise<Buffer>>();
const segments = new Map<string, Buffer>();
let cacheBytes = 0;
let active = 0;
const MAX_CACHE_BYTES = 32 * 1024 * 1024;

export class MediaBusyError extends Error {}

function binary(): string {
  if (!ffmpeg) throw new Error("FFmpeg is unavailable on this platform");
  return ffmpeg;
}

async function version(media: LocalMedia): Promise<string> {
  const info = await stat(media.path);
  return `${media.id}:${info.size}:${info.mtimeMs}`;
}

/** Probe only the selected video; indexing never starts hundreds of FFmpeg processes. */
export async function mediaDuration(media: LocalMedia): Promise<number> {
  const key = await version(media);
  const cached = durations.get(key);
  if (cached) return cached;
  const duration = new Promise<number>((resolve, reject) => {
    execFile(binary(), ["-hide_banner", "-nostdin", "-i", media.path], {
      windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024, encoding: "utf8",
    }, (_error, _stdout, stderr) => {
      // With no output specified FFmpeg exits nonzero after printing input metadata.
      const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
      const seconds = match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0;
      if (seconds > 0) resolve(seconds);
      else reject(new Error("Could not read video duration"));
    });
  });
  if (durations.size >= 256) durations.delete(durations.keys().next().value!);
  durations.set(key, duration);
  duration.catch(() => durations.delete(key));
  return duration;
}

export function mediaPlaylist(id: string, duration: number): string {
  const lines = [
    "#EXTM3U", "#EXT-X-VERSION:3", `#EXT-X-TARGETDURATION:${SEGMENT_SECONDS}`,
    "#EXT-X-MEDIA-SEQUENCE:0", "#EXT-X-PLAYLIST-TYPE:VOD", "#EXT-X-INDEPENDENT-SEGMENTS",
  ];
  for (let n = 0; n < Math.ceil(duration / SEGMENT_SECONDS); n++) {
    lines.push(`#EXTINF:${Math.min(SEGMENT_SECONDS, duration - n * SEGMENT_SECONDS).toFixed(3)},`,
      `/api/library/${id}/segment/${n}`);
  }
  return [...lines, "#EXT-X-ENDLIST", ""].join("\n");
}

/** Encode the requested six seconds, so seeking never requires converting a whole movie. */
export async function transcodeSegment(media: LocalMedia, segment: number): Promise<Buffer> {
  const duration = await mediaDuration(media);
  const start = segment * SEGMENT_SECONDS;
  if (!Number.isSafeInteger(segment) || segment < 0 || start >= duration) {
    throw new RangeError("Segment out of range");
  }
  const key = `${await version(media)}:${segment}`;
  const cached = segments.get(key);
  if (cached) {
    segments.delete(key);
    segments.set(key, cached);
    return cached;
  }
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  // Bound CPU and memory even if several tabs request playback at once.
  if (active >= 2) throw new MediaBusyError("Player busy; retry shortly");
  active++;
  const encoding = new Promise<Buffer>((resolve, reject) => {
    execFile(binary(), [
      "-hide_banner", "-loglevel", "error", "-nostdin", "-threads", "2",
      "-ss", String(start), "-i", media.path,
      "-t", String(Math.min(SEGMENT_SECONDS, duration - start)),
      "-map", "0:v:0", "-map", "0:a:0?", "-sn", "-dn",
      "-vf", "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,setpts=PTS-STARTPTS",
      "-r", "30", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
      "-pix_fmt", "yuv420p", "-threads", "2", "-g", "180", "-sc_threshold", "0",
      "-maxrate", "4000k", "-bufsize", "8000k",
      "-af", "asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0",
      "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "48000",
      "-output_ts_offset", String(start), "-muxdelay", "0", "-muxpreload", "0",
      "-f", "mpegts", "pipe:1",
    ], { windowsHide: true, timeout: 60_000, maxBuffer: 16 * 1024 * 1024, encoding: "buffer" },
    (error, stdout) => {
      if (error || !stdout.length) reject(new Error("Video conversion failed"));
      else resolve(stdout);
    });
  });
  pending.set(key, encoding);
  try {
    const bytes = await encoding;
    segments.set(key, bytes);
    cacheBytes += bytes.length;
    while (cacheBytes > MAX_CACHE_BYTES && segments.size) {
      const oldest = segments.keys().next().value!;
      cacheBytes -= segments.get(oldest)!.length;
      segments.delete(oldest);
    }
    return bytes;
  } finally {
    active--;
    pending.delete(key);
  }
}
