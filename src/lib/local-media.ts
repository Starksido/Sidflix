import "server-only";
import { createHash } from "node:crypto";
import { readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { FilmTitle } from "@/lib/catalog";
import { artFromSeed } from "@/lib/sources/util";
import { rememberAdded } from "@/lib/library-added";

const extensions = new Set([".mp4", ".m4v", ".webm", ".mkv", ".avi", ".mov", ".wmv", ".ts"]);
type Root = { path: string; recursive: boolean };
export type LocalMedia = { id: string; path: string; root: Root; title: FilmTitle };

let index: { key: string; expires: number; files: Promise<LocalMedia[]> } | undefined;

export function parseMediaRoots(value: string): Root[] {
  if (!value.trim()) return [];
  const roots: unknown = JSON.parse(value);
  if (!Array.isArray(roots)) throw new Error("LOCAL_MEDIA_ROOTS must be a JSON array");
  return roots.map((root: unknown) => {
    if (!root || typeof root !== "object" || !("path" in root) ||
        typeof root.path !== "string" || !path.isAbsolute(root.path) ||
        ("recursive" in root && typeof root.recursive !== "boolean")) {
      throw new Error("Each media root needs an absolute path and an optional recursive boolean");
    }
    return { path: root.path, recursive: !("recursive" in root) || root.recursive === true };
  });
}

/** Discard release tags without treating episode numbers as a release year. */
export function mediaName(filename: string): { title: string; year: number | null } {
  const stem = path.basename(filename, path.extname(filename)).replace(/[._]+/g, " ");
  const episode = /\bS\d{1,2}\s?E\d{1,3}\b/i.exec(stem);
  const year = episode ? null : /\b(19\d{2}|20\d{2})\b/.exec(stem);
  const release = /\b(?:480p|720p|1080p|2160p|4k|10bit|8bit|WEB[ -]?(?:DL|RIP)|BluRay|BRRip|HDRip|HDTV|x26[45]|HEVC|H26[45]|INTERNAL)\b/i.exec(stem);
  const end = year?.index ?? release?.index ?? stem.length;
  const title = stem.slice(0, end).replace(/[\s([\]-]+$/, "").replace(/\s+/g, " ").trim();
  return { title: title || stem.trim(), year: year ? Number(year[1]) : null };
}

function identity(filename: string): string {
  const normalized = process.platform === "win32" ? filename.toLowerCase() : filename;
  return `local-${createHash("sha256").update(normalized).digest("hex").slice(0, 32)}`;
}

export function episodeFromTitle(title: string): FilmTitle["episode"] {
  const match = /^(.*?)\s+S(\d{1,2})\s?E(\d{1,3})\b\s*(.*)$/i.exec(title);
  if (!match) return undefined;
  // Telegram releases sometimes include a year before S01E01 and sometimes omit it.
  const seriesTitle = match[1].replace(/\s+\(?(?:19|20)\d{2}\)?$/, "").trim();
  const key = seriesTitle.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return {
    seriesId: `show-${createHash("sha256").update(key).digest("hex").slice(0, 24)}`,
    seriesTitle, season: Number(match[2]), number: Number(match[3]),
    name: match[4].replace(/\s*@\S+.*$/, "").replace(/\b(?:RuffgSeriesss|iBoxTV)\b.*$/i, "").trim() || `Episode ${Number(match[3])}`,
  };
}

async function scan(roots: Root[]): Promise<LocalMedia[]> {
  const files = new Map<string, LocalMedia>();
  async function walk(directory: string, root: Root) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      // Do not follow shortcuts, junctions or symlinks into unconfigured folders.
      if (entry.isSymbolicLink()) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory() && root.recursive) {
        try { await walk(filename, root); }
        catch { console.warn("[local library] skipped an unreadable subfolder"); }
      } else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
        const id = identity(filename);
        const { title, year } = mediaName(entry.name);
        const video = `/api/library/${id}/stream`;
        files.set(id, {
          id, path: filename, root,
          title: {
            id, kind: "film", title, year, minutes: null, niche: "indie", maturity: "16+",
            synopsis: `Watch ${title} from your local library.`,
            art: artFromSeed(episodeFromTitle(title)?.seriesId ?? id), video, local: true,
            episode: episodeFromTitle(title),
            source: { label: "On this machine", href: video },
          },
        });
      }
    }
  }
  for (const root of roots) {
    try {
      const directory = await realpath(root.path);
      await walk(directory, { ...root, path: directory });
    } catch {
      console.warn(`[local library] cannot read configured folder: ${root.path}`);
    }
  }
  const dates = await rememberAdded([...files.keys()], Date.now());
  for (const file of files.values()) file.title.addedAt = dates[file.id];
  return [...files.values()].sort((a, b) =>
    a.title.title.localeCompare(b.title.title, undefined, { numeric: true, sensitivity: "base" }));
}

/** A short server-only index; the browser only receives opaque IDs and display metadata. */
export function getLocalMedia(): Promise<LocalMedia[]> {
  const roots = process.env.LOCAL_MEDIA_ROOTS ?? "";
  const key = `${roots}|${process.env.LOCAL_MEDIA_INDEX_PATH ?? ""}`;
  if (index?.key === key && index.expires > Date.now()) return index.files;
  const files = scan(parseMediaRoots(roots));
  index = { key, expires: Date.now() + 30_000, files };
  return files;
}

export async function findLocalMedia(id: string): Promise<LocalMedia | null> {
  if (!/^local-[a-f0-9]{32}$/.test(id)) return null;
  const media = (await getLocalMedia()).find((file) => file.id === id);
  if (!media) return null;
  try {
    // Recheck containment on every request in case a file was replaced by a link.
    const actual = await realpath(media.path);
    const relative = path.relative(media.root.path, actual);
    if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) ||
        (!media.root.recursive && path.dirname(actual) !== media.root.path)) return null;
    if (!(await stat(actual)).isFile()) return null;
    return { ...media, path: actual };
  } catch {
    return null;
  }
}
