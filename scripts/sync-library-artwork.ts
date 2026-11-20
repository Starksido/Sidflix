import { loadEnvConfig } from "@next/env";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { groupLibrary } from "../src/lib/library-groups";
import { getLocalMedia } from "../src/lib/local-media";
import { artworkQuery, chooseArtwork, type ArtworkCandidate } from "../src/lib/artwork-match";
import type { LibraryArtwork } from "../src/lib/library-artwork";

async function main() {
  loadEnvConfig(process.cwd());
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("Configure TMDB_API_KEY before syncing artwork");
  const directory = path.join(process.cwd(), "public", "media-artwork");
  const manifestPath = path.join(process.cwd(), "data", "library-artwork.json");
  await mkdir(directory, { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });
  let artwork: Record<string, LibraryArtwork> = {};
  try { artwork = JSON.parse(await readFile(manifestPath, "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const files = await getLocalMedia();
  const titles = groupLibrary(files.map((file) => file.title));
  const missing: string[] = [];
  async function download(image: string, name: string, size: string): Promise<string> {
    if (!/^\/[a-zA-Z0-9]+\.(jpg|png)$/.test(image)) throw new Error("Unexpected artwork path");
    const response = await fetch(`https://image.tmdb.org/t/p/${size}${image}`, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("Artwork download failed");
    const data = new Uint8Array(await response.arrayBuffer());
    if (data.length > 8 * 1024 * 1024) throw new Error("Artwork exceeds size limit");
    const filename = `${name}${path.extname(image)}`;
    await writeFile(path.join(directory, filename), data);
    return `/media-artwork/${filename}`;
  }
  for (const title of titles) {
    if (artwork[title.id]) { console.log(`Cached: ${title.title}`); continue; }
    const type = title.kind === "series" ? "tv" : "movie";
    const query = artworkQuery(title.title);
    const url = new URL(`https://api.themoviedb.org/3/search/${type}`);
    url.searchParams.set("query", query.query);
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("language", "en-US");
    if (!key.startsWith("eyJ")) url.searchParams.set("api_key", key);
    const response = await fetch(url, {
      headers: key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`TMDB lookup returned ${response.status}`);
    const data = await response.json() as { results: ArtworkCandidate[] };
    const match = chooseArtwork(data.results, title.title, title.year);
    if (!match?.poster_path) {
      missing.push(title.title);
      console.log(`Needs matching: ${title.title}; candidates: ${data.results.slice(0, 4).map((item) => `${item.title ?? item.name} (${item.release_date ?? item.first_air_date})`).join(", ")}`);
      continue;
    }
    artwork[title.id] = {
      poster: await download(match.poster_path, `${title.id}-poster`, "w500"),
      ...(match.backdrop_path ? { backdrop: await download(match.backdrop_path, `${title.id}-backdrop`, "w1280") } : {}),
      tmdbId: match.id, mediaType: type, matchedTitle: match.title ?? match.name ?? title.title,
      year: Number((match.release_date ?? match.first_air_date)?.slice(0, 4)) || null,
      source: `https://www.themoviedb.org/${type}/${match.id}`,
    };
    await writeFile(manifestPath, JSON.stringify(artwork, null, 2));
    console.log(`Matched: ${title.title} → ${artwork[title.id].matchedTitle}`);
  }
  console.log(JSON.stringify({ files: files.length, titles: titles.length, movies: titles.filter((title) => title.kind === "film").length,
    shows: titles.filter((title) => title.kind === "series").length, withPosters: titles.filter((title) => artwork[title.id]).length, missing }));
}

main().catch(() => { console.error("Artwork sync failed. Check TMDB access, network connectivity, and folder permissions."); process.exitCode = 1; });
