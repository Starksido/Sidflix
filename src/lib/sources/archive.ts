import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { FilmTitle } from "@/lib/catalog";
import { artFromSeed, clip, fetchJson } from "@/lib/sources/util";

// Feature films from the Internet Archive that carry an explicit public-domain
// license, so they can be streamed in full. No API key needed.

type Doc = {
  identifier: string;
  title?: string;
  year?: number | string;
  runtime?: string;
  description?: string | string[];
  downloads?: number;
};

/** "1:17:26", "20:33" (mm:ss) or "108 min" → whole minutes. */
function parseRuntime(runtime: string | undefined): number | null {
  if (!runtime) return null;
  const parts = runtime.split(":").map(Number);
  if (parts.length > 1 && parts.every(Number.isFinite)) {
    const [h, m] = parts.length === 3 ? parts : [0, parts[0]];
    return Math.round(h * 60 + m) || null;
  }
  const minutes = parseInt(runtime, 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

function plainText(description: Doc["description"]): string {
  const raw = Array.isArray(description) ? description.join(" ") : (description ?? "");
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function toTitle(doc: Doc): FilmTitle | null {
  const minutes = parseRuntime(doc.runtime);
  const year = Number(doc.year);
  const synopsis = clip(plainText(doc.description), 220);
  if (!doc.title || !minutes || !year || !synopsis) return null;
  return {
    id: `ia-${doc.identifier}`,
    kind: "film",
    title: clip(doc.title, 60),
    niche: "indie",
    // The Archive has no ratings; unrated titles stay off kids profiles.
    maturity: "16+",
    year,
    minutes,
    synopsis,
    art: {
      ...artFromSeed(doc.identifier),
      image: { poster: `https://archive.org/services/img/${doc.identifier}` },
    },
    source: {
      label: "Internet Archive, public domain",
      href: `https://archive.org/details/${doc.identifier}`,
    },
  };
}

/** Public-domain feature films, most downloaded first, narrowed by an optional extra clause. */
async function queryFilms(limit: number, extraClause?: string): Promise<FilmTitle[]> {
  const url = new URL("https://archive.org/advancedsearch.php");
  url.searchParams.set(
    "q",
    [
      "collection:feature_films AND mediatype:movies AND licenseurl:*publicdomain* AND year:[1900 TO 2030]",
      extraClause,
    ]
      .filter(Boolean)
      .join(" AND "),
  );
  for (const field of ["identifier", "title", "year", "runtime", "description", "downloads"]) {
    url.searchParams.append("fl[]", field);
  }
  url.searchParams.set("sort[]", "downloads desc");
  url.searchParams.set("rows", String(limit * 3));
  url.searchParams.set("output", "json");

  const data = await fetchJson<{ response: { docs: Doc[] } }>(url.toString());
  return data.response.docs
    .map(toTitle)
    .filter((t) => t !== null)
    .slice(0, limit);
}

/** Most-watched public-domain feature films on the Internet Archive. */
export async function getFilmsFromArchive(limit = 12): Promise<FilmTitle[]> {
  "use cache";
  cacheLife("days");
  cacheTag("source:archive");
  return queryFilms(limit);
}

/** Public-domain feature films whose title contains every word of the query. */
export async function searchArchiveFilms(query: string, limit = 8): Promise<FilmTitle[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("source:archive");

  // Plain lowercase words only, so the query can't change the search syntax around
  // it: lowercase AND/OR/NOT are terms, and a leading "-" would negate.
  const words = query
    .toLowerCase()
    .split(" ")
    .map((w) => w.replace(/[^\p{L}\p{N}'-]/gu, "").replace(/^-+/, ""))
    .filter(Boolean);
  if (words.length === 0) return [];
  return queryFilms(limit, `title:(${words.join(" AND ")})`);
}
