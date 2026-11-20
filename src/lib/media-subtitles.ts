import "server-only";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import ffmpeg from "ffmpeg-static";
import type { LocalMedia } from "@/lib/local-media";

export type SubtitleTrack = { id: string; label: string; language: string; src: string };
type TrackSource = SubtitleTrack & { file?: string; stream?: number };
const probes = new Map<string, Promise<string>>();
const captions = new Map<string, Promise<string>>();

function run(args: string[], probe = false): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ffmpeg) { reject(new Error("FFmpeg unavailable")); return; }
    execFile(ffmpeg, ["-hide_banner", "-nostdin", ...args], {
      windowsHide: true, timeout: probe ? 15_000 : 120_000, maxBuffer: 8 * 1024 * 1024, encoding: "utf8",
    }, (error, stdout, stderr) => {
      if (probe) resolve(stderr);
      else if (error) reject(new Error("Subtitle conversion failed"));
      else resolve(stdout);
    });
  });
}

export function embeddedSubtitleStreams(probe: string): { stream: number; language: string }[] {
  return [...probe.matchAll(/Stream #0:(\d+)(?:\[[^\]]+\])?(?:\(([^)]+)\))?[^\r\n]*?: Subtitle: (\w+)/g)]
    .filter((match) => /^(?:subrip|ass|ssa|webvtt|mov_text|text)$/.test(match[3]))
    .map((match) => ({ stream: Number(match[1]), language: match[2] ?? "und" }));
}

function languageName(language: string) {
  try { return new Intl.DisplayNames(["en"], { type: "language" }).of(language) ?? language; }
  catch { return language.toUpperCase(); }
}

async function trackSources(media: LocalMedia): Promise<TrackSource[]> {
  const info = await stat(media.path);
  const key = `${media.id}:${info.mtimeMs}:${info.size}`;
  let probe = probes.get(key);
  if (!probe) {
    probe = run(["-i", media.path], true);
    if (probes.size >= 128) probes.delete(probes.keys().next().value!);
    probes.set(key, probe);
    probe.catch(() => probes.delete(key));
  }
  const make = (id: string, language: string, label: string): SubtitleTrack => ({
    id, language, label, src: `/api/library/${media.id}/subtitles/${id}`,
  });
  const embedded = embeddedSubtitleStreams(await probe).map(({ stream, language }, index) => ({
    ...make(`embedded-${stream}`, language, `${languageName(language)} · Track ${index + 1}`), stream,
  }));
  const directory = path.dirname(media.path);
  const stem = path.basename(media.path, path.extname(media.path)).toLowerCase();
  const sidecars: TrackSource[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile() || entry.isSymbolicLink() || !/\.(srt|vtt|ass|ssa)$/i.test(entry.name)) continue;
    const basename = path.basename(entry.name, path.extname(entry.name)).toLowerCase();
    if (basename !== stem && !basename.startsWith(`${stem}.`)) continue;
    const file = await realpath(path.join(directory, entry.name));
    if (path.dirname(file) !== directory) continue;
    const language = basename.slice(stem.length + 1).split(".")[0] || "und";
    const id = `sidecar-${createHash("sha256").update(entry.name).digest("hex").slice(0, 16)}`;
    sidecars.push({ ...make(id, language, `${language === "und" ? "Subtitles" : languageName(language)} · External`), file });
  }
  return [...embedded, ...sidecars];
}

export async function subtitleTracks(media: LocalMedia): Promise<SubtitleTrack[]> {
  return (await trackSources(media)).map(({ id, label, language, src }) => ({ id, label, language, src }));
}

export async function subtitleContent(media: LocalMedia, id: string): Promise<string | null> {
  const track = (await trackSources(media)).find((entry) => entry.id === id);
  if (!track) return null;
  const info = await stat(track.file ?? media.path);
  const key = `${media.id}:${id}:${info.size}:${info.mtimeMs}`;
  let content = captions.get(key);
  if (!content) {
    content = run(track.file
      ? ["-loglevel", "error", "-i", track.file, "-c:s", "webvtt", "-f", "webvtt", "pipe:1"]
      : ["-loglevel", "error", "-i", media.path, "-map", `0:${track.stream}`, "-c:s", "webvtt", "-f", "webvtt", "pipe:1"]);
    if (captions.size >= 8) captions.delete(captions.keys().next().value!);
    captions.set(key, content);
    content.catch(() => captions.delete(key));
  }
  return content;
}
