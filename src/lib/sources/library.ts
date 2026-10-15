import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { maturityOrder, type FilmTitle, type Maturity } from "@/lib/catalog";
import { artFromSeed, clip, fetchJson } from "@/lib/sources/util";

// Your own videos, listed in a videos.json file in a GitHub repository you control.
// Set LIBRARY_MANIFEST_URL to that file's raw URL; without it the library row is hidden.
// The file's format is documented in the sidflix-videos template's README.

/** Catalogue ids for library videos are the manifest id with this prefix. */
const ID_PREFIX = "lib-";

// next/image only loads posters from hosts listed in next.config.ts, so posters must
// live in the repo itself and be linked by their raw URL.
const POSTER_HOSTS = new Set(["raw.githubusercontent.com"]);

type Entry = {
  id?: unknown;
  title?: unknown;
  year?: unknown;
  minutes?: unknown;
  synopsis?: unknown;
  video?: unknown;
  poster?: unknown;
  maturity?: unknown;
  director?: unknown;
};

function httpsUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** One manifest entry as a film, or the reason it was skipped. */
function toTitle(entry: Entry): FilmTitle | string {
  const { id, title, year, minutes, synopsis, maturity, director } = entry;
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) {
    return `id must be lowercase letters, digits and hyphens (got ${JSON.stringify(id)})`;
  }
  if (typeof title !== "string" || !title.trim()) return `${id}: title is missing`;
  if (!Number.isInteger(year) || (year as number) < 1880 || (year as number) > 2100) {
    return `${id}: year must be a whole number like 2026`;
  }
  if (typeof minutes !== "number" || !(minutes > 0)) return `${id}: minutes must be a positive number`;
  if (typeof synopsis !== "string" || !synopsis.trim()) return `${id}: synopsis is missing`;
  const video = httpsUrl(entry.video);
  if (!video) return `${id}: video must be an https link`;
  const rating = maturity ?? "16+";
  if (!maturityOrder.includes(rating as Maturity)) {
    return `${id}: maturity must be one of ${maturityOrder.join(", ")}`;
  }

  const poster = httpsUrl(entry.poster);
  if (entry.poster !== undefined && (!poster || !POSTER_HOSTS.has(poster.host))) {
    console.warn(`[library] ${id}: poster ignored; use a raw.githubusercontent.com link to an image in the repo`);
  }

  return {
    id: `${ID_PREFIX}${id}`,
    kind: "film",
    title: clip(title, 60),
    niche: "indie",
    maturity: rating as Maturity,
    year: year as number,
    minutes: Math.round(minutes),
    synopsis: clip(synopsis, 220),
    ...(typeof director === "string" && director.trim() ? { director: clip(director, 60) } : {}),
    video: video.toString(),
    art: {
      ...artFromSeed(id),
      ...(poster && POSTER_HOSTS.has(poster.host) ? { image: { poster: poster.toString() } } : {}),
    },
    source: { label: "Your library", href: video.toString() },
  };
}

/**
 * Every valid video in your manifest, in the order listed. Null when no manifest is
 * linked. Invalid entries are skipped with a warning, so one typo doesn't hide the row.
 */
export async function getLibraryFilms(): Promise<FilmTitle[] | null> {
  "use cache";
  // New videos appear within the hour; restart the dev server to see them at once.
  cacheLife("hours");
  cacheTag("source:library");

  const url = process.env.LIBRARY_MANIFEST_URL;
  if (!url) return null;

  const data = await fetchJson<unknown>(url);
  const list = Array.isArray(data) ? data : (data as { videos?: unknown } | null)?.videos;
  if (!Array.isArray(list)) throw new Error('videos.json must be { "videos": [...] }');

  const films: FilmTitle[] = [];
  const seen = new Set<string>();
  for (const entry of list) {
    const result = toTitle((entry ?? {}) as Entry);
    if (typeof result === "string") {
      console.warn(`[library] skipped: ${result}`);
    } else if (seen.has(result.id)) {
      console.warn(`[library] skipped: ${result.id.slice(ID_PREFIX.length)} is listed twice`);
    } else {
      seen.add(result.id);
      films.push(result);
    }
  }
  return films;
}
